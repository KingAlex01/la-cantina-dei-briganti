-- Conservazione: dati del cliente fino a 24 mesi dall'ultima prenotazione.
-- Le prenotazioni senza scheda cliente scadono dopo 24 mesi dal servizio.
-- Le notifiche vanno eliminate prima delle prenotazioni per il vincolo FK.

create or replace function private.purge_expired_booking_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff date := ((now() at time zone 'Europe/Rome')::date - interval '24 months')::date;
begin
  delete from public.notifications n
  using public.reservations r
  where n.reservation_id = r.id
    and (
      (r.customer_id is null and r.date < v_cutoff)
      or (r.customer_id is not null and not exists (
        select 1 from public.reservations recent
        where recent.customer_id = r.customer_id and recent.date >= v_cutoff
      ))
    );

  delete from public.reservations r
  where (r.customer_id is null and r.date < v_cutoff)
    or (r.customer_id is not null and not exists (
      select 1 from public.reservations recent
      where recent.customer_id = r.customer_id and recent.date >= v_cutoff
    ));

  delete from public.customers c
  where c.created_at < (v_cutoff::timestamp at time zone 'Europe/Rome')
    and not exists (
      select 1 from public.reservations r where r.customer_id = c.id
    );
end;
$$;

revoke all on function private.purge_expired_booking_data() from public, anon, authenticated, service_role;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'purge-expired-booking-data',
  '17 3 * * *',
  'select private.purge_expired_booking_data()'
);
