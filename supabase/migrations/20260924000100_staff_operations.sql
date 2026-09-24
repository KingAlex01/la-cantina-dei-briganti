-- Fase 2: funzioni transazionali per lo staff e aggiornamenti realtime.

create function public.is_staff_user()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_staff(); $$;

revoke all on function public.is_staff_user() from public, anon;
grant execute on function public.is_staff_user() to authenticated;

create function public.create_staff_reservation(
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
          and r.status in ('confermata', 'arrivato')
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
        and r.status in ('confermata', 'arrivato')
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

revoke all on function public.create_staff_reservation(date, text, time, smallint, text, text, text, text, uuid, boolean) from public, anon;
grant execute on function public.create_staff_reservation(date, text, time, smallint, text, text, text, text, uuid, boolean) to authenticated;

create function public.save_staff_floor(p_tables jsonb, p_known_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_table record;
begin
  if not private.is_staff() then
    raise exception 'Accesso riservato allo staff';
  end if;
  if pg_catalog.jsonb_typeof(p_tables) <> 'array' then
    raise exception 'Elenco tavoli non valido';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('staff_floor_edit'));

  for v_table in
    select * from pg_catalog.jsonb_to_recordset(p_tables) as t(
      id uuid, name text, capacity smallint, area text,
      shape text, pos_x numeric, pos_y numeric
    )
  loop
    if v_table.id is null then
      raise exception 'ID tavolo mancante';
    end if;
    insert into public.tables (id, name, capacity, area, shape, pos_x, pos_y)
    values (v_table.id, btrim(v_table.name), v_table.capacity, btrim(v_table.area),
      v_table.shape, v_table.pos_x, v_table.pos_y)
    on conflict (id) do update set
      name = excluded.name, capacity = excluded.capacity, area = excluded.area,
      shape = excluded.shape, pos_x = excluded.pos_x, pos_y = excluded.pos_y,
      archived_at = null;
  end loop;

  update public.tables t set archived_at = now()
  where t.id = any(p_known_ids) and t.archived_at is null
    and not exists (
      select 1 from pg_catalog.jsonb_to_recordset(p_tables) as d(id uuid)
      where d.id = t.id
    );
end;
$$;

revoke all on function public.save_staff_floor(jsonb, uuid[]) from public, anon;
grant execute on function public.save_staff_floor(jsonb, uuid[]) to authenticated;

create view public.customer_stats with (security_invoker = true) as
select
  customer_id,
  count(*) filter (where status = 'arrivato')::integer as visits,
  coalesce(sum(party_size) filter (where status = 'arrivato'), 0)::integer as covers,
  count(*) filter (where status = 'no-show')::integer as no_shows,
  max(date) filter (where status = 'arrivato') as last_visit,
  min(date) filter (
    where status = 'confermata' and date >= (now() at time zone 'Europe/Rome')::date
  ) as next_date
from public.reservations
where customer_id is not null
group by customer_id;

revoke all on public.customer_stats from public, anon;
grant select on public.customer_stats to authenticated;

-- Realtime applica le policy RLS di SELECT agli utenti iscritti al canale.
do $$
declare
  v_name text;
begin
  foreach v_name in array array['tables', 'reservations', 'customers'] loop
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_name
    ) then
      execute pg_catalog.format('alter publication supabase_realtime add table public.%I', v_name);
    end if;
  end loop;
end;
$$;
