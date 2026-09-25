"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInRome } from "../../lib/staff/types";
import { MESSAGE_TEMPLATES, renderMessageTemplate } from "../../lib/notifications/templates";
import type { MessageTemplateKey } from "../../lib/notifications/templates";
import styles from "./notifications.module.css";

type Notification = {
  id: string;
  channel: "email" | "sms";
  kind: "richiesta" | "conferma" | "promemoria" | "annullamento";
  recipient: string;
  subject: string | null;
  body: string;
  status: "in_attesa" | "inviata" | "fallita";
  created_at: string;
};

const fields: { key: MessageTemplateKey; label: string; hint: string; maxLength: number }[] = [
  { key: "confirmEmailSubject", label: "Oggetto della conferma email", hint: "Inviata al cliente che indica un'email.", maxLength: 200 },
  { key: "confirmEmailBody", label: "Testo della conferma email", hint: "Inviata al cliente che indica un'email.", maxLength: 5000 },
  { key: "reminderText", label: "Promemoria da copiare", hint: "Lo staff lo copia e lo invia manualmente.", maxLength: 5000 },
];

const sample = {
  name: "Giulia Bianchi", date: todayInRome(), arrival_time: "20:00",
  party_size: 4, code: "AB12CD",
};

export default function NotificationsPanel({ client }: { client: SupabaseClient }) {
  const [draft, setDraft] = useState<Record<MessageTemplateKey, string>>({ ...MESSAGE_TEMPLATES });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [templateResult, notificationResult] = await Promise.all([
      client.from("message_templates").select("key,content").in("key", fields.map((field) => field.key)),
      client.from("notifications").select("id,channel,kind,recipient,subject,body,status,created_at")
        .order("created_at", { ascending: false }).limit(60),
    ]);
    if (templateResult.error || notificationResult.error) {
      setError("Non riesco a caricare le notifiche. Riprova.");
    } else {
      setDraft({ ...MESSAGE_TEMPLATES, ...Object.fromEntries((templateResult.data ?? []).map(({ key, content }) => [key, content])) });
      setNotifications((notificationResult.data ?? []) as Notification[]);
      setError("");
    }
    setLoading(false);
  }, [client]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save() {
    if (fields.some(({ key }) => !draft[key].trim())) {
      setError("I modelli non possono essere vuoti.");
      return;
    }
    setSaving(true); setError(""); setNotice("");
    const { error: saveError } = await client.from("message_templates").upsert(
      fields.map(({ key }) => ({ key, content: draft[key].trim(), updated_at: new Date().toISOString() })),
      { onConflict: "key" },
    );
    setSaving(false);
    if (saveError) setError("Non riesco a salvare i modelli. Riprova.");
    else setNotice("Modelli salvati. Le prossime conferme useranno il nuovo testo.");
  }

  return <>
    <div className={styles.heading}><div><span className={styles.kicker}>Comunicazioni</span><h1>Notifiche</h1>
      <p>Qui trovi le email inviate e prepari i testi delle prossime conferme.</p></div>
      <button type="button" className={styles.secondaryButton} onClick={() => void load()} disabled={loading}>Aggiorna registro</button>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.grid}>
      <section className={styles.panel} aria-labelledby="template-title">
        <h2 id="template-title">Modelli dei messaggi</h2>
        <p>Segnaposto: <code>{"{nome}"}</code> <code>{"{data}"}</code> <code>{"{ora}"}</code> <code>{"{persone}"}</code> <code>{"{codice}"}</code> <code>{"{ristorante}"}</code></p>
        {fields.map(({ key, label, hint, maxLength }) => <label className={styles.field} key={key}>{label}
          <small>{hint}</small>
          {key === "confirmEmailSubject"
            ? <input value={draft[key]} maxLength={maxLength} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />
            : <textarea value={draft[key]} rows={key === "confirmEmailBody" ? 9 : 4} maxLength={maxLength} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />}
          <span className={styles.previewLabel}>Anteprima</span>
          <span className={styles.preview}>{renderMessageTemplate(draft[key], sample)}</span>
        </label>)}
        <div className={styles.actions}><button type="button" className={styles.secondaryButton} onClick={() => setDraft({ ...MESSAGE_TEMPLATES })}>Ripristina testi iniziali</button>
          <button type="button" className={styles.primaryButton} onClick={() => void save()} disabled={saving || loading}>{saving ? "Salvataggio…" : "Salva modelli"}</button></div>
        <p className={styles.explanation}>Il ripristino cambia solo la bozza: premi “Salva modelli” per renderlo effettivo. SMS e WhatsApp automatici non sono attivi.</p>
      </section>
      <section className={styles.panel} aria-labelledby="log-title">
        <h2 id="log-title">Registro invii</h2>
        <p>Ultimi 60 tentativi di invio. “Inviata” indica che il servizio email ha accettato il messaggio; la consegna finale dipende dalla casella del destinatario.</p>
        {loading ? <p>Caricamento…</p> : notifications.length ? <div className={styles.log}>
          {notifications.map((item) => <article key={item.id} className={styles.logItem}>
            <div className={styles.logTop}><strong>{item.channel === "email" ? "Email" : "SMS"} · {item.kind}</strong>
              <span className={item.status === "fallita" ? styles.failed : item.status === "inviata" ? styles.sent : styles.pending}>{item.status === "in_attesa" ? "In attesa" : item.status === "inviata" ? "Inviata" : "Fallita"}</span></div>
            <p>A: {item.recipient} · {new Date(item.created_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</p>
            {item.subject && <p>Oggetto: {item.subject}</p>}
            <details><summary>Mostra testo</summary><pre>{item.body}</pre></details>
          </article>)}
        </div> : <p>Nessuna email registrata. I messaggi WhatsApp e i promemoria copiati manualmente non compaiono qui.</p>}
      </section>
    </div>
  </>;
}
