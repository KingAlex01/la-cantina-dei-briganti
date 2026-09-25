-- Le richieste online restano in attesa fino alla decisione dello staff.
begin;

alter table public.reservations drop constraint reservations_status_check;
alter table public.reservations add constraint reservations_status_check
  check (status in ('in_attesa', 'confermata', 'arrivato', 'no-show', 'annullata'));

alter table public.reservations add column approved_at timestamptz;
-- Le prenotazioni online precedenti erano confermate automaticamente.
update public.reservations set approved_at = created_at where source = 'online';

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('richiesta', 'conferma', 'promemoria', 'annullamento'));

drop index public.reservations_one_active_table_per_service;
create unique index reservations_one_active_table_per_service
  on public.reservations (table_id, date, service)
  where status in ('in_attesa', 'confermata', 'arrivato');

-- Le scritture dirette dello staff non possono trasformare una richiesta
-- online non approvata in prenotazione confermata senza passare dall'API.
create function private.require_online_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then
      if new.source = 'online' then
        raise exception 'Le richieste online si creano solo tramite API';
      end if;
    elsif old.source = 'online' and (
      new.source is distinct from old.source
      or new.approved_at is distinct from old.approved_at
      or (old.approved_at is null and new.status in ('confermata', 'arrivato'))
    ) then
      raise exception 'Approva la richiesta online dalla Sala';
    end if;
  end if;
  return new;
end;
$$;

create trigger reservations_require_online_approval
before insert or update of status, source, approved_at on public.reservations
for each row execute function private.require_online_approval();


create or replace function private.prevent_archiving_booked_table()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.archived_at is null and new.archived_at is not null and exists (
    select 1 from public.reservations
    where table_id = old.id
      and status in ('in_attesa', 'confermata', 'arrivato')
      and date >= (now() at time zone 'Europe/Rome')::date
  ) then
    raise exception 'Sposta le prenotazioni future prima di archiviare il tavolo';
  end if;
  return new;
end;
$$;

create or replace function private.prevent_booking_archived_table()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('in_attesa', 'confermata', 'arrivato') and exists (
    select 1 from public.tables
    where id = new.table_id and archived_at is not null
  ) then
    raise exception 'Non puoi assegnare una prenotazione attiva a un tavolo archiviato';
  end if;
  return new;
end;
$$;

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
    'pranzo', v_lunch and extract(isodow from p_date) <> 1
      and (p_date > v_today or v_now::time < time '14:00'),
    'cena', v_dinner and (p_date > v_today or v_now::time < time '22:00')
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
    or (p_service = 'pranzo' and extract(isodow from p_date) = 1) then
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
    or (p_service = 'pranzo' and extract(isodow from p_date) = 1) then
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

create or replace function public.create_staff_reservation(
  p_date date,
  p_service text,
  p_arrival_time time,
  p_party_size smallint,
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_notes text default '',
  p_table_id uuid default null,
  p_reminder_opt_in boolean default false
)
returns public.reservations
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_phone_key text;
  v_customer_id uuid;
  v_table_id uuid;
  v_code text;
  v_result public.reservations;
begin
  if not private.is_staff() then
    raise exception 'Accesso riservato allo staff';
  end if;
  if p_name is null or btrim(p_name) = '' or p_party_size not between 1 and 20 then
    raise exception 'Inserisci nome e numero di persone validi';
  end if;
  if p_service not in ('pranzo', 'cena') or p_date is null or p_arrival_time is null then
    raise exception 'Data, servizio o orario non validi';
  end if;
  if (p_service = 'pranzo' and p_arrival_time not in ('12:30', '13:00', '13:30', '14:00'))
    or (p_service = 'cena' and p_arrival_time not in ('19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00')) then
    raise exception 'L’orario non appartiene al servizio scelto';
  end if;

  -- Una sola assegnazione per volta per data e servizio; il vincolo univoco
  -- sulle prenotazioni resta la protezione finale contro le doppie assegnazioni.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_date::text || ':' || p_service));

  if nullif(btrim(coalesce(p_phone, '')), '') is not null then
    v_phone_key := pg_catalog.regexp_replace(p_phone, '[^0-9]', '', 'g');
    if pg_catalog.length(v_phone_key) >= 12 and pg_catalog.left(v_phone_key, 4) = '0039' then
      v_phone_key := pg_catalog.substr(v_phone_key, 5);
    elsif pg_catalog.length(v_phone_key) >= 12 and pg_catalog.left(v_phone_key, 2) = '39' then
      v_phone_key := pg_catalog.substr(v_phone_key, 3);
    end if;
    if v_phone_key !~ '^[0-9]{6,15}$' then
      raise exception 'Numero di cellulare non valido';
    end if;
    insert into public.customers (phone_key, name, phone, email)
    values (v_phone_key, btrim(p_name), btrim(p_phone), nullif(btrim(coalesce(p_email, '')), ''))
    on conflict (phone_key) do update
      set email = coalesce(public.customers.email, excluded.email)
    returning id into v_customer_id;
  end if;

  if p_table_id is null then
    select t.id into v_table_id
    from public.tables t
    where t.archived_at is null and t.capacity >= p_party_size
      and not exists (
        select 1 from public.reservations r
        where r.table_id = t.id and r.date = p_date and r.service = p_service
          and r.status in ('in_attesa', 'confermata', 'arrivato')
      )
    order by t.capacity, t.name
    limit 1;
  else
    select t.id into v_table_id
    from public.tables t
    where t.id = p_table_id and t.archived_at is null;
    if v_table_id is not null and exists (
      select 1 from public.reservations r
      where r.table_id = v_table_id and r.date = p_date and r.service = p_service
        and r.status in ('in_attesa', 'confermata', 'arrivato')
    ) then
      raise exception 'Il tavolo è già occupato per questo servizio';
    end if;
  end if;
  if v_table_id is null then
    raise exception 'Nessun tavolo disponibile per questo servizio';
  end if;

  v_code := upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.reservations (
    date, service, arrival_time, party_size, name, phone, email, notes,
    reminder_opt_in, table_id, customer_id, status, source, code
  ) values (
    p_date, p_service, p_arrival_time, p_party_size, btrim(p_name),
    nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_email, '')), ''),
    coalesce(p_notes, ''), coalesce(p_reminder_opt_in, false), v_table_id,
    v_customer_id, 'confermata', 'staff', v_code
  ) returning * into v_result;
  return v_result;
end;
$$;

commit;
