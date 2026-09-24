-- Il pranzo del lunedì è chiuso anche per gli inserimenti dello staff.
create function private.prevent_monday_lunch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.service = 'pranzo' and extract(isodow from new.date) = 1 then
    raise exception 'Il pranzo del lunedì è chiuso';
  end if;
  return new;
end;
$$;

create trigger reservations_prevent_monday_lunch
before insert or update of date, service on public.reservations
for each row execute function private.prevent_monday_lunch();
