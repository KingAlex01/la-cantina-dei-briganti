-- Solo su PostgreSQL locale con tutte le migrazioni applicate, come postgres.
-- Tutti i dati di prova vengono annullati. Nessun invio email.
begin;
do $$
declare
  v_staff uuid := gen_random_uuid();
  v_nonstaff uuid := gen_random_uuid();
  v_thursday date;
  v_sunday date;
  v_state jsonb;
  v_result jsonb;
  v_manual public.reservations;
  v_rejected boolean;
  v_before jsonb;
begin
  select (now() at time zone 'Europe/Rome')::date + n into v_thursday
  from generate_series(1, 7) n
  where extract(isodow from (now() at time zone 'Europe/Rome')::date + n) = 4;
  v_sunday := v_thursday + 3;
  insert into auth.users (id) values (v_staff), (v_nonstaff);
  insert into public.staff_users (user_id) values (v_staff);
  delete from public.booking_blocks where date in (v_thursday, v_sunday);

  if has_function_privilege('anon', 'public.set_booking_override(date,text[],text)', 'EXECUTE')
    or has_function_privilege('service_role', 'public.set_booking_override(date,text[],text)', 'EXECUTE') then
    raise exception 'Aperture modificabili da ruoli non autorizzati';
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_state := public.set_booking_override(v_thursday, array['pranzo'], 'open');
  if v_state->'opened' <> '{"pranzo":true,"cena":false}'::jsonb
    or v_state->'blocked' <> '{"pranzo":false,"cena":false}'::jsonb then
    raise exception 'Apertura del pranzo errata: %', v_state;
  end if;
  select to_jsonb(b) into v_before from public.booking_blocks b where date = v_thursday and service = 'pranzo';
  perform public.set_booking_override(v_thursday, array['pranzo'], 'open');
  if v_before <> (select to_jsonb(b) from public.booking_blocks b where date = v_thursday and service = 'pranzo') then
    raise exception 'Apertura ripetuta non idempotente';
  end if;
  v_manual := public.create_staff_reservation(v_thursday, 'pranzo', time '13:00', 1::smallint, 'Test Manuale Straordinario');
  execute 'reset role';

  v_state := public.public_available_services(v_thursday, 1::smallint);
  if not (v_state->>'pranzo')::boolean or (v_state->>'cena')::boolean then
    raise exception 'Il giovedì deve aprire soltanto a pranzo: %', v_state;
  end if;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_result := public.create_public_reservation_with_notes_consent(
    v_thursday, 'pranzo', time '12:30', 1::smallint, 'Test Pranzo Straordinario', '399876543210'
  );
  perform public.create_public_reservation(
    v_thursday, 'pranzo', time '13:30', 1::smallint, 'Test Vecchia Rpc', '399876543211'
  );
  v_rejected := false;
  begin
    perform public.create_public_reservation_with_notes_consent(
      v_thursday, 'cena', time '19:30', 1::smallint, 'Test Cena Chiusa', '399876543212'
    );
  exception when raise_exception then v_rejected := sqlerrm = 'Il ristorante è chiuso per questo servizio'; end;
  if not v_rejected then raise exception 'Cena di giovedì aperta senza eccezione'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  v_state := public.set_booking_override(v_thursday, array['pranzo', 'cena'], 'open');
  if v_state->'opened' <> '{"pranzo":true,"cena":true}'::jsonb then raise exception 'Apertura giornata errata'; end if;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform public.create_public_reservation_with_notes_consent(
    v_thursday, 'cena', time '19:30', 1::smallint, 'Test Cena Straordinaria', '399876543213'
  );

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  v_state := public.set_booking_override(v_thursday, array['pranzo'], 'block');
  if v_state->'blocked' <> '{"pranzo":true,"cena":false}'::jsonb
    or v_state->'opened' <> '{"pranzo":false,"cena":true}'::jsonb then
    raise exception 'Blocco dopo apertura straordinaria errato';
  end if;
  v_state := public.public_available_services(v_thursday, 1::smallint);
  if (v_state->>'pranzo')::boolean or not (v_state->>'cena')::boolean then
    raise exception 'Il blocco del pranzo interferisce con la cena';
  end if;
  v_state := public.set_booking_override(v_thursday, array['pranzo', 'cena'], 'reset');
  if exists (select 1 from public.booking_blocks where date = v_thursday) then raise exception 'Ripristino incompleto'; end if;
  v_state := public.public_available_services(v_thursday, 1::smallint);
  if (v_state->>'pranzo')::boolean or (v_state->>'cena')::boolean then raise exception 'Calendario non ripristinato'; end if;

  -- Le prenotazioni ricevute durante l'apertura restano modificabili dopo il ripristino.
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  update public.reservations set date = date, service = service, status = 'confermata', approved_at = now()
  where code = v_result->>'code';
  if not found then raise exception 'Richiesta preesistente perduta'; end if;
  update public.reservations set notes = 'Gestibile dopo il ripristino' where id = v_manual.id;
  if not found then raise exception 'Prenotazione manuale perduta'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  perform public.set_booking_override(v_sunday, array['cena'], 'open');
  v_state := public.public_available_services(v_sunday, 1::smallint);
  if not (v_state->>'pranzo')::boolean or not (v_state->>'cena')::boolean then raise exception 'Domenica sera non aperta'; end if;
  perform public.set_booking_override(v_sunday, array['cena'], 'reset');
  v_state := public.public_available_services(v_sunday, 1::smallint);
  if not (v_state->>'pranzo')::boolean or (v_state->>'cena')::boolean then raise exception 'Ripristino domenica errato'; end if;

  v_rejected := false;
  begin perform public.set_booking_override(v_thursday, array['pranzo'], 'invalid');
  exception when raise_exception then v_rejected := true; end;
  if not v_rejected then raise exception 'Azione non valida accettata'; end if;
  v_rejected := false;
  begin perform public.set_booking_override(v_thursday, array['pranzo'], null);
  exception when raise_exception then v_rejected := true; end;
  if not v_rejected then raise exception 'Azione null accettata'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_nonstaff, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_rejected := false;
  begin perform public.set_booking_override(v_thursday, array['pranzo'], 'open');
  exception when insufficient_privilege then v_rejected := true; end;
  if not v_rejected then raise exception 'Non staff può aprire servizi'; end if;
  execute 'reset role';
  raise notice 'Verifiche aperture straordinarie superate';
end;
$$;
rollback;
