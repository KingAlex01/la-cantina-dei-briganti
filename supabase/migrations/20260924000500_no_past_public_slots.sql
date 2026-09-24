-- Niente prenotazioni pubbliche per orari di arrivo già trascorsi oggi.
-- Questo controllo è nel database, così resta valido anche con richieste dirette.

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
          and r.status in ('confermata', 'arrivato')
      )
  ) into v_lunch;

  select exists (
    select 1 from public.tables t
    where t.archived_at is null and t.capacity >= p_party_size
      and not exists (
        select 1 from public.reservations r
        where r.table_id = t.id and r.date = p_date and r.service = 'cena'
          and r.status in ('confermata', 'arrivato')
      )
  ) into v_dinner;

  return pg_catalog.jsonb_build_object(
    'pranzo', v_lunch and extract(isodow from p_date) <> 1
      and (p_date > v_today or v_now::time < time '14:00'),
    'cena', v_dinner and (p_date > v_today or v_now::time < time '22:00')
  );
end;
$$;

create or replace function private.prevent_past_public_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source = 'online'
    and new.date = (now() at time zone 'Europe/Rome')::date
    and new.arrival_time <= (now() at time zone 'Europe/Rome')::time then
    raise exception 'Orario già trascorso';
  end if;
  return new;
end;
$$;

create trigger reservations_prevent_past_public_slot
before insert or update of date, arrival_time, source on public.reservations
for each row execute function private.prevent_past_public_slot();
