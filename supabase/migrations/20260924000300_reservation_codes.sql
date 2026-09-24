-- Mantiene unico il codice breve anche quando il numero di prenotazioni cresce.
create function private.ensure_unique_reservation_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('reservation_code'));
  if new.code is not null and not exists (
    select 1 from public.reservations where code = new.code
  ) then
    return new;
  end if;

  for v_attempt in 1..20 loop
    new.code := pg_catalog.upper(pg_catalog.substr(
      pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 6));
    if pg_catalog.length(new.code) = 6 and not exists (
      select 1 from public.reservations where code = new.code
    ) then
      return new;
    end if;
  end loop;
  raise exception 'Impossibile generare un codice prenotazione univoco';
end;
$$;

create trigger reservations_ensure_unique_code
before insert on public.reservations
for each row execute function private.ensure_unique_reservation_code();
