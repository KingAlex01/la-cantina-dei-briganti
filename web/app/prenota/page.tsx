"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  addDays, availableArrivalTimes, bookableServices, currentTimeInRome, dateLabel, isServiceOpenOnDate, parsePublicAvailability, serviceAvailabilityState, todayInRome, validDate,
} from "../../lib/public-booking";
import type { PublicAvailability, BookingConfirmation, Service } from "../../lib/public-booking";
import styles from "./prenota.module.css";
import BookingContacts from "./BookingContacts";
import { bookingCopy, bookingErrorKey } from "../../lib/i18n/booking";
import type { BookingErrorKey } from "../../lib/i18n/booking";
import { useLanguage } from "../LanguageProvider";
import LanguageSelector from "../LanguageSelector";

const emptyAvailability: PublicAvailability = { pranzo: false, cena: false, blocked: { pranzo: false, cena: false } };

export default function BookingPage() {
  const { language } = useLanguage();
  const t = bookingCopy[language];
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
  const [availability, setAvailability] = useState<PublicAvailability | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<BookingErrorKey | "">("");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [now, setNow] = useState(currentTimeInRome);
  const today = todayInRome();
  const visibleTimes = availableArrivalTimes(date, service, today, now);
  const bookableAvailability = bookableServices(date, availability ?? emptyAvailability, today, now);
  const closedDate = !isServiceOpenOnDate(date, "pranzo") && !isServiceOpenOnDate(date, "cena");
  const dateUnavailableError = !validDate(date) ? "" : closedDate
    ? "closedDate"
    : !availableArrivalTimes(date, "pranzo", today, now).length && !availableArrivalTimes(date, "cena", today, now).length
      ? "endedToday"
      : "";
  const dateUnavailableMessage = dateUnavailableError ? t.errors[dateUnavailableError] : "";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(currentTimeInRome()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  function serviceStatus(item: Service) {
    return t[serviceAvailabilityState(date, item, availability, checking, today, now)];
  }

  useEffect(() => {
    if (step !== 2 || !validDate(date)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setChecking(true);
      try {
        const params = new URLSearchParams({ date, party: String(party) });
        const response = await fetch(`/api/public/availability?${params}`, {
          cache: "no-store", signal: controller.signal,
        });
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setAvailability(null);
          setError(bookingErrorKey(result.error, "availabilityFailed"));
          return;
        }
        const checkedAvailability = parsePublicAvailability(result);
        if (!checkedAvailability) throw new Error("Disponibilità non valida");
        setAvailability(checkedAvailability);
      } catch {
        if (!controller.signal.aborted) {
          setAvailability(null);
          setError("availabilityFailed");
        }
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, 100);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [step, date, party]);

  function goToServices() {
    if (!validDate(date)) { setError("invalidDate"); return; }
    if (dateUnavailableError) { setError(dateUnavailableError); return; }
    setTime("");
    if (!availableArrivalTimes(date, service).length) {
      setService(availableArrivalTimes(date, "cena").length ? "cena" : "pranzo");
    }
    setAvailability(null);
    setChecking(true);
    setError("");
    setStep(2);
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!validDate(date) || !availableArrivalTimes(date, service).includes(time)) {
      setStep(1);
      setTime("");
      setAvailability(null);
      setError("noLongerBookable");
      return;
    }
    if (notes.trim() && !notesConsent) {
      setError("notesConsent");
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
        setError("tooMany");
        return;
      }
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          setAvailability(null);
          setChecking(true);
          setStep(2);
          setTime("");
        }
        setError(bookingErrorKey(result.error, "bookingFailed"));
        return;
      }
      setConfirmation(result as BookingConfirmation);
      setStep(4);
    } catch {
      setError("bookingFailed");
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
    setAvailability(null);
    setError("");
  }

  return <main className={styles.page} lang={language}>
    <header className={styles.header}>
      <Link href="/" aria-label={t.home}>
        <Image src="/logo-cantina.svg" alt="La cantina dei briganti" width={180} height={135} className={styles.logo} priority />
      </Link>
      <div className={styles.headerActions}>
        <span className={styles.headerCaption}>{t.header}</span>
        <LanguageSelector tone="light" />
      </div>
    </header>

    <div className={styles.layout}>
      <aside className={styles.intro}>
        <span className={styles.kicker}>La cantina dei briganti · Mola di Bari</span>
        <h1>{t.title} <em>{t.titleEmphasis}</em></h1>
        <p>{t.intro}</p>
        <div className={styles.decor} aria-hidden="true">✳</div>
      </aside>

      <section className={styles.card} aria-label={t.booking}>
        {step < 4 && <div className={styles.progress} aria-label={t.progress(step)}>
          {[1, 2, 3].map((number) => <span key={number} className={number <= step ? styles.progressOn : ""} />)}
        </div>}

        {step === 1 && <>
          <div className={styles.stepHead}><h2>{t.when}</h2><span>{t.step(1)}</span></div>
          {error && <p className={styles.error} role="alert">{t.errors[error]}</p>}
          <label className={styles.field}>{t.date}
            <input type="date" value={date} min={todayInRome()} max={addDays(todayInRome(), 60)}
              aria-describedby={dateUnavailableMessage ? "date-availability" : undefined}
              onChange={(event) => { setDate(event.target.value); setTime(""); setAvailability(null); setError(""); }} required />
          </label>
          {dateUnavailableMessage && <p id="date-availability" className={styles.note} role="status">{dateUnavailableMessage}</p>}
          <div className={styles.field}><span>{t.people}</span>
            <div className={styles.stepper}>
              <button type="button" onClick={() => setParty(Math.max(1, party - 1))} aria-label={t.fewer}>−</button>
              <strong>{party} {party === 1 ? t.person : t.persons}</strong>
              <button type="button" onClick={() => setParty(Math.min(8, party + 1))} aria-label={t.more}>+</button>
            </div>
          </div>
          <p className={styles.hint}>{t.groupHint}</p>
          <div className={styles.actions}><button className={styles.primary} type="button" disabled={Boolean(dateUnavailableMessage)} onClick={goToServices}>{t.chooseService} <span aria-hidden="true">→</span></button></div>
        </>}

        {step === 2 && <>
          <div className={styles.stepHead}><h2>{t.lunchOrDinner}</h2><span>{t.step(2)}</span></div>
          <p className={styles.summary}>{dateLabel(date, language)} · {party} {party === 1 ? t.person : t.persons}</p>
          {error && <p className={styles.error} role="alert">{t.errors[error]}</p>}
          <div className={styles.field}><span>{t.service}</span>
            <div className={styles.services}>
              {(["pranzo", "cena"] as Service[]).map((item) => <button key={item} type="button"
                className={service === item ? styles.selected : ""}
                disabled={checking || !bookableAvailability[item]}
                onClick={() => { setService(item); setTime(""); setError(""); }}>
                <strong>{item === "pranzo" ? t.lunch : t.dinner}</strong>
                <small>{serviceStatus(item)}</small>
              </button>)}
            </div>
          </div>
          {!checking && availability && !bookableAvailability.pranzo && !bookableAvailability.cena && !error &&
            <p className={styles.error}>{dateUnavailableMessage || t.noAvailability(party)}</p>}
          {!checking && bookableAvailability[service] && <div className={styles.field}><span>{t.arrivalQuestion}</span>
            <div className={styles.times}>{visibleTimes.map((slot) => <button key={slot} type="button"
              className={time === slot ? styles.selected : ""} onClick={() => setTime(slot)}>{slot}</button>)}</div>
          </div>}
          <p className={styles.note}>{t.arrivalNote}</p>
          <div className={styles.actions}>
            <button className={styles.secondary} type="button" onClick={() => { setStep(1); setError(""); }}>{t.back}</button>
            <button className={styles.primary} type="button" disabled={!bookableAvailability[service] || !visibleTimes.includes(time) || checking}
              onClick={() => {
                if (!availableArrivalTimes(date, service).includes(time)) { setTime(""); setError("pastTime"); return; }
                setStep(3); setError("");
              }}>{t.enterDetails} <span aria-hidden="true">→</span></button>
          </div>
        </>}

        {step === 3 && <form onSubmit={confirm} aria-busy={busy}
          onInvalid={(event) => {
            const input = event.target as HTMLInputElement;
            input.setCustomValidity(input.type === "checkbox" ? t.errors.notesConsent
              : input.validity.typeMismatch ? t.errors.invalidEmail : t.errors.required);
          }}
          onInput={(event) => (event.target as HTMLInputElement).setCustomValidity("")}>
          <div className={styles.stepHead}><h2>{t.whoseName}</h2><span>{t.step(3)}</span></div>
          <p className={styles.summary}>{dateLabel(date, language)} · {service === "pranzo" ? t.lunch : t.dinner} {t.at} {time} · {party} {party === 1 ? t.person : t.persons}</p>
          {error && <p className={styles.error} role="alert">{t.errors[error]}</p>}
          <label className={styles.field}>{t.name}
            <input type="text" autoComplete="name" value={name} maxLength={120} required placeholder="Giulia Bianchi"
              onChange={(event) => setName(event.target.value)} />
          </label>
          <div className={styles.formRow}>
            <label className={styles.field}>{t.phone}
              <input type="tel" autoComplete="tel" value={phone} maxLength={30} required placeholder="+39 333 123 4567" aria-describedby="phone-hint"
                onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label className={styles.field}>{t.email} <span className={styles.optional}>{t.optional}</span>
              <input type="email" autoComplete="email" value={email} maxLength={254} placeholder="hello@example.com"
                onChange={(event) => setEmail(event.target.value)} />
            </label>
          </div>
          <p className={styles.hint} id="phone-hint">{t.phoneHint}</p>
          <label className={styles.field}>{t.notes} <span className={styles.optional}>{t.notesOptional}</span>
            <textarea value={notes} maxLength={1000} rows={3} placeholder={t.notesPlaceholder}
              onChange={(event) => setNotes(event.target.value)} />
          </label>
          {notes.trim() && <label className={styles.checkbox}>
            <input type="checkbox" checked={notesConsent} required onChange={(event) => setNotesConsent(event.target.checked)} />
            <span>{t.notesConsent}</span>
          </label>}
          <p className={styles.privacy}>{t.privacy} <Link href="/privacy">{t.privacyLink}</Link></p>
          <div className={styles.actions}>
            <button className={styles.secondary} type="button" onClick={() => { setAvailability(null); setChecking(true); setStep(2); setError(""); }}>{t.back}</button>
            <button className={styles.primary} type="submit" disabled={busy}>{busy ? t.sending : t.send}</button>
          </div>
        </form>}

        {step === 4 && confirmation && <div className={styles.confirmed}>
          <span className={styles.check} aria-hidden="true">✓</span>
          <span className={styles.kicker}>{t.sent}</span>
          <h2>{t.pending}</h2>
          <p>{t.thanks(confirmation.name.split(" ")[0])}</p>
          <dl className={styles.details}>
            <div><dt>{t.date}</dt><dd>{dateLabel(confirmation.date, language)}</dd></div>
            <div><dt>{t.arrival}</dt><dd>{confirmation.service === "pranzo" ? t.lunch : t.dinner} {t.at} {confirmation.arrival_time.slice(0, 5)}</dd></div>
            <div><dt>{t.people}</dt><dd>{confirmation.party_size}</dd></div>
          </dl>
          <div className={styles.code}>{t.requestCode} <strong>{confirmation.code}</strong></div>
          <p className={styles.privacy} role="status">{t.keepCode} {email.trim() ? t.confirmationEmail(email.trim()) : t.confirmationPhone}</p>
          <p className={styles.note}>{t.responseNote}</p>
          <BookingContacts code={confirmation.code} />
          <button className={styles.secondary} type="button" onClick={restart}>{t.newBooking}</button>
        </div>}
        {step < 4 && <aside className={styles.bookingHelp} aria-label={t.help}>
          <p>{t.approvalNote} {t.responseNote}</p>
          <BookingContacts />
        </aside>}
      </section>
    </div>
    <footer className={styles.footer}><Link href="/">← {t.home}</Link><span>{t.footer}</span></footer>
  </main>;
}
