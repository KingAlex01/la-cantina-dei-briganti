-- Allinea le prenotazioni agli orari comunicati dal ristorante.

drop trigger if exists reservations_prevent_monday_lunch on public.reservations;
drop function if exists private.prevent_monday_lunch();

create function private.prevent_closed_services()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if extract(isodow from new.date) = 4
    or (extract(isodow from new.date) = 7 and new.service = 'cena') then
    raise exception 'Il ristorante è chiuso per questo servizio';
  end if;
  return new;
end;
$$;

create trigger reservations_prevent_closed_services
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
begin
  if p_date is null or p_date < v_today or p_date > v_today + 60
    or p_party_size not between 1 and 8 then
    raise exception 'Data o numero di persone non validi';
  end if;

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
    'pranzo', v_lunch and extract(isodow from p_date) <> 4
      and (p_date > v_today or v_now::time < time '14:00'),
    'cena', v_dinner and extract(isodow from p_date) not in (4, 7)
      and (p_date > v_today or v_now::time < time '22:00')
  );
end;
$$;

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
    or (p_service = 'cena' and p_arrival_time not in ('19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'))
    or extract(isodow from p_date) = 4
    or (p_service = 'cena' and extract(isodow from p_date) = 7) then
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
    or (p_service = 'cena' and p_arrival_time not in ('19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'))
    or extract(isodow from p_date) = 4
    or (p_service = 'cena' and extract(isodow from p_date) = 7) then
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



