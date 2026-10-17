-- Gestione cliente mediante codice segreto; tutte le RPC passano dal server.
begin;

alter table public.reservations drop constraint reservations_code_check;
alter table public.reservations add constraint reservations_code_check
  check (code ~ '^([A-Z0-9]{6}|[A-F0-9]{16})$');

-- I codici storici continuano a funzionare. Ogni nuovo codice contiene 64 bit
-- casuali: escludiamo esplicitamente i nibble UUID di versione e variante.
create or replace function private.ensure_unique_reservation_code()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attempt integer;
  v_random text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('reservation_code'));
  for v_attempt in 1..20 loop
    v_random := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
    new.code := pg_catalog.upper(pg_catalog.substr(v_random, 1, 12) || pg_catalog.substr(v_random, 18, 4));
    if not exists (select 1 from public.reservations where code = new.code) then return new; end if;
  end loop;
  raise exception 'Impossibile generare un codice prenotazione univoco';
end;
$$;
revoke all on function private.ensure_unique_reservation_code() from public, anon, authenticated, service_role;

alter table public.reservations
  add column management_version uuid not null default gen_random_uuid(),
  add column replaces_id uuid references public.reservations(id) on delete set null,
  add column replaced_by_id uuid references public.reservations(id) on delete set null,
  add column cancellation_reason text check (cancellation_reason in ('cliente', 'modifica_cliente'));
create index reservations_replaces on public.reservations (replaces_id) where replaces_id is not null;
create index reservations_replaced_by on public.reservations (replaced_by_id) where replaced_by_id is not null;

-- Anche una decisione dello staff rende obsoleta una schermata cliente aperta.
create function private.rotate_reservation_management_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.cancellation_reason is not null and (
      new.status <> 'annullata' or new.cancellation_reason is distinct from old.cancellation_reason
    ) or (old.replaced_by_id is not null and new.status <> 'annullata') then
    raise exception 'Una prenotazione cancellata dal cliente non può essere ripristinata';
  end if;
  if auth.role() = 'authenticated' and (
      new.cancellation_reason is distinct from old.cancellation_reason
      or new.replaces_id is distinct from old.replaces_id
      or new.replaced_by_id is distinct from old.replaced_by_id
    ) then
    raise exception 'Le modifiche cliente si gestiscono solo tramite API';
  end if;
  if row(new.date, new.service, new.arrival_time, new.party_size, new.name,
      new.phone, new.email, new.status, new.notes, new.notes_consent_at,
      new.source, new.approved_at, new.table_id, new.customer_id,
      new.reminder_opt_in, new.code, new.replaces_id, new.replaced_by_id, new.cancellation_reason)
    is distinct from row(old.date, old.service, old.arrival_time, old.party_size,
      old.name, old.phone, old.email, old.status, old.notes, old.notes_consent_at,
      old.source, old.approved_at, old.table_id, old.customer_id,
      old.reminder_opt_in, old.code, old.replaces_id, old.replaced_by_id, old.cancellation_reason) then
    new.management_version := pg_catalog.gen_random_uuid();
  else
    new.management_version := old.management_version;
  end if;
  return new;
end;
$$;
revoke all on function private.rotate_reservation_management_version() from public, anon, authenticated, service_role;
create trigger reservations_rotate_management_version
before update on public.reservations
for each row execute function private.rotate_reservation_management_version();

-- Il registro è scritto nella stessa transazione della modifica. Rimane quindi
-- consultabile dallo staff anche se Resend o la risposta HTTP non riescono.
create table public.reservation_customer_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  previous_reservation_id uuid references public.reservations(id) on delete set null,
  kind text not null check (kind in ('annullamento', 'modifica', 'note')),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index reservation_customer_events_by_reservation
  on public.reservation_customer_events (reservation_id, created_at desc);
create index reservation_customer_events_previous on public.reservation_customer_events (previous_reservation_id)
  where previous_reservation_id is not null;
create index reservation_customer_events_recent on public.reservation_customer_events (created_at desc);
alter table public.reservation_customer_events enable row level security;
revoke all on public.reservation_customer_events from public, anon, authenticated, service_role;
grant select on public.reservation_customer_events to authenticated;
grant select, insert, update, delete on public.reservation_customer_events to service_role;
create policy staff_read_customer_events on public.reservation_customer_events
  for select to authenticated using (private.is_staff());

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('conferma', 'promemoria', 'annullamento', 'richiesta', 'modifica', 'note'));
alter table public.notifications add column customer_event_id uuid
  references public.reservation_customer_events(id) on delete set null;
create unique index notifications_one_email_per_customer_event
  on public.notifications (customer_event_id) where channel = 'email' and customer_event_id is not null;

-- Solo HMAC dell'indirizzo client: nessun IP o codice prenotazione nel limiter.
-- Le ultime 20 ammissioni formano finestre mobili effettive di 1 min e 1 ora.
create table private.public_management_attempts (
  key text primary key check (key ~ '^[a-f0-9]{64}$'),
  attempts timestamptz[] not null default '{}',
  expires_at timestamptz not null
);
create index public_management_attempts_expiry on private.public_management_attempts (expires_at);
alter table private.public_management_attempts enable row level security;
revoke all on private.public_management_attempts from public, anon, authenticated, service_role;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.public_management_attempts to service_role;

create function public.consume_public_management_attempt(p_key text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_attempts timestamptz[];
  v_minute timestamptz[];
  v_retry integer := 0;
begin
  if p_key is null or p_key !~ '^[a-f0-9]{64}$' then
    raise exception 'Chiave di controllo non valida' using errcode = '22023';
  end if;
  -- Pulizia limitata, con SKIP LOCKED per non contendere richieste in corso.
  delete from private.public_management_attempts a using (
    select key from private.public_management_attempts where expires_at <= v_now
    order by expires_at limit 100 for update skip locked
  ) expired where a.key = expired.key;
  insert into private.public_management_attempts (key, expires_at)
  values (p_key, v_now + interval '1 hour') on conflict (key) do nothing;
  select attempts into v_attempts from private.public_management_attempts
    where key = p_key for update;
  v_now := pg_catalog.clock_timestamp();
  select coalesce(pg_catalog.array_agg(a order by a), '{}'::timestamptz[])
    into v_attempts from pg_catalog.unnest(v_attempts) a where a > v_now - interval '1 hour';
  select coalesce(pg_catalog.array_agg(a order by a), '{}'::timestamptz[])
    into v_minute from pg_catalog.unnest(v_attempts) a where a > v_now - interval '1 minute';
  if pg_catalog.cardinality(v_attempts) >= 20 then
    v_retry := greatest(1, pg_catalog.ceil(extract(epoch from (v_attempts[1] + interval '1 hour' - v_now)))::integer);
  end if;
  if pg_catalog.cardinality(v_minute) >= 5 then
    v_retry := greatest(v_retry, 1, pg_catalog.ceil(extract(epoch from (v_minute[1] + interval '1 minute' - v_now)))::integer);
  end if;
  if v_retry > 0 then
    return pg_catalog.jsonb_build_object('allowed', false, 'retry_after', v_retry);
  end if;
  update private.public_management_attempts set attempts = pg_catalog.array_append(v_attempts, v_now),
    expires_at = v_now + interval '1 hour' where key = p_key;
  return pg_catalog.jsonb_build_object('allowed', true, 'retry_after', 0);
end;
$$;
revoke all on function public.consume_public_management_attempt(text) from public, anon, authenticated, service_role;
grant execute on function public.consume_public_management_attempt(text) to service_role;

-- Payload pubblico esplicito: mai contatti, identificativi interni o tavolo.
create function private.public_reservation_management_view(p_booking public.reservations)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'code', p_booking.code, 'name', p_booking.name, 'date', p_booking.date,
    'service', p_booking.service, 'arrival_time', p_booking.arrival_time,
    'party_size', p_booking.party_size, 'status', p_booking.status,
    'notes', p_booking.notes, 'version', p_booking.management_version
  );
$$;
revoke all on function private.public_reservation_management_view(public.reservations) from public, anon, authenticated, service_role;
grant execute on function private.public_reservation_management_view(public.reservations) to service_role;

create function public.lookup_public_reservation(p_code text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_code text;
  v_booking public.reservations;
  v_next public.reservations;
  v_hop integer;
begin
  if p_code is null or pg_catalog.length(p_code) > 64 then return null; end if;
  v_code := pg_catalog.upper(pg_catalog.regexp_replace(p_code, '[[:space:]-]', '', 'g'));
  if v_code !~ '^([A-Z0-9]{6}|[A-F0-9]{16})$' then return null; end if;
  select * into v_booking from public.reservations r where r.code = v_code and r.source = 'online';
  if not found then return null; end if;
  -- Recupera il codice corrente anche se la risposta della sostituzione si è
  -- persa in rete. Il vecchio codice consente lettura; non autorizza mutazioni.
  for v_hop in 1..64 loop
    exit when v_booking.replaced_by_id is null;
    select * into v_next from public.reservations r where r.id = v_booking.replaced_by_id
      and r.source = 'online' and r.replaces_id = v_booking.id
      and r.customer_id is not distinct from v_booking.customer_id
      and r.phone is not distinct from v_booking.phone;
    if not found then return null; end if;
    v_booking := v_next;
  end loop;
  if v_booking.replaced_by_id is not null
    or v_booking.date < (now() at time zone 'Europe/Rome')::date
    or v_booking.status not in ('in_attesa', 'confermata', 'annullata') then return null; end if;
  return private.public_reservation_management_view(v_booking);
end;
$$;
revoke all on function public.lookup_public_reservation(text) from public, anon, authenticated, service_role;
grant execute on function public.lookup_public_reservation(text) to service_role;

create function public.manage_public_reservation(
  p_code text,
  p_version uuid,
  p_action text,
  p_date date default null,
  p_service text default null,
  p_arrival_time time default null,
  p_party_size smallint default null,
  p_notes text default null,
  p_notes_consent boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_code text;
  v_before public.reservations;
  v_after public.reservations;
  v_created jsonb;
  v_lock record;
  v_now timestamp := now() at time zone 'Europe/Rome';
  v_notes text;
  v_consent boolean;
  v_legacy_notes boolean;
  v_event uuid;
  v_kind text;
  v_previous_code text;
begin
  if p_code is null or pg_catalog.length(p_code) > 64 or p_version is null
    or p_action is null or p_action not in ('cancel', 'notes', 'replace') then
    raise exception 'Richiesta non valida' using errcode = '22023';
  end if;
  v_code := pg_catalog.upper(pg_catalog.regexp_replace(p_code, '[[:space:]-]', '', 'g'));
  if v_code !~ '^([A-Z0-9]{6}|[A-F0-9]{16})$' then
    raise exception 'Prenotazione non trovata' using errcode = 'P0002';
  end if;
  select * into v_before from public.reservations r where r.code = v_code and r.source = 'online';
  if not found then raise exception 'Prenotazione non trovata' using errcode = 'P0002'; end if;

  if p_action = 'replace' then
    if p_date is null or not pg_catalog.isfinite(p_date) or p_date < v_now::date or p_date > v_now::date + 60
      or p_service is null or p_service not in ('pranzo', 'cena')
      or p_arrival_time is null or p_party_size is null or p_party_size not between 1 and 8 then
      raise exception 'Data o numero di persone non validi' using errcode = '22023';
    end if;
    -- Ordine comune: servizi per data/nome, poi riga, poi cliente e codice.
    for v_lock in select distinct slot_date, slot_service from (
      values (v_before.date, v_before.service), (p_date, p_service)
    ) slots(slot_date, slot_service) order by slot_date, slot_service loop
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_lock.slot_date::text || ':' || v_lock.slot_service));
    end loop;
  end if;

  -- La versione controllata dopo il row lock evita due modifiche concorrenti
  -- e rileva anche l'approvazione o lo spostamento effettuati dallo staff.
  select * into v_before from public.reservations r where r.code = v_code and r.source = 'online' for update;
  if not found then raise exception 'Prenotazione non trovata' using errcode = 'P0002'; end if;
  if v_before.management_version <> p_version then
    raise exception 'La prenotazione è cambiata. Cerca di nuovo il codice per aggiornare i dati' using errcode = '40001';
  end if;
  if v_before.status not in ('in_attesa', 'confermata') or v_before.replaced_by_id is not null then
    raise exception 'La prenotazione non è più modificabile' using errcode = '22023';
  end if;
  if v_before.date + v_before.arrival_time <= v_now then
    raise exception 'L''orario di arrivo è già trascorso. Contatta il ristorante' using errcode = '22023';
  end if;
  v_notes := case when p_notes is null then v_before.notes else pg_catalog.btrim(p_notes) end;
  v_consent := coalesce(p_notes_consent, false) or (v_notes = v_before.notes and v_before.notes_consent_at is not null);
  -- Le vecchie note rimangono dati già raccolti: una modifica di data non
  -- attribuisce un consenso mai prestato e non obbliga a riscriverle.
  v_legacy_notes := p_action = 'replace' and v_notes = v_before.notes
    and v_notes <> '' and v_before.notes_consent_at is null and not coalesce(p_notes_consent, false);
  if p_action in ('notes', 'replace') then
    if pg_catalog.length(v_notes) > 1000 then
      raise exception 'Le note sono troppo lunghe' using errcode = '22023';
    end if;
    if v_notes <> '' and not v_consent and not v_legacy_notes then
      raise exception 'Consenso per le note non prestato' using errcode = '22023';
    end if;
  end if;

  if p_action = 'cancel' then
    update public.reservations set status = 'annullata', cancellation_reason = 'cliente'
      where id = v_before.id returning * into v_after;
    v_kind := 'annullamento';
  elsif p_action = 'notes' then
    if v_notes = v_before.notes then
      return pg_catalog.jsonb_build_object('booking', private.public_reservation_management_view(v_before),
        'previous_code', null, 'event_id', null);
    end if;
    update public.reservations set notes = v_notes,
      notes_consent_at = case when v_notes <> '' then now() end
      where id = v_before.id returning * into v_after;
    v_kind := 'note';
  else
    if row(p_date, p_service, p_arrival_time, p_party_size) =
      row(v_before.date, v_before.service, v_before.arrival_time, v_before.party_size) then
      raise exception 'Nessuna modifica ai dettagli della prenotazione' using errcode = '22023';
    end if;
    -- La cancellazione è provvisoria fino al COMMIT: se non c'è disponibilità,
    -- anche questo UPDATE torna indietro e la vecchia conferma rimane valida.
    update public.reservations set status = 'annullata', cancellation_reason = 'modifica_cliente' where id = v_before.id;
    v_created := public.create_public_reservation_with_notes_consent(
      p_date, p_service, p_arrival_time, p_party_size, v_before.name,
      v_before.phone, v_before.email, case when v_legacy_notes then '' else v_notes end,
      v_before.reminder_opt_in, v_consent
    );
    select * into strict v_after from public.reservations where code = v_created->>'code';
    update public.reservations set replaces_id = v_before.id, notes = v_notes,
      notes_consent_at = case when v_notes = v_before.notes then v_before.notes_consent_at
        when v_notes <> '' then now() end
      where id = v_after.id returning * into v_after;
    update public.reservations set replaced_by_id = v_after.id where id = v_before.id;
    v_previous_code := v_before.code;
    v_kind := 'modifica';
  end if;

  insert into public.reservation_customer_events (reservation_id, previous_reservation_id, kind, snapshot)
  values (v_after.id, case when p_action = 'replace' then v_before.id end, v_kind,
    pg_catalog.jsonb_build_object('before', pg_catalog.to_jsonb(v_before), 'after', pg_catalog.to_jsonb(v_after)))
  returning id into v_event;
  return pg_catalog.jsonb_build_object('booking', private.public_reservation_management_view(v_after),
    'previous_code', v_previous_code, 'event_id', v_event);
end;
$$;
revoke all on function public.manage_public_reservation(text, uuid, text, date, text, time, smallint, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.manage_public_reservation(text, uuid, text, date, text, time, smallint, text, boolean)
  to service_role;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'reservation_customer_events') then
    alter publication supabase_realtime add table public.reservation_customer_events;
  end if;
end;
$$;

commit;
