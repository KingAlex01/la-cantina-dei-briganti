"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  SERVICE_TIMES, addDays, currentTimeInRome, dateLabel, todayInRome, validDate,
} from "../../lib/public-booking";
import type { Availability, BookingConfirmation, Service } from "../../lib/public-booking";
import styles from "./prenota.module.css";

const emptyAvailability: Availability = { pranzo: false, cena: false };

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(todayInRome);
  const [party, setParty] = useState(2);
  const [service, setService] = useState<Service>("cena");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [notesConsent, setNotesConsent] = useState(false);
  const [availability, setAvailability] = useState<Availability>(emptyAvailability);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const today = todayInRome();
  const now = currentTimeInRome();
  const visibleTimes = SERVICE_TIMES[service].filter((slot) => date !== today || slot > now);

  function serviceStatus(item: Service) {
    if (checking) return "Verifica…";
    if (availability[item]) return "Disponibile";
    if (item === "pranzo" && new Date(`${date}T12:00:00Z`).getUTCDay() === 1) return "Chiuso il lunedì";
    if (date === today && SERVICE_TIMES[item].every((slot) => slot <= now)) return "Orari terminati";
    return "Completo";
  }

  useEffect(() => {
    if (step !== 2 || !validDate(date)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setChecking(true);
      setError("");
      try {
        const params = new URLSearchParams({ date, party: String(party) });
        const response = await fetch(`/api/public/availability?${params}`, {
          cache: "no-store", signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setAvailability(result as Availability);
      } catch (failure) {
        if (!controller.signal.aborted) {
          setAvailability(emptyAvailability);
          setError(failure instanceof Error ? failure.message : "Controllo non riuscito.");
        }
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, 100);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [step, date, party]);

  function goToServices() {
    if (!validDate(date)) { setError("Scegli una data entro i prossimi 60 giorni."); return; }
    setTime("");
    setAvailability(emptyAvailability);
    setChecking(true);
    setError("");
    setStep(2);
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (notes.trim() && !notesConsent) {
      setError("Per inviare le note facoltative, conferma il consenso qui sotto.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, party, service, time, name, phone, email, notes, notesConsent, website: "" }),
      });
      if (response.status === 429) {
        throw new Error("Troppi tentativi in poco tempo. Aspetta un minuto e riprova.");
      }
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          setStep(2);
          setTime("");
        }
        throw new Error(result.error ?? "Prenotazione non riuscita.");
      }
      setConfirmation(result as BookingConfirmation);
      setStep(4);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Prenotazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setStep(1);
    setDate(todayInRome());
    setParty(2);
    setService("cena");
    setTime("");
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setNotesConsent(false);
    setConfirmation(null);
    setError("");
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" aria-label="Torna alla pagina iniziale">
        <Image src="/logo-cantina.svg" alt="La cantina dei briganti" width={180} height={135} className={styles.logo} priority />
      </Link>
      <span className={styles.headerCaption}>Prenota il tuo tavolo</span>
    </header>

    <div className={styles.layout}>
      <aside className={styles.intro}>
        <span className={styles.kicker}>La cantina dei briganti · Mola di Bari</span>
        <h1>Ci vediamo <em>a tavola.</em></h1>
        <p>Scegli quando venire. Ti teniamo il tavolo per tutto il servizio, senza fretta.</p>
        <div className={styles.decor} aria-hidden="true">✳</div>
      </aside>

      <section className={styles.card} aria-label="Prenotazione online">
        {step < 4 && <div className={styles.progress} aria-label={`Passo ${step} di 3`}>
          {[1, 2, 3].map((number) => <span key={number} className={number <= step ? styles.progressOn : ""} />)}
        </div>}

        {step === 1 && <>
          <div className={styles.stepHead}><h2>Quando venite?</h2><span>1 di 3</span></div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <label className={styles.field}>Data
            <input type="date" value={date} min={todayInRome()} max={addDays(todayInRome(), 60)}
              onChange={(event) => { setDate(event.target.value); setError(""); }} required />
          </label>
          <div className={styles.field}><span>Persone</span>
            <div className={styles.stepper}>
              <button type="button" onClick={() => setParty(Math.max(1, party - 1))} aria-label="Una persona in meno">−</button>
              <strong>{party} {party === 1 ? "persona" : "persone"}</strong>
              <button type="button" onClick={() => setParty(Math.min(8, party + 1))} aria-label="Una persona in più">+</button>
            </div>
          </div>
          <p className={styles.hint}>Siete più di 8? Contattateci direttamente: organizziamo la sala insieme.</p>
          <div className={styles.actions}><button className={styles.primary} type="button" onClick={goToServices}>Scegli il servizio <span aria-hidden="true">→</span></button></div>
        </>}

        {step === 2 && <>
          <div className={styles.stepHead}><h2>Pranzo o cena?</h2><span>2 di 3</span></div>
          <p className={styles.summary}>{dateLabel(date)} · {party} {party === 1 ? "persona" : "persone"}</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.field}><span>Servizio</span>
            <div className={styles.services}>
              {(["pranzo", "cena"] as Service[]).map((item) => <button key={item} type="button"
                className={service === item ? styles.selected : ""}
                disabled={checking || !availability[item]}
                onClick={() => { setService(item); setTime(""); setError(""); }}>
                <strong>{item === "pranzo" ? "Pranzo" : "Cena"}</strong>
                <small>{serviceStatus(item)}</small>
              </button>)}
            </div>
          </div>
          {!checking && !availability.pranzo && !availability.cena && !error &&
            <p className={styles.error}>{date === today && SERVICE_TIMES.cena.every((slot) => slot <= now)
              ? "Gli orari di oggi sono terminati. Prova un’altra data."
              : `Nessun servizio prenotabile per ${party} persone in questa data. Prova un’altra data.`}</p>}
          {availability[service] && <div className={styles.field}><span>A che ora arrivate?</span>
            <div className={styles.times}>{visibleTimes.map((slot) => <button key={slot} type="button"
              className={time === slot ? styles.selected : ""} onClick={() => setTime(slot)}>{slot}</button>)}</div>
          </div>}
          <p className={styles.note}>L’orario indica il vostro arrivo. Il tavolo resta vostro per tutto il servizio.</p>
          <div className={styles.actions}>
            <button className={styles.secondary} type="button" onClick={() => { setStep(1); setError(""); }}>Indietro</button>
            <button className={styles.primary} type="button" disabled={!availability[service] || !time || checking}
              onClick={() => { setStep(3); setError(""); }}>Inserisci i tuoi dati <span aria-hidden="true">→</span></button>
          </div>
        </>}

        {step === 3 && <form onSubmit={confirm}>
          <div className={styles.stepHead}><h2>A chi intestiamo il tavolo?</h2><span>3 di 3</span></div>
          <p className={styles.summary}>{dateLabel(date)} · {service} alle {time} · {party} {party === 1 ? "persona" : "persone"}</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <label className={styles.field}>Nome e cognome
            <input type="text" autoComplete="name" value={name} maxLength={120} required placeholder="Giulia Bianchi"
              onChange={(event) => setName(event.target.value)} />
          </label>
          <div className={styles.formRow}>
            <label className={styles.field}>Cellulare
              <input type="tel" autoComplete="tel" value={phone} maxLength={30} required placeholder="333 123 4567"
                onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label className={styles.field}>Email <span className={styles.optional}>(facoltativa)</span>
              <input type="email" autoComplete="email" value={email} maxLength={254} placeholder="giulia@email.it"
                onChange={(event) => setEmail(event.target.value)} />
            </label>
          </div>
          <label className={styles.field}>Note per la cucina e la sala <span className={styles.optional}>(facoltative)</span>
            <textarea value={notes} maxLength={1000} rows={3} placeholder="Allergie, un compleanno, un seggiolone…"
              onChange={(event) => setNotes(event.target.value)} />
          </label>
          {notes.trim() && <label className={styles.checkbox}>
            <input type="checkbox" checked={notesConsent} required onChange={(event) => setNotesConsent(event.target.checked)} />
            <span>Acconsento all’uso delle note facoltative, comprese eventuali informazioni su allergie o intolleranze, solo per preparare la mia visita. Posso prenotare anche senza note.</span>
          </label>}
          <p className={styles.privacy}>Useremo i tuoi dati per gestire la richiesta, che sarà visibile allo staff del ristorante. Il tavolo sarà confermato solo dopo l’approvazione dello staff. Se inserisci l’email, riceverai la conferma quando la richiesta sarà accettata. <Link href="/privacy">Leggi l’informativa privacy.</Link></p>
          <div className={styles.actions}>
            <button className={styles.secondary} type="button" onClick={() => { setStep(2); setError(""); }}>Indietro</button>
            <button className={styles.primary} type="submit" disabled={busy}>{busy ? "Invio…" : "Invia richiesta"}</button>
          </div>
        </form>}

        {step === 4 && confirmation && <div className={styles.confirmed}>
          <span className={styles.check} aria-hidden="true">✓</span>
          <span className={styles.kicker}>Richiesta inviata</span>
          <h2>In attesa di approvazione.</h2>
          <p>Grazie, {confirmation.name.split(" ")[0]}. Lo staff esaminerà la tua richiesta.</p>
          <dl className={styles.details}>
            <div><dt>Data</dt><dd>{dateLabel(confirmation.date)}</dd></div>
            <div><dt>Arrivo</dt><dd>{confirmation.service} alle {confirmation.arrival_time.slice(0, 5)}</dd></div>
            <div><dt>Persone</dt><dd>{confirmation.party_size}</dd></div>
            <div><dt>Tavolo</dt><dd>{confirmation.table_name}</dd></div>
          </dl>
          <div className={styles.code}>Codice richiesta <strong>{confirmation.code}</strong></div>
          <p className={styles.privacy} role="status">Conserva questo codice. Il tavolo non è ancora confermato.{email.trim() ? ` Se la richiesta sarà accettata, proveremo a inviarti un'email a ${email.trim()}.` : " Non hai indicato un'email: contatta il ristorante per conoscere l'esito."}</p>
          <button className={styles.secondary} type="button" onClick={restart}>Nuova prenotazione</button>
        </div>}
      </section>
    </div>
    <footer className={styles.footer}><Link href="/">← Torna alla pagina iniziale</Link><span>Un tavolo, senza fretta.</span></footer>
  </main>;
}
