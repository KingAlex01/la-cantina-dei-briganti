-- Eseguire nel SQL Editor del progetto di sviluppo dopo le migrazioni.
-- Tutte le prenotazioni di prova vengono annullate dal ROLLBACK finale.
begin;

do $$
declare
  v_table_id uuid;
  v_date date := date '2099-12-31';
begin
  if (select count(*) from public.tables where archived_at is null) <> 10 then
    raise exception 'Attesi 10 tavoli attivi';
  end if;

  if has_table_privilege('anon', 'public.tables', 'SELECT')
    or has_table_privilege('anon', 'public.customers', 'SELECT')
    or has_table_privilege('anon', 'public.reservations', 'SELECT') then
    raise exception 'Il pubblico ha accesso diretto ai dati';
  end if;

  select id into v_table_id from public.tables where name = 'T1';

  insert into public.reservations
    (date, service, arrival_time, party_size, name, phone, table_id, status, source, code)
  values
    (v_date, 'cena', time '19:00', 2, 'Test fase 1', '3330000000',
     v_table_id, 'confermata', 'staff', 'ZZZ001');

  begin
    insert into public.reservations
      (date, service, arrival_time, party_size, name, phone, table_id, status, source, code)
    values
      (v_date, 'cena', time '20:00', 2, 'Test duplicato', '3330000000',
       v_table_id, 'arrivato', 'staff', 'ZZZ002');
    raise exception 'Il vincolo contro le doppie prenotazioni non funziona';
  exception when unique_violation then
    null; -- È il risultato previsto.
  end;

  insert into public.reservations
    (date, service, arrival_time, party_size, name, phone, table_id, status, source, code)
  values
    (v_date, 'pranzo', time '12:30', 2, 'Test altro servizio', '3330000000',
     v_table_id, 'confermata', 'staff', 'ZZZ003'),
    (v_date, 'cena', time '19:30', 2, 'Test annullata', '3330000000',
     v_table_id, 'annullata', 'staff', 'ZZZ004');

  raise notice 'Verifiche fase 1 superate';
end;
$$;

rollback;
