-- Sospensioni puntuali delle nuove richieste online, gestite dalla Sala.
-- Le prenotazioni esistenti e quelle inserite dallo staff restano utilizzabili.
begin;

create table public.booking_blocks (
  date date not null,
  service text not null check (service in ('pranzo', 'cena')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  primary key (date, service)
);

alter table public.booking_blocks enable row level security;
revoke all on public.booking_blocks from public, anon, authenticated, service_role;
grant select on public.booking_blocks to authenticated, service_role;

create policy staff_read_booking_blocks on public.booking_blocks
  for select to authenticated using (private.is_staff());

-- Le scritture passano esclusivamente dalla RPC: un solo ordine di lock anche
-- quando si sospendono o riaprono entrambi i servizi nella stessa operazione.
create function public.set_booking_block(p_date date, p_services text[], p_blocked boolean)
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
  if p_blocked is null or p_services is null
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

  if p_blocked then
    insert into public.booking_blocks (date, service, created_by)
    select p_date, s.service, auth.uid()
    from (select distinct service from pg_catalog.unnest(p_services) as services(service)) s
    on conflict (date, service) do nothing;
  else
    delete from public.booking_blocks b where b.date = p_date and b.service = any(p_services);
  end if;

  return pg_catalog.jsonb_build_object(
    'date', p_date,
    'blocked', pg_catalog.jsonb_build_object(
      'pranzo', exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'pranzo'),
      'cena', exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'cena')
    )
  );
end;
$$;

revoke all on function public.set_booking_block(date, text[], boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_booking_block(date, text[], boolean) to authenticated;

-- Protezione comune a entrambe le RPC pubbliche e agli INSERT lato server.
-- Solo INSERT: accettare/modificare una richiesta preesistente resta possibile.
create function private.prevent_blocked_online_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source = 'online' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.date::text || ':' || new.service));
    if exists (
      select 1 from public.booking_blocks b where b.date = new.date and b.service = new.service
    ) then
      raise exception 'Prenotazioni online sospese per questo servizio';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_blocked_online_booking() from public, anon, authenticated, service_role;

-- BEFORE trigger eseguiti in ordine alfabetico: il lock del servizio deve
-- precedere quello globale di reservations_ensure_unique_code anche su INSERT
-- diretti, mantenendo lo stesso ordine delle RPC ed evitando un deadlock.
create trigger reservations_block_new_online_bookings
before insert on public.reservations
for each row execute function private.prevent_blocked_online_booking();

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
begin
  if p_date is null or not pg_catalog.isfinite(p_date) or p_date < v_today or p_date > v_today + 60
    or p_party_size is null or p_party_size not between 1 and 8 then
    raise exception 'Data o numero di persone non validi';
  end if;

  select exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'pranzo'),
    exists (select 1 from public.booking_blocks b where b.date = p_date and b.service = 'cena')
  into v_lunch_blocked, v_dinner_blocked;

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
    'pranzo', not v_lunch_blocked and v_lunch and extract(isodow from p_date) <> 4
      and (p_date > v_today or v_now::time < time '14:00'),
    'cena', not v_dinner_blocked and v_dinner and extract(isodow from p_date) not in (4, 7)
      and (p_date > v_today or v_now::time < time '22:00'),
    'blocked', pg_catalog.jsonb_build_object('pranzo', v_lunch_blocked, 'cena', v_dinner_blocked)
  );
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'booking_blocks'
  ) then
    alter publication supabase_realtime add table public.booking_blocks;
  end if;
end;
$$;

commit;
