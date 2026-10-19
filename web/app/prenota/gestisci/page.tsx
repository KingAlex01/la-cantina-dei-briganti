"use client";

import Image from "next/image";
import Link from "next/link";
import LegalFooter from "../../LegalFooter";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { addDays, availableArrivalTimes, currentTimeInRome, dateLabel, todayInRome, validDate, type Service } from "../../../lib/public-booking";
import { bookingCopy } from "../../../lib/i18n/booking";
import { manageBookingCopy, manageBookingError, type ManageBookingError } from "../../../lib/i18n/manage-booking";
import { useLanguage } from "../../LanguageProvider";
import LanguageSelector from "../../LanguageSelector";
import BookingContacts from "../BookingContacts";
import base from "../prenota.module.css";
import styles from "./gestisci.module.css";

type ManagedBooking = {
  code: string; name: string; date: string; service: Service; arrival_time: string; party_size: number;
  status: "in_attesa" | "confermata" | "annullata" | "arrivato" | "no-show";
  notes: string | null; version: string; manageable?: boolean; replaced?: boolean;
};
type Mode = "view" | "edit" | "review" | "notes" | "cancel";
type Notice = "savedNotes" | "savedCancel" | "savedReplace" | "recoveredReplacement" | "";

function normalizeCode(value: string) { return value.replace(/[\s-]/g, "").toUpperCase(); }

function parseBooking(value: unknown): ManagedBooking | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.code !== "string" || typeof item.name !== "string" || typeof item.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(Date.parse(`${item.date}T12:00:00Z`)) ||
      (item.service !== "pranzo" && item.service !== "cena") || typeof item.arrival_time !== "string" ||
      !/^\d{2}:\d{2}/.test(item.arrival_time) || !Number.isInteger(item.party_size) ||
      typeof item.status !== "string" || !["in_attesa", "confermata", "annullata", "arrivato", "no-show"].includes(item.status) ||
      (item.notes !== null && typeof item.notes !== "string") || typeof item.version !== "string") return null;
  return item as ManagedBooking;
}

export default function ManageBookingPage() {
  const { language } = useLanguage();
  const t = manageBookingCopy[language];
  const b = bookingCopy[language];
  const [code, setCode] = useState("");
  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const requestPending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState<ManageBookingError | "">("");
  const [notice, setNotice] = useState<Notice>("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [previousCode, setPreviousCode] = useState("");
  const [date, setDate] = useState(todayInRome);
  const [service, setService] = useState<Service>("cena");
  const [time, setTime] = useState("");
  const [party, setParty] = useState(2);
  const [notes, setNotes] = useState("");
  const [notesConsent, setNotesConsent] = useState(false);
  const [clock, setClock] = useState(() => `${todayInRome()} ${currentTimeInRome()}`);
  const today = clock.slice(0, 10);
  const now = clock.slice(11);
  // The server checks closures and capacity. Including every service here also
  // permits exceptional openings without treating the existing table as occupied.
  const times = availableArrivalTimes(date, service, today, now, true);
  const futureArrival = booking && (booking.date > today || (booking.date === today && booking.arrival_time.slice(0, 5) > now));
  const manageable = Boolean(booking && futureArrival && booking.manageable !== false && !booking.replaced &&
    ["in_attesa", "confermata"].includes(booking.status));

  useEffect(() => {
    const timer = window.setInterval(() => setClock(`${todayInRome()} ${currentTimeInRome()}`), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (booking) heading.current?.focus();
  }, [booking, mode]);

  function openMode(next: Mode) {
    if (busy) return;
    setError("");
    setNotice("");
    if (booking && next === "edit") {
      setDate(booking.date); setService(booking.service); setTime(booking.arrival_time.slice(0, 5)); setParty(booking.party_size);
    }
    if (booking && next === "notes") { setNotes(booking.notes ?? ""); setNotesConsent(false); }
    setMode(next);
  }

  async function request(action: "lookup" | "cancel" | "notes" | "replace") {
    if (requestPending.current || (action !== "lookup" && (!manageable || needsRefresh))) return;
    const lookupCode = normalizeCode(action === "lookup" ? (booking?.code ?? code) : booking!.code);
    if (!/^(?:[A-Z0-9]{6}|[A-F0-9]{16})$/.test(lookupCode)) { setError("invalid"); return; }
    if (action === "notes" && notes.trim() && !notesConsent) { setError("notes_consent"); return; }
    if (action === "replace" && (!validDate(date) || !availableArrivalTimes(date, service, todayInRome(), currentTimeInRome(), true).includes(time))) {
      setError("invalid_date"); setMode("edit"); return;
    }
    requestPending.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/public/reservations/manage", {
        method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, code: lookupCode, ...(action !== "lookup" ? { version: booking!.version } : {}),
          ...(action === "notes" ? { notes, notesConsent } : {}), ...(action === "replace" ? { date, service, time, party } : {}) }),
      });
      if (response.status === 429) { setError("too_many"); return; }
      const result = await response.json();
      if (!response.ok) {
        const parsedKey = manageBookingError(result.error, action === "lookup" ? "lookup_failed" : "failed");
        const key = action === "lookup" && parsedKey === "failed" ? "lookup_failed" : parsedKey;
        setError(key);
        if (action !== "lookup" && ["conflict", "failed", "past"].includes(key)) setNeedsRefresh(true);
        return;
      }
      const updated = parseBooking(result.booking);
      if (!updated) throw new Error("Invalid booking response");
      setBooking(updated); setCode(updated.code); setMode("view"); setNeedsRefresh(false);
      const recovered = action === "lookup" && normalizeCode(updated.code) !== lookupCode;
      setPreviousCode(action === "replace" ? (typeof result.previous_code === "string" ? result.previous_code : lookupCode) : recovered ? lookupCode : "");
      setNotice(action === "notes" ? "savedNotes" : action === "cancel" ? "savedCancel" : action === "replace" ? "savedReplace" : recovered ? "recoveredReplacement" : "");
    } catch {
      setError(action === "lookup" ? "lookup_failed" : "failed");
      if (action !== "lookup") setNeedsRefresh(true);
    } finally { requestPending.current = false; setBusy(false); }
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!booking) return;
    if (!validDate(date) || !times.includes(time)) { setError("invalid_date"); return; }
    if (booking.date === date && booking.service === service && booking.arrival_time.slice(0, 5) === time && booking.party_size === party) {
      setError("no_changes"); return;
    }
    setError(""); setMode("review");
  }

  function details(value: { date: string; service: Service; arrival_time: string; party_size: number }) {
    return <dl className={base.details}>
      <div><dt>{b.date}</dt><dd>{dateLabel(value.date, language)}</dd></div>
      <div><dt>{b.arrival}</dt><dd>{value.service === "pranzo" ? b.lunch : b.dinner} {b.at} {value.arrival_time.slice(0, 5)}</dd></div>
      <div><dt>{b.people}</dt><dd>{value.party_size}</dd></div>
    </dl>;
  }

  const status = booking ? ({ in_attesa: t.pending, confermata: t.confirmed, annullata: t.cancelled, arrivato: t.arrived, "no-show": t.noShow })[booking.status] : "";
  const statusHelp = booking?.status === "annullata" ? t.cancelledHelp : !manageable ? t.contactHelp : booking?.status === "in_attesa" ? t.pendingHelp : t.confirmedHelp;
  const title = !booking ? t.lookupTitle : mode === "edit" ? t.editTitle : mode === "review" ? t.reviewTitle : mode === "notes" ? t.notesTitle : mode === "cancel" ? t.cancelTitle : t.summary;

  return <main className={base.page} lang={language}>
    <header className={base.header}>
      <Link href="/" aria-label={b.home}><Image src="/logo-cantina.svg" alt="La cantina dei briganti" width={180} height={135} className={base.logo} priority /></Link>
      <div className={base.headerActions}><span className={base.headerCaption}>{t.header}</span><LanguageSelector tone="light" /></div>
    </header>
    <div className={base.layout}>
      <aside className={base.intro}>
        <span className={base.kicker}>La cantina dei briganti · Mola di Bari</span>
        <h1>{t.title} <em>{t.titleEmphasis}</em></h1><p>{t.intro}</p>
        <div className={base.decor} aria-hidden="true">✳</div>
      </aside>
      <section className={`${base.card} ${styles.card}`} aria-label={t.header} aria-busy={busy}>
        <h2 className={styles.heading} ref={heading} tabIndex={-1}>{title}</h2>
        {error && <p className={base.error} role="alert">{t.errors[error]}</p>}
        {notice && <p className={styles.success} role="status">{t[notice]}</p>}
        {!booking ? <form noValidate onSubmit={(event) => { event.preventDefault(); void request("lookup"); }}>
          <label className={base.field}>{t.code}
            <input className={styles.codeInput} type="text" value={code} maxLength={64} autoComplete="off" autoCapitalize="characters" spellCheck={false}
              aria-describedby="code-hint code-private" aria-invalid={Boolean(error === "invalid" || error === "not_found")}
              onChange={(event) => { setCode(event.target.value); setError(""); }} required />
          </label>
          <p id="code-hint" className={base.hint}>{t.codeHint}</p>
          <p id="code-private" className={base.note}>{t.codePrivate}</p>
          <div className={base.actions}><button className={base.primary} disabled={busy} type="submit">{busy ? t.looking : t.lookup}</button></div>
        </form> : <>
          {mode === "view" && <>
            <p className={styles.name}>{booking.name}</p>
            <div className={`${styles.status} ${booking.status === "annullata" ? styles.cancelled : booking.status === "confermata" ? styles.confirmed : ""}`}>
              <span>{t.status}</span><strong>{status}</strong>
            </div>
            <p className={base.note}>{statusHelp}</p>
            {details(booking)}
            <div className={`${base.code} ${styles.code}`}><span>{previousCode ? t.newCode : t.code}</span><strong>{booking.code}</strong></div>
            {previousCode && <><p className={base.hint}>{t.previousCode}: <s>{previousCode}</s></p><p className={styles.important}>{t.keepNewCode}</p></>}
            <p className={base.hint}>{t.codePrivate}</p>
            <div className={styles.notes}><h3>{b.notes}</h3><p>{booking.notes || t.noNotes}</p></div>
            {manageable && <div className={styles.manageActions}>
              <button type="button" className={base.primary} disabled={busy || needsRefresh} onClick={() => openMode("edit")}>{t.edit}</button>
              <button type="button" className={base.secondary} disabled={busy || needsRefresh} onClick={() => openMode("notes")}>{t.notesEdit}</button>
              <button type="button" className={styles.cancelLink} disabled={busy || needsRefresh} onClick={() => openMode("cancel")}>{t.cancel}</button>
            </div>}
          </>}
          {mode === "edit" && <form noValidate onSubmit={review}>
            <p className={base.note}>{t.replaceHelp}</p>
            <fieldset className={styles.fields} disabled={busy || needsRefresh || !manageable}>
              <label className={base.field}>{b.date}<input type="date" value={date} min={today} max={addDays(today, 60)} required
                onChange={(event) => { setDate(event.target.value); setTime(""); setError(""); }} /></label>
              <div className={styles.row}>
                <label className={base.field}>{b.service}<select value={service} onChange={(event) => { setService(event.target.value as Service); setTime(""); setError(""); }}><option value="pranzo">{b.lunch}</option><option value="cena">{b.dinner}</option></select></label>
                <label className={base.field}>{b.arrival}<select value={time} required onChange={(event) => { setTime(event.target.value); setError(""); }}><option value="">—</option>{times.map((slot) => <option key={slot}>{slot}</option>)}</select></label>
              </div>
              <label className={base.field}>{b.people}<select value={party} onChange={(event) => { setParty(Number(event.target.value)); setError(""); }}>{Array.from({ length: 8 }, (_, index) => index + 1).map((count) => <option value={count} key={count}>{count} {count === 1 ? b.person : b.persons}</option>)}</select></label>
            </fieldset>
            <p className={base.hint}>{t.availabilityHelp}</p>
            <div className={base.actions}><button className={base.secondary} type="button" disabled={busy} onClick={() => openMode("view")}>{t.back}</button><button className={base.primary} type="submit" disabled={busy || needsRefresh || !manageable}>{t.review}</button></div>
          </form>}
          {mode === "review" && <>
            <p className={base.note}>{t.reviewHelp}</p><h3 className={styles.subheading}>{t.replacement}</h3>
            {details({ date, service, arrival_time: time, party_size: party })}
            <div className={base.actions}><button className={base.secondary} type="button" disabled={busy} onClick={() => { setError(""); setMode("edit"); }}>{t.editAgain}</button><button className={base.primary} type="button" disabled={busy || needsRefresh || !manageable} onClick={() => void request("replace")}>{busy ? t.saving : t.replaceConfirm}</button></div>
          </>}
          {mode === "notes" && <form noValidate onSubmit={(event) => { event.preventDefault(); void request("notes"); }}>
            <p className={base.note}>{t.notesHelp}</p>
            <fieldset className={styles.fields} disabled={busy || needsRefresh || !manageable}>
              <label className={base.field}>{b.notes} <span className={base.optional}>{b.notesOptional}</span><textarea rows={5} value={notes} maxLength={1000} placeholder={b.notesPlaceholder} onChange={(event) => { setNotes(event.target.value); setError(""); }} /></label>
              {notes.trim() && <label className={base.checkbox}><input type="checkbox" checked={notesConsent} onChange={(event) => setNotesConsent(event.target.checked)} /><span>{b.notesConsent}</span></label>}
            </fieldset>
            <p className={base.privacy}><Link href="/privacy">{b.privacyLink}</Link></p>
            <div className={base.actions}><button className={base.secondary} type="button" disabled={busy} onClick={() => openMode("view")}>{t.back}</button><button className={base.primary} type="submit" disabled={busy || needsRefresh || !manageable || notes.trim() === (booking.notes ?? "").trim()}>{busy ? t.saving : t.saveNotes}</button></div>
          </form>}
          {mode === "cancel" && <>
            {details(booking)}<p className={base.note}>{t.cancelHelp}</p>
            <div className={base.actions}><button className={base.secondary} type="button" disabled={busy} onClick={() => openMode("view")}>{t.keep}</button><button className={styles.danger} type="button" disabled={busy || needsRefresh || !manageable} onClick={() => void request("cancel")}>{busy ? t.saving : t.cancelConfirm}</button></div>
          </>}
          {needsRefresh && <div className={styles.refresh}>
            <p>{t.refreshHelp}</p><button type="button" className={base.secondary} disabled={busy} onClick={() => void request("lookup")}>{busy ? t.looking : t.refresh}</button>
          </div>}
          {!manageable && booking.status !== "annullata" && mode !== "view" && <p className={base.note} role="status">{t.contactHelp}</p>}
        </>}
        <aside className={base.bookingHelp} aria-label={b.help}>
          <BookingContacts />
          <div className={styles.footerLinks}>
            {booking && <button type="button" disabled={busy} onClick={() => { setBooking(null); setCode(""); setError(""); setNotice(""); setNeedsRefresh(false); setMode("view"); setPreviousCode(""); }}>{t.another}</button>}
            <Link href="/prenota">{t.newBooking}</Link>
          </div>
        </aside>
      </section>
    </div>
    <LegalFooter className={base.footer}><Link href="/">← {b.home}</Link><span>{b.footer}</span></LegalFooter>
  </main>;
}
