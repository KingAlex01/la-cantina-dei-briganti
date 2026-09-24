-- Base dati della fase 1. Gli orari e i limiti di prenotazione dipendenti
-- dalla data saranno verificati dal server nella fase 3.

create schema if not exists private;
revoke all on schema private from public;

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  capacity smallint not null check (capacity between 1 and 20),
  area text not null default 'Sala',
  shape text not null check (shape in ('round', 'square', 'rect')),
  pos_x numeric(5, 2) not null check (pos_x between 0 and 100),
  pos_y numeric(5, 2) not null check (pos_y between 0 and 100),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tables_name_not_blank check (btrim(name) <> ''),
  constraint tables_area_not_blank check (btrim(area) <> '')
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  phone_key text not null unique,
  name text not null,
  phone text not null,
  email text,
  notes text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint customers_phone_key_format check (phone_key ~ '^[0-9]{6,15}$'),
  constraint customers_name_not_blank check (btrim(name) <> ''),
  constraint customers_phone_not_blank check (btrim(phone) <> ''),
  constraint customers_tags_allowed check (
    tags <@ array['VIP', 'Habitué', 'Allergie', 'Vegetariano', 'Attenzione']::text[]
  )
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  service text not null check (service in ('pranzo', 'cena')),
  arrival_time time without time zone not null,
  party_size smallint not null check (party_size between 1 and 20),
  name text not null,
  phone text,
  email text,
  notes text not null default '',
  reminder_opt_in boolean not null default false,
  table_id uuid not null references public.tables(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'confermata'
    check (status in ('confermata', 'arrivato', 'no-show', 'annullata')),
  source text not null check (source in ('online', 'staff')),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now(),
  constraint reservations_name_not_blank check (btrim(name) <> ''),
  constraint reservations_online_party_limit check (source <> 'online' or party_size <= 8),
  constraint reservations_online_phone_required check (
    source <> 'online' or nullif(btrim(coalesce(phone, '')), '') is not null
  )
);

-- L'orario indica solo l'arrivo: un tavolo resta occupato per tutto il servizio.
create unique index reservations_one_active_table_per_service
  on public.reservations (table_id, date, service)
  where status in ('confermata', 'arrivato');

create index reservations_by_service on public.reservations (date, service);
create index reservations_by_customer on public.reservations (customer_id, date desc);

create table public.message_templates (
  key text primary key,
  content text not null,
  updated_at timestamptz not null default now(),
  constraint message_templates_key_not_blank check (btrim(key) <> '')
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  channel text not null check (channel in ('sms', 'email')),
  kind text not null check (kind in ('conferma', 'promemoria', 'annullamento')),
  recipient text not null,
  subject text,
  body text not null,
  status text not null check (status in ('in_attesa', 'inviata', 'fallita')),
  provider_id text,
  created_at timestamptz not null default now(),
  constraint notifications_recipient_not_blank check (btrim(recipient) <> '')
);

create index notifications_by_reservation on public.notifications (reservation_id, created_at desc);

-- Solo gli utenti presenti qui sono membri dello staff. L'inserimento sarà
-- amministrativo; la schermata di accesso arriverà nella fase 2.
create table public.staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_users where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_staff() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_staff() to authenticated;

-- Conserviamo i tavoli nello storico invece di cancellarli. Un tavolo con
-- prenotazioni attive da oggi in avanti non può essere archiviato.
create function private.prevent_archiving_booked_table()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.archived_at is null and new.archived_at is not null and exists (
    select 1 from public.reservations
    where table_id = old.id
      and status in ('confermata', 'arrivato')
      and date >= (now() at time zone 'Europe/Rome')::date
  ) then
    raise exception 'Sposta le prenotazioni future prima di archiviare il tavolo';
  end if;
  return new;
end;
$$;

create trigger tables_prevent_archiving_booked
before update of archived_at on public.tables
for each row execute function private.prevent_archiving_booked_table();

create function private.prevent_booking_archived_table()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('confermata', 'arrivato') and exists (
    select 1 from public.tables
    where id = new.table_id and archived_at is not null
  ) then
    raise exception 'Non puoi assegnare una prenotazione attiva a un tavolo archiviato';
  end if;
  return new;
end;
$$;

create trigger reservations_prevent_archived_table
before insert or update of table_id, status on public.reservations
for each row execute function private.prevent_booking_archived_table();

-- Data API: nessun accesso pubblico diretto; solo staff autorizzato.
alter table public.tables enable row level security;
alter table public.customers enable row level security;
alter table public.reservations enable row level security;
alter table public.message_templates enable row level security;
alter table public.notifications enable row level security;
alter table public.staff_users enable row level security;

revoke all on public.tables, public.customers, public.reservations,
  public.message_templates, public.notifications, public.staff_users
  from anon, authenticated, service_role;

grant select, insert, update, delete on public.tables, public.customers,
  public.reservations, public.message_templates, public.notifications
  to authenticated, service_role;
grant select, insert, update, delete on public.staff_users to service_role;

create policy staff_all_tables on public.tables
  for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy staff_all_customers on public.customers
  for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy staff_all_reservations on public.reservations
  for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy staff_all_templates on public.message_templates
  for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy staff_all_notifications on public.notifications
  for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
