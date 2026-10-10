-- Verifica SOLO su PostgreSQL/Supabase locale, dopo tutte le migrazioni.
-- Eseguire come postgres; identità, clienti, tavoli e prenotazioni sono
-- generati per il test e annullati dal ROLLBACK finale. Nessun invio email.
-- Con psql usare -v ON_ERROR_STOP=1: un errore deve interrompere la verifica.
begin;

do $$
declare
  v_staff uuid := gen_random_uuid();
  v_nonstaff uuid := gen_random_uuid();
  v_table uuid := gen_random_uuid();
  v_manual_table uuid := gen_random_uuid();
  v_date date;
  v_thursday date;
  v_sunday date;
  v_state jsonb;
  v_before jsonb;
  v_code text;
  v_phone text := '39' || (floor(random() * 9000000000) + 1000000000)::bigint::text;
  v_existing uuid;
  v_manual public.reservations;
  v_count bigint;
  v_rejected boolean;
  v_payload text[];
begin
  select (now() at time zone 'Europe/Rome')::date + n into v_date
  from generate_series(1, 7) n
  where extract(isodow from (now() at time zone 'Europe/Rome')::date + n) = 1;
  select (now() at time zone 'Europe/Rome')::date + n into v_thursday
  from generate_series(1, 7) n
  where extract(isodow from (now() at time zone 'Europe/Rome')::date + n) = 4;
  select (now() at time zone 'Europe/Rome')::date + n into v_sunday
  from generate_series(1, 7) n
  where extract(isodow from (now() at time zone 'Europe/Rome')::date + n) = 7;

  insert into auth.users (id) values (v_staff), (v_nonstaff);
  insert into public.staff_users (user_id) values (v_staff);
  insert into public.tables (id, name, capacity, shape, pos_x, pos_y)
  values (v_table, 'Test blocco ' || v_table, 8, 'square', 10, 10),
    (v_manual_table, 'Test manuale ' || v_manual_table, 20, 'rect', 20, 20);
  delete from public.booking_blocks where date in (v_date, v_thursday, v_sunday);

  if has_table_privilege('anon', 'public.booking_blocks', 'SELECT')
    or has_table_privilege('authenticated', 'public.booking_blocks', 'INSERT')
    or has_table_privilege('authenticated', 'public.booking_blocks', 'UPDATE')
    or has_table_privilege('authenticated', 'public.booking_blocks', 'DELETE')
    or has_function_privilege('anon', 'public.set_booking_block(date,text[],boolean)', 'EXECUTE')
    or has_function_privilege('service_role', 'public.set_booking_block(date,text[],boolean)', 'EXECUTE') then
    raise exception 'Permessi troppo ampi sui blocchi';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'booking_blocks'
  ) then
    raise exception 'Tabella blocchi assente dalla pubblicazione Realtime';
  end if;

  -- Richiesta già presente: il successivo blocco non deve cancellarla.
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_state := public.create_public_reservation_with_notes_consent(
    v_date, 'pranzo', time '12:30', 8::smallint, 'Test Già Presente', v_phone
  );
  v_code := v_state->>'code';
  select id into v_existing from public.reservations where code = v_code;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_state := public.set_booking_block(v_date, array['pranzo'], true);
  if v_state <> jsonb_build_object('date', v_date, 'blocked', jsonb_build_object('pranzo', true, 'cena', false)) then
    raise exception 'Risposta errata al blocco del pranzo: %', v_state;
  end if;
  if (select created_by from public.booking_blocks where date = v_date and service = 'pranzo') <> v_staff then
    raise exception 'Il blocco non registra il membro dello staff';
  end if;
  select to_jsonb(b) into v_before from public.booking_blocks b where date = v_date and service = 'pranzo';
  perform public.set_booking_block(v_date, array['pranzo', 'pranzo'], true);
  if v_before <> (select to_jsonb(b) from public.booking_blocks b where date = v_date and service = 'pranzo') then
    raise exception 'Ripetere il blocco modifica il record esistente';
  end if;

  -- Anche con prenotazioni online sospese, lo staff può inserire al telefono.
  v_manual := public.create_staff_reservation(
    v_date, 'pranzo', time '13:00', 2::smallint, 'Test Manuale',
    p_table_id => v_manual_table
  );
  if v_manual.source <> 'staff' or v_manual.status <> 'confermata' then
    raise exception 'Prenotazione manuale non preservata';
  end if;
  execute 'reset role';

  -- Lo stesso blocco copre la nuova RPC, la precedente e gli INSERT diretti.
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  select count(*) into v_count from public.customers;
  v_rejected := false;
  begin
    perform public.create_public_reservation_with_notes_consent(
      v_date, 'pranzo', time '12:30', 1::smallint, 'Test Bloccato', '399876543210'
    );
  exception when raise_exception then
    v_rejected := sqlerrm = 'Prenotazioni online sospese per questo servizio';
  end;
  if not v_rejected or (select count(*) from public.customers) <> v_count then
    raise exception 'Nuova RPC non protetta oppure cliente creato dal rifiuto';
  end if;
  v_rejected := false;
  begin
    perform public.create_public_reservation(
      v_date, 'pranzo', time '12:30', 1::smallint, 'Test Vecchia RPC', '399876543211'
    );
  exception when raise_exception then
    v_rejected := sqlerrm = 'Prenotazioni online sospese per questo servizio';
  end;
  if not v_rejected then raise exception 'Vecchia RPC non protetta'; end if;

  v_rejected := false;
  begin
    insert into public.reservations (date, service, arrival_time, party_size, name, phone, table_id, status, source)
    values (v_date, 'pranzo', time '12:30', 2, 'Test Diretto', '399876543212', v_table, 'in_attesa', 'online');
  exception when raise_exception then
    v_rejected := sqlerrm = 'Prenotazioni online sospese per questo servizio';
  end;
  if not v_rejected then raise exception 'INSERT diretto online non protetto'; end if;

  update public.reservations set status = 'confermata', approved_at = now(), notes = 'Accettata durante il blocco'
  where id = v_existing;
  if not exists (select 1 from public.reservations where id = v_existing and status = 'confermata' and approved_at is not null) then
    raise exception 'Blocco interferisce con approvazione di richieste esistenti';
  end if;
  v_state := public.public_available_services(v_date, 1::smallint);
  if v_state->'blocked' <> '{"pranzo":true,"cena":false}'::jsonb
    or (v_state->>'pranzo')::boolean or not (v_state->>'cena')::boolean then
    raise exception 'Disponibilità del singolo servizio errata: %', v_state;
  end if;
  -- Cena e altre date continuano a prenotarsi normalmente.
  perform public.create_public_reservation_with_notes_consent(
    v_date, 'cena', time '19:30', 1::smallint, 'Test Cena', v_phone
  );
  perform public.create_public_reservation_with_notes_consent(
    v_date + 1, 'pranzo', time '12:30', 1::smallint, 'Test Altra Data', v_phone
  );

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_state := public.set_booking_block(v_date, array['pranzo', 'cena'], true);
  if v_state->'blocked' <> '{"pranzo":true,"cena":true}'::jsonb then
    raise exception 'Blocco di entrambi i servizi errato';
  end if;
  v_state := public.set_booking_block(v_date, array['pranzo'], false);
  if v_state->'blocked' <> '{"pranzo":false,"cena":true}'::jsonb then
    raise exception 'Riapertura del singolo servizio errata';
  end if;
  v_state := public.set_booking_block(v_date, array['cena', 'pranzo'], false);
  perform public.set_booking_block(v_date, array['cena', 'pranzo'], false);
  if v_state->'blocked' <> '{"pranzo":false,"cena":false}'::jsonb
    or exists (select 1 from public.booking_blocks where date = v_date) then
    raise exception 'Riapertura di entrambi i servizi non idempotente';
  end if;

  foreach v_payload slice 1 in array array[
    array[null, null]::text[], array['colazione', 'pranzo'], array['pranzo', null]
  ] loop
    v_rejected := false;
    begin
      perform public.set_booking_block(v_date, v_payload, true);
    exception when raise_exception then v_rejected := true;
    end;
    if not v_rejected then raise exception 'Servizi non validi accettati: %', v_payload; end if;
  end loop;
  v_rejected := false;
  begin perform public.set_booking_block(v_date, array[]::text[], true);
  exception when raise_exception then v_rejected := true; end;
  if not v_rejected then raise exception 'Array vuoto accettato'; end if;
  v_rejected := false;
  begin perform public.set_booking_block(v_date, null, true);
  exception when raise_exception then v_rejected := true; end;
  if not v_rejected then raise exception 'Servizi null accettati'; end if;
  v_rejected := false;
  begin perform public.set_booking_block(v_date, array['pranzo'], null);
  exception when raise_exception then v_rejected := true; end;
  if not v_rejected then raise exception 'Operazione null accettata'; end if;
  v_rejected := false;
  begin perform public.set_booking_block((now() at time zone 'Europe/Rome')::date - 1, array['pranzo'], true);
  exception when raise_exception then v_rejected := true; end;
  if not v_rejected then raise exception 'Data passata accettata'; end if;
  v_rejected := false;
  begin perform public.set_booking_block(null, array['pranzo'], true);
  exception when raise_exception then v_rejected := true; end;
  if not v_rejected then raise exception 'Data null accettata'; end if;
  v_rejected := false;
  begin perform public.set_booking_block(date 'infinity', array['pranzo'], true);
  exception when raise_exception then v_rejected := true; end;
  if not v_rejected then raise exception 'Data infinita accettata'; end if;

  -- Riaprire non scavalca giovedì chiuso e domenica sera chiusa.
  -- La disponibilità è una RPC riservata al server, non al ruolo staff.
  execute 'reset role';
  perform public.set_booking_block(v_thursday, array['pranzo', 'cena'], true);
  perform public.set_booking_block(v_thursday, array['pranzo', 'cena'], false);
  v_state := public.public_available_services(v_thursday, 1::smallint);
  if (v_state->>'pranzo')::boolean or (v_state->>'cena')::boolean then
    raise exception 'La riapertura scavalca la chiusura del giovedì';
  end if;
  perform public.set_booking_block(v_sunday, array['cena'], true);
  perform public.set_booking_block(v_sunday, array['cena'], false);
  v_state := public.public_available_services(v_sunday, 1::smallint);
  if (v_state->>'cena')::boolean then raise exception 'Domenica sera riaperta'; end if;
  v_state := public.public_available_services((now() at time zone 'Europe/Rome')::date, 1::smallint);
  if ((now() at time zone 'Europe/Rome')::time >= time '14:00' and (v_state->>'pranzo')::boolean)
    or ((now() at time zone 'Europe/Rome')::time >= time '22:00' and (v_state->>'cena')::boolean) then
    raise exception 'La disponibilità mostra un servizio già trascorso oggi';
  end if;
  v_rejected := false;
  begin perform public.public_available_services((now() at time zone 'Europe/Rome')::date + 61, 1::smallint);
  exception when raise_exception then v_rejected := true; end;
  if not v_rejected then raise exception 'Disponibilità oltre i 60 giorni accettata'; end if;
  v_rejected := false;
  begin perform public.public_available_services(v_date, null);
  exception when raise_exception then v_rejected := true; end;
  if not v_rejected then raise exception 'Numero di persone null accettato'; end if;

  -- Un membro autentificato ma non staff non vede né modifica i blocchi.
  perform public.set_booking_block(v_date, array['pranzo'], true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_nonstaff, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if exists (select 1 from public.booking_blocks) then raise exception 'RLS espone blocchi a non staff'; end if;
  v_rejected := false;
  begin perform public.set_booking_block(v_date, array['pranzo'], false);
  exception when insufficient_privilege then v_rejected := true; end;
  if not v_rejected then raise exception 'Non staff può riaprire'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  v_rejected := false;
  begin perform 1 from public.booking_blocks;
  exception when insufficient_privilege then v_rejected := true; end;
  if not v_rejected then raise exception 'Anon legge direttamente i blocchi'; end if;
  v_rejected := false;
  begin perform public.set_booking_block(v_date, array['pranzo'], false);
  exception when insufficient_privilege then v_rejected := true; end;
  if not v_rejected then raise exception 'Anon può riaprire'; end if;
  execute 'reset role';

  -- Dopo la riapertura le nuove richieste tornano possibili.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  perform public.set_booking_block(v_date, array['pranzo'], false);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform public.create_public_reservation_with_notes_consent(
    v_date, 'pranzo', time '12:30', 1::smallint, 'Test Riapertura', v_phone
  );
  if not exists (select 1 from public.reservations where id = v_manual.id and source = 'staff') then
    raise exception 'Prenotazione manuale modificata durante la riapertura';
  end if;

  raise notice 'Verifiche blocchi prenotazioni superate; tutti i dati di prova verranno annullati';
end;
$$;

rollback;
