"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Reservation } from "../../lib/staff/types";
import { dateLabel, timeLabel } from "../../lib/staff/types";
import styles from "./staff.module.css";

type Snapshot = Pick<Reservation, "code" | "date" | "service" | "arrival_time" | "party_size" | "notes">;
type Activity = {
  id: string; kind: "annullamento" | "modifica" | "note"; created_at: string;
  snapshot: { before: Snapshot; after: Snapshot };
};

function summary(booking: Snapshot) {
  return `${dateLabel(booking.date)} · ${booking.service} ${timeLabel(booking.arrival_time)} · ${booking.party_size} persone`;
}

export default function ReservationActivity({ client, reservation }: { client: SupabaseClient; reservation: Reservation }) {
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void client.from("reservation_customer_events").select("id,kind,created_at,snapshot")
      .or(`reservation_id.eq.${reservation.id},previous_reservation_id.eq.${reservation.id}`)
      .order("created_at", { ascending: false }).limit(30)
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setError(Boolean(loadError));
        setActivity((data ?? []) as Activity[]);
      });
    return () => { active = false; };
  }, [client, reservation.id, reservation.management_version]);

  if (error) return <p className={styles.muted}>Lo storico delle azioni del cliente non è disponibile. Aggiorna la Sala per riprovare.</p>;
  if (!activity?.length) return null;
  return <section className={styles.customerActivity} aria-label="Azioni del cliente">
    <h3>Azioni del cliente</h3>
    {activity.map((event) => <details key={event.id}>
      <summary>{event.kind === "modifica" ? "Modifica con nuova richiesta" : event.kind === "annullamento" ? "Prenotazione cancellata" : "Note aggiornate"}
        <span> · {new Date(event.created_at).toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" })}</span></summary>
      {event.kind === "modifica" ? <>
        <p><strong>Precedente annullata · {event.snapshot.before.code}</strong><br />{summary(event.snapshot.before)}</p>
        <p><strong>Nuova richiesta · {event.snapshot.after.code}</strong><br />{summary(event.snapshot.after)}</p>
        <p>Note precedenti: {event.snapshot.before.notes || "Nessuna nota"}<br />Note nella nuova richiesta: {event.snapshot.after.notes || "Nessuna nota"}</p>
      </> : event.kind === "note" ? <p>Prima: {event.snapshot.before.notes || "Nessuna nota"}<br />Dopo: {event.snapshot.after.notes || "Nessuna nota"}</p>
        : <p>Codice {event.snapshot.after.code} · Il cliente ha liberato il tavolo.</p>}
    </details>)}
  </section>;
}
