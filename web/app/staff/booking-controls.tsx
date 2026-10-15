"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isServiceOpenOnDate } from "../../lib/public-booking";
import type { Availability } from "../../lib/public-booking";
import { dateLabel, todayInRome } from "../../lib/staff/types";
import type { Service } from "../../lib/staff/types";
import styles from "./booking-controls.module.css";

type Blocks = Record<Service, boolean>;
type Action = "open" | "block" | "reset";
const services: Service[] = ["pranzo", "cena"];

export default function BookingControls({ client, date, onOpeningsChange }: {
  client: SupabaseClient; date: string; onOpeningsChange: (value: { date: string; opened: Availability } | null) => void;
}) {
  const [blocked, setBlocked] = useState<Blocks | null>(null);
  const [opened, setOpened] = useState<Availability>({ pranzo: false, cena: false });
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
        .select("service, blocked").eq("date", date);
      if (!mounted.current || request !== sequence.current) return;
      if (loadError || !Array.isArray(data) || data.some((row) => typeof row.blocked !== "boolean")) throw new Error("Controllo non disponibile");
      setBlocked({
        pranzo: data.some((row) => row.service === "pranzo" && row.blocked),
        cena: data.some((row) => row.service === "cena" && row.blocked),
      });
      const nextOpened = {
        pranzo: data.some((row) => row.service === "pranzo" && !row.blocked),
        cena: data.some((row) => row.service === "cena" && !row.blocked),
      };
      setOpened(nextOpened);
      onOpeningsChange({ date, opened: nextOpened });
      setError("");
    } catch {
      if (!mounted.current || request !== sequence.current) return;
      setBlocked(null);
      onOpeningsChange(null);
      setError("Non riusciamo a controllare lo stato delle prenotazioni online. Riprova.");
    }
  }, [client, date, onOpeningsChange]);

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

  async function save(selected: Service[], action: Action) {
    if (savingRef.current || blocked === null || pastDate) return;
    savingRef.current = true;
    sequence.current += 1;
    setSaving(true);
    setError("");
    setNotice("");
    let failed = false;
    try {
      const { data, error: saveError } = await client.rpc("set_booking_override", {
        p_date: date, p_services: selected, p_action: action,
      });
      if (saveError || data?.date !== date ||
          typeof data?.blocked?.pranzo !== "boolean" || typeof data?.blocked?.cena !== "boolean" ||
          typeof data?.opened?.pranzo !== "boolean" || typeof data?.opened?.cena !== "boolean") {
        throw new Error("Salvataggio non confermato");
      }
      if (!mounted.current) return;
      setBlocked(data.blocked as Blocks);
      setOpened(data.opened as Availability);
      onOpeningsChange({ date, opened: data.opened as Availability });
      const scope = selected.length === 2 ? "pranzo e cena" : selected[0];
      setNotice(action === "reset" ? `Calendario normale ripristinato per ${scope} di ${dateLabel(date)}.` :
        `Prenotazioni online ${action === "block" ? "bloccate" : "aperte"} per ${scope} di ${dateLabel(date)}.`);
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
  const isOpen = (service: Service) => !blocked?.[service] && isServiceOpenOnDate(date, service, opened[service]);
  const hasOverrides = services.some((service) => blocked?.[service] || opened[service]);
  return <section className={styles.panel} aria-labelledby="booking-controls-title" aria-busy={saving}>
    <div className={styles.heading}>
      <div><h2 id="booking-controls-title">Prenotazioni online</h2>
        <p>Apri o blocca le nuove richieste per {dateLabel(date)}.</p></div>
      <div className={styles.dayActions}>
        <button type="button" className={styles.blockButton}
          disabled={disabled || (blocked?.pranzo && blocked?.cena)}
          onClick={() => void save(services, "block")}>Blocca intera giornata</button>
        <button type="button" className={styles.button}
          disabled={disabled || services.every(isOpen)} onClick={() => void save(services, "open")}>Apri intera giornata</button>
        {hasOverrides && <button type="button" className={styles.button}
          disabled={disabled} onClick={() => void save(services, "reset")}>Ripristina calendario</button>}
      </div>
    </div>
    <div className={styles.services}>
      {services.map((service) => {
        const isBlocked = blocked?.[service] === true;
        const active = isOpen(service);
        const exceptional = opened[service] && !isServiceOpenOnDate(date, service);
        const label = service === "pranzo" ? "Pranzo" : "Cena";
        return <div key={service} className={`${styles.service} ${!active ? styles.blocked : ""}`}>
          <div><strong>{label}</strong><span role="status">
            {blocked === null ? "Stato non disponibile" : isBlocked ? "Prenotazioni bloccate" :
              !active ? "Chiuso da calendario" : exceptional ? "Apertura straordinaria" : "Prenotazioni attive"}
          </span></div>
          <div className={styles.serviceActions}>
            <button type="button" className={active ? styles.blockButton : styles.button}
              disabled={disabled} onClick={() => void save([service], active ? "block" : "open")}>
              {active ? `Blocca ${service}` : `Apri ${service}`}
            </button>
            {(isBlocked || opened[service]) && <button type="button" className={styles.button}
              disabled={disabled} onClick={() => void save([service], "reset")} aria-label={`Ripristina calendario per ${service}`}>
              Usa calendario
            </button>}
          </div>
        </div>;
      })}
    </div>
    <p className={styles.hint}>Le aperture e i blocchi valgono solo per questa data. Puoi aprire anche i servizi normalmente chiusi. Restano validi gli orari di prenotazione e i tavoli disponibili. Le richieste già ricevute restano gestibili.</p>
    {pastDate && <p className={styles.hint}>Puoi modificare le prenotazioni online soltanto da oggi in avanti.</p>}
    {saving && <p className={styles.hint} role="status">Salvataggio in corso…</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {error && <div className={styles.error} role="alert"><span>{error}</span>
      <button type="button" className={styles.button} disabled={saving} onClick={() => void load()}>Aggiorna stato</button></div>}
  </section>;
}
