-- Evita registrazioni duplicate della stessa conferma per una prenotazione.
create unique index notifications_one_confirmation_per_channel
on public.notifications (reservation_id, channel)
where kind = 'conferma';
