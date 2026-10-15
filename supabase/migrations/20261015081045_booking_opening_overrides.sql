-- Eccezioni di apertura per una singola data e servizio.
-- Le righe esistenti restano blocchi; blocked=false indica un'apertura esplicita.
begin;
alter table public.booking_blocks add column blocked boolean not null default true;
comment on column public.booking_blocks.blocked is 'true: sospensione; false: apertura straordinaria. Nessuna riga: calendario normale.';

create function public.set_booking_override(p_date date, p_services text[], p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service text;
begin
  if auth.uid() is null or not private.is_staff() then
    raise exception 'Accesso riservato allo staff' using errcode = '42501';
  end if;
  if p_date is null or not pg_catalog.isfinite(p_date)
    or p_date < (now() at time zone 'Europe/Rome')::date then
    raise exception 'Scegli una data da oggi in avanti';
  end if;
  if p_action is null or p_action not in ('open', 'block', 'reset') or p_services is null
    or pg_catalog.array_ndims(p_services) is distinct from 1
    or pg_catalog.cardinality(p_services) not between 1 and 2
    or exists (
      select 1 from pg_catalog.unnest(p_services) as s(service)
      where s.service is null or s.service not in ('pranzo', 'cena')
    ) then
    raise exception 'Scegli pranzo, cena o entrambi i servizi';
  end if;

  -- Blocchiamo sempre entrambi i servizi: la risposta rappresenta uno stato
  -- coerente dell'intera data anche se due colleghi operano su servizi diversi.
  -- Le RPC di prenotazione usano la stessa chiave e bloccano un solo servizio.
  for v_service in select s.service from (values ('cena'), ('pranzo')) as s(service)
    order by s.service
  loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_date::text || ':' || v_service));
  end loop;

  if p_action = 'reset' then
    delete from public.booking_blocks b where b.date = p_date and b.service = any(p_services);
  else
    insert into public.booking_blocks (date, service, blocked, created_by)
    select p_date, s.service, p_action = 'block', auth.uid()
    from (select distinct service from pg_catalog.unnest(p_services) as services(service)) s
    on conflict (date, service) do update
      set blocked = excluded.blocked, created_by = excluded.created_by, created_at = now()
      where booking_blocks.blocked is distinct from excluded.blocked;
  end if;

  return pg_catalog.jsonb_build_object(
    'date', p_date,
    'blocked', pg_catalog.jsonb_build_object(
      'pranzo', exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'pranzo' and b.blocked),
      'cena', exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'cena' and b.blocked)
    ),
    'opened', pg_catalog.jsonb_build_object(
      'pranzo', exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'pranzo' and not b.blocked),
      'cena', exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'cena' and not b.blocked)
    )
  );
end;
$$;

revoke all on function public.set_booking_override(date, text[], text) from public, anon, authenticated, service_role;
grant execute on function public.set_booking_override(date, text[], text) to authenticated;

-- Compatibilità: la vecchia riattivazione continua a ripristinare il calendario.
create or replace function public.set_booking_block(p_date date, p_services text[], p_blocked boolean)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_blocked is null then raise exception 'Scegli se bloccare o riattivare'; end if;
  return public.set_booking_override(p_date, p_services, case when p_blocked then 'block' else 'reset' end) - 'opened';
end;
$$;

create or replace function private.prevent_blocked_online_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source = 'online' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.date::text || ':' || new.service));
    if exists (
      select 1 from public.booking_blocks b where b.date = new.date and b.service = new.service and b.blocked
    ) then
      raise exception 'Prenotazioni online sospese per questo servizio';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_blocked_online_booking() from public, anon, authenticated, service_role;

-- L'apertura puntuale vale anche per gli inserimenti manuali dello staff.
-- Le modifiche a una prenotazione già presente restano possibili dopo la chiusura.
create or replace function private.prevent_closed_services()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.date = new.date and old.service = new.service then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.date::text || ':' || new.service));
  if (extract(isodow from new.date) = 4 or (extract(isodow from new.date) = 7 and new.service = 'cena'))
    and not exists (select 1 from public.booking_blocks b
      where b.date = new.date and b.service = new.service and not b.blocked) then
    raise exception 'Il ristorante è chiuso per questo servizio';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_closed_services() from public, anon, authenticated, service_role;

-- Il lock del servizio deve precedere il lock globale del codice anche sugli
-- INSERT diretti dello staff, come già avviene per le richieste online.
drop trigger reservations_prevent_closed_services on public.reservations;
create trigger reservations_check_calendar
before insert or update of date, service on public.reservations
for each row execute function private.prevent_closed_services();

create or replace function public.public_available_services(p_date date, p_party_size smallint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamp := now() at time zone 'Europe/Rome';
  v_today date := v_now::date;
  v_lunch boolean;
  v_dinner boolean;
  v_lunch_blocked boolean;
  v_dinner_blocked boolean;
  v_lunch_opened boolean;
  v_dinner_opened boolean;
begin
  if p_date is null or not pg_catalog.isfinite(p_date) or p_date < v_today or p_date > v_today + 60
    or p_party_size is null or p_party_size not between 1 and 8 then
    raise exception 'Data o numero di persone non validi';
  end if;

  select exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'pranzo' and b.blocked),
    exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'cena' and b.blocked)
  into v_lunch_blocked, v_dinner_blocked;
  select exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'pranzo' and not b.blocked),
    exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'cena' and not b.blocked)
  into v_lunch_opened, v_dinner_opened;

  select exists (
    select 1 from public.tables t
    where t.archived_at is null and t.capacity >= p_party_size
      and not exists (
        select 1 from public.reservations r
        where r.table_id = t.id and r.date = p_date and r.service = 'pranzo'
          and r.status in ('in_attesa', 'confermata', 'arrivato')
      )
  ) into v_lunch;

  select exists (
    select 1 from public.tables t
    where t.archived_at is null and t.capacity >= p_party_size
      and not exists (
        select 1 from public.reservations r
        where r.table_id = t.id and r.date = p_date and r.service = 'cena'
          and r.status in ('in_attesa', 'confermata', 'arrivato')
      )
  ) into v_dinner;

  return pg_catalog.jsonb_build_object(
    'pranzo', not v_lunch_blocked and v_lunch and (v_lunch_opened or extract(isodow from p_date) <> 4)
      and (p_date > v_today or v_now::time < time '14:00'),
    'cena', not v_dinner_blocked and v_dinner and (v_dinner_opened or extract(isodow from p_date) not in (4, 7))
      and (p_date > v_today or v_now::time < time '22:00'),
    'blocked', pg_catalog.jsonb_build_object('pranzo', v_lunch_blocked, 'cena', v_dinner_blocked),
    'opened', pg_catalog.jsonb_build_object('pranzo', v_lunch_opened, 'cena', v_dinner_opened)
  );
end;
$$;

-- Il trigger comune verifica calendario ed eccezioni sotto lock.
create or replace function public.create_public_reservation_with_notes_consent(
  p_date date,
  p_service text,
  p_arrival_time time,
  p_party_size smallint,
  p_name text,
  p_phone text,
  p_email text default null,
  p_notes text default '',
  p_reminder_opt_in boolean default false,
  p_notes_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/Rome')::date;
  v_phone_key text;
  v_customer_id uuid;
  v_table_id uuid;
  v_table_name text;
  v_result public.reservations;
begin
  if p_date is null or p_date < v_today or p_date > v_today + 60
    or p_party_size not between 1 and 8 then
    raise exception 'Data o numero di persone non validi';
  end if;
  if p_service not in ('pranzo', 'cena') or p_arrival_time is null
    or (p_service = 'pranzo' and p_arrival_time not in ('12:30', '13:00', '13:30', '14:00'))
    or (p_service = 'cena' and p_arrival_time not in ('19:30', '20:00', '20:30', '21:00', '21:30', '22:00')) then
    raise exception 'Servizio o orario non disponibile';
  end if;
  if p_name is null or pg_catalog.length(btrim(p_name)) > 120
    or btrim(p_name) !~ '^\S+[[:space:]]+\S+' then
    raise exception 'Inserisci nome e cognome';
  end if;
  if p_phone is null or pg_catalog.length(btrim(p_phone)) > 30 then
    raise exception 'Numero di cellulare non valido';
  end if;
  if p_email is not null and (pg_catalog.length(btrim(p_email)) > 254
    or (btrim(p_email) <> '' and btrim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) then
    raise exception 'Indirizzo email non valido';
  end if;
  if btrim(coalesce(p_notes, '')) <> '' and p_notes_consent is distinct from true then
    raise exception 'Consenso per le note non prestato';
  end if;
  if pg_catalog.length(coalesce(p_notes, '')) > 1000 then
    raise exception 'Le note sono troppo lunghe';
  end if;

  v_phone_key := pg_catalog.regexp_replace(p_phone, '[^0-9]', '', 'g');
  if pg_catalog.length(v_phone_key) >= 12 and pg_catalog.left(v_phone_key, 4) = '0039' then
    v_phone_key := pg_catalog.substr(v_phone_key, 5);
  elsif pg_catalog.length(v_phone_key) >= 12 and pg_catalog.left(v_phone_key, 2) = '39' then
    v_phone_key := pg_catalog.substr(v_phone_key, 3);
  end if;
  if v_phone_key !~ '^[0-9]{6,15}$' then
    raise exception 'Numero di cellulare non valido';
  end if;

  -- La ricerca e l'inserimento sono una sola transazione. Anche lo staff usa
  -- questo lock; l'indice univoco resta la protezione finale.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_date::text || ':' || p_service));
  select t.id, t.name into v_table_id, v_table_name
  from public.tables t
  where t.archived_at is null and t.capacity >= p_party_size
    and not exists (
      select 1 from public.reservations r
      where r.table_id = t.id and r.date = p_date and r.service = p_service
        and r.status in ('in_attesa', 'confermata', 'arrivato')
    )
  order by t.capacity, t.name
  limit 1;
  if v_table_id is null then
    raise exception 'Nessun tavolo disponibile per questo servizio';
  end if;

  insert into public.customers (phone_key, name, phone, email)
  values (v_phone_key, btrim(p_name), btrim(p_phone), nullif(btrim(coalesce(p_email, '')), ''))
  on conflict (phone_key) do update
    set email = coalesce(public.customers.email, excluded.email)
  returning id into v_customer_id;

  insert into public.reservations (
    date, service, arrival_time, party_size, name, phone, email, notes,
    reminder_opt_in, table_id, customer_id, status, source, notes_consent_at
  ) values (
    p_date, p_service, p_arrival_time, p_party_size, btrim(p_name), btrim(p_phone),
    nullif(btrim(coalesce(p_email, '')), ''), btrim(coalesce(p_notes, '')),
    coalesce(p_reminder_opt_in, false), v_table_id, v_customer_id, 'in_attesa', 'online',
    case when btrim(coalesce(p_notes, '')) <> '' then now() end
  ) returning * into v_result;

  return pg_catalog.jsonb_build_object(
    'date', v_result.date, 'service', v_result.service,
    'arrival_time', v_result.arrival_time, 'party_size', v_result.party_size,
    'name', v_result.name, 'table_name', v_table_name, 'code', v_result.code
  );
end;
$$;

create or replace function public.create_public_reservation(
  p_date date,
  p_service text,
  p_arrival_time time,
  p_party_size smallint,
  p_name text,
  p_phone text,
  p_email text default null,
  p_notes text default '',
  p_reminder_opt_in boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/Rome')::date;
  v_phone_key text;
  v_customer_id uuid;
  v_table_id uuid;
  v_table_name text;
  v_result public.reservations;
begin
  if p_date is null or p_date < v_today or p_date > v_today + 60
    or p_party_size not between 1 and 8 then
    raise exception 'Data o numero di persone non validi';
  end if;
  if p_service not in ('pranzo', 'cena') or p_arrival_time is null
    or (p_service = 'pranzo' and p_arrival_time not in ('12:30', '13:00', '13:30', '14:00'))
    or (p_service = 'cena' and p_arrival_time not in ('19:30', '20:00', '20:30', '21:00', '21:30', '22:00')) then
    raise exception 'Servizio o orario non disponibile';
  end if;
  if p_name is null or pg_catalog.length(btrim(p_name)) > 120
    or btrim(p_name) !~ '^\S+[[:space:]]+\S+' then
    raise exception 'Inserisci nome e cognome';
  end if;
  if p_phone is null or pg_catalog.length(btrim(p_phone)) > 30 then
    raise exception 'Numero di cellulare non valido';
  end if;
  if p_email is not null and (pg_catalog.length(btrim(p_email)) > 254
    or (btrim(p_email) <> '' and btrim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) then
    raise exception 'Indirizzo email non valido';
  end if;
  if pg_catalog.length(coalesce(p_notes, '')) > 1000 then
    raise exception 'Le note sono troppo lunghe';
  end if;

  v_phone_key := pg_catalog.regexp_replace(p_phone, '[^0-9]', '', 'g');
  if pg_catalog.length(v_phone_key) >= 12 and pg_catalog.left(v_phone_key, 4) = '0039' then
    v_phone_key := pg_catalog.substr(v_phone_key, 5);
  elsif pg_catalog.length(v_phone_key) >= 12 and pg_catalog.left(v_phone_key, 2) = '39' then
    v_phone_key := pg_catalog.substr(v_phone_key, 3);
  end if;
  if v_phone_key !~ '^[0-9]{6,15}$' then
    raise exception 'Numero di cellulare non valido';
  end if;

  -- La ricerca e l'inserimento sono una sola transazione. Anche lo staff usa
  -- questo lock; l'indice univoco resta la protezione finale.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_date::text || ':' || p_service));
  select t.id, t.name into v_table_id, v_table_name
  from public.tables t
  where t.archived_at is null and t.capacity >= p_party_size
    and not exists (
      select 1 from public.reservations r
      where r.table_id = t.id and r.date = p_date and r.service = p_service
        and r.status in ('in_attesa', 'confermata', 'arrivato')
    )
  order by t.capacity, t.name
  limit 1;
  if v_table_id is null then
    raise exception 'Nessun tavolo disponibile per questo servizio';
  end if;

  insert into public.customers (phone_key, name, phone, email)
  values (v_phone_key, btrim(p_name), btrim(p_phone), nullif(btrim(coalesce(p_email, '')), ''))
  on conflict (phone_key) do update
    set email = coalesce(public.customers.email, excluded.email)
  returning id into v_customer_id;

  insert into public.reservations (
    date, service, arrival_time, party_size, name, phone, email, notes,
    reminder_opt_in, table_id, customer_id, status, source
  ) values (
    p_date, p_service, p_arrival_time, p_party_size, btrim(p_name), btrim(p_phone),
    nullif(btrim(coalesce(p_email, '')), ''), btrim(coalesce(p_notes, '')),
    coalesce(p_reminder_opt_in, false), v_table_id, v_customer_id, 'in_attesa', 'online'
  ) returning * into v_result;

  return pg_catalog.jsonb_build_object(
    'date', v_result.date, 'service', v_result.service,
    'arrival_time', v_result.arrival_time, 'party_size', v_result.party_size,
    'name', v_result.name, 'table_name', v_table_name, 'code', v_result.code
  );
end;
$$;

commit;
