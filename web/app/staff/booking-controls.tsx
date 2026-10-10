"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isServiceOpenOnDate } from "../../lib/public-booking";
import { dateLabel, todayInRome } from "../../lib/staff/types";
import type { Service } from "../../lib/staff/types";
import styles from "./booking-controls.module.css";

type Blocks = Record<Service, boolean>;
const services: Service[] = ["pranzo", "cena"];

export default function BookingControls({ client, date }: { client: SupabaseClient; date: string }) {
  const [blocked, setBlocked] = useState<Blocks | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sequence = useRef(0);
  const mounted = useRef(false);
  const savingRef = useRef(false);
  const pastDate = date < todayInRome();

  const load = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const { data, error: loadError } = await client.from("booking_blocks")
        .select("service").eq("date", date);
      if (!mounted.current || request !== sequence.current) return;
      if (loadError || !Array.isArray(data)) throw new Error("Controllo non disponibile");
      setBlocked({
        pranzo: data.some((row) => row.service === "pranzo"),
        cena: data.some((row) => row.service === "cena"),
      });
      setError("");
    } catch {
      if (!mounted.current || request !== sequence.current) return;
      setBlocked(null);
      setError("Non riusciamo a controllare i blocchi delle prenotazioni online. Riprova.");
    }
  }, [client, date]);

  useEffect(() => {
    mounted.current = true;
    const timer = window.setTimeout(() => void load(), 0);
    const refresh = () => { if (!document.hidden && !savingRef.current) void load(); };
    const channel = client.channel(`booking-controls:${date}`)
      // Le cancellazioni Realtime non supportano filtri: rileggiamo solo la data mostrata.
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_blocks" }, refresh)
      .subscribe((status) => { if (status === "SUBSCRIBED") refresh(); });
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      mounted.current = false;
      sequence.current += 1;
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void client.removeChannel(channel);
    };
  }, [client, date, load]);

  async function save(selected: Service[], value: boolean) {
    if (savingRef.current || blocked === null || pastDate) return;
    savingRef.current = true;
    sequence.current += 1;
    setSaving(true);
    setError("");
    setNotice("");
    let failed = false;
    try {
      const { data, error: saveError } = await client.rpc("set_booking_block", {
        p_date: date, p_services: selected, p_blocked: value,
      });
      if (saveError || data?.date !== date ||
          typeof data?.blocked?.pranzo !== "boolean" || typeof data?.blocked?.cena !== "boolean") {
        throw new Error("Salvataggio non confermato");
      }
      if (!mounted.current) return;
      setBlocked(data.blocked as Blocks);
      const scope = selected.length === 2 ? "pranzo e cena" : selected[0];
      setNotice(`Prenotazioni online ${value ? "bloccate" : "riattivate"} per ${scope} di ${dateLabel(date)}.`);
    } catch {
      failed = true;
    } finally {
      // Rileggiamo anche dopo un errore di rete: il database potrebbe aver già salvato.
      if (mounted.current) {
        await load();
        if (failed && mounted.current) {
          setError("La modifica non è stata confermata. Controlla lo stato e riprova.");
        }
        if (mounted.current) setSaving(false);
      }
      savingRef.current = false;
    }
  }

  const disabled = blocked === null || saving || pastDate;
  return <section className={styles.panel} aria-labelledby="booking-controls-title" aria-busy={saving}>
    <div className={styles.heading}>
      <div><h2 id="booking-controls-title">Prenotazioni online</h2>
        <p>Blocca le nuove richieste per {dateLabel(date)}.</p></div>
      <div className={styles.dayActions}>
        <button type="button" className={styles.blockButton}
          disabled={disabled || (blocked?.pranzo && blocked?.cena)}
          onClick={() => void save(services, true)}>Blocca intera giornata</button>
        {(blocked?.pranzo || blocked?.cena) && <button type="button" className={styles.button}
          disabled={disabled} onClick={() => void save(services, false)}>Riattiva giornata</button>}
      </div>
    </div>
    <div className={styles.services}>
      {services.map((service) => {
        const isBlocked = blocked?.[service] === true;
        const scheduled = isServiceOpenOnDate(date, service);
        const label = service === "pranzo" ? "Pranzo" : "Cena";
        return <div key={service} className={`${styles.service} ${isBlocked ? styles.blocked : ""}`}>
          <div><strong>{label}</strong><span role="status">
            {blocked === null ? "Stato non disponibile" : isBlocked ? "Prenotazioni bloccate" :
              !scheduled ? "Chiuso da calendario" : "Prenotazioni attive"}
          </span></div>
          <button type="button" className={isBlocked ? styles.button : styles.blockButton}
            disabled={disabled || (!scheduled && !isBlocked)} aria-pressed={isBlocked}
            onClick={() => void save([service], !isBlocked)}>
            {isBlocked ? `Riattiva ${service}` : `Blocca ${service}`}
          </button>
        </div>;
      })}
    </div>
    <p className={styles.hint}>Le richieste già ricevute restano gestibili. Puoi continuare a inserire prenotazioni manuali. La riattivazione rispetta i normali giorni di apertura.</p>
    {pastDate && <p className={styles.hint}>Puoi modificare i blocchi soltanto da oggi in avanti.</p>}
    {saving && <p className={styles.hint} role="status">Salvataggio in corso…</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {error && <div className={styles.error} role="alert"><span>{error}</span>
      <button type="button" className={styles.button} disabled={saving} onClick={() => void load()}>Aggiorna stato</button></div>}
  </section>;
}
