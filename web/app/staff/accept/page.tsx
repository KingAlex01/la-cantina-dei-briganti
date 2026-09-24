"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createSupabaseClient } from "../../../lib/supabase/client";
import styles from "../staff.module.css";

export default function AcceptInvitePage() {
  const router = useRouter();
  const client = useMemo(() => createSupabaseClient(), []);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function prepare() {
      const url = new URL(window.location.href);
      const tokenHash = url.searchParams.get("token_hash");
      const code = url.searchParams.get("code");
      let authError: string | undefined;
      const linkType = url.searchParams.get("type");
      if (tokenHash && (linkType === "invite" || linkType === "recovery")) {
        const result = await client.auth.verifyOtp({ token_hash: tokenHash, type: linkType });
        authError = result.error?.message;
      } else if (code) {
        const result = await client.auth.exchangeCodeForSession(code);
        authError = result.error?.message;
      }
      const { data } = await client.auth.getSession();
      if (!active) return;
      if (data.session) {
        window.history.replaceState(null, "", "/staff/accept");
        setReady(true);
      } else {
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        setError(authError || fragment.get("error_description") || "Il link non è valido o è scaduto. Chiedi un nuovo link.");
      }
    }
    void prepare();
    return () => { active = false; };
  }, [client]);

  async function setNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== repeat) { setError("Le due password non coincidono."); return; }
    setBusy(true); setError("");
    const { error: updateError } = await client.auth.updateUser({ password });
    setBusy(false);
    if (updateError) setError(updateError.message);
    else router.replace("/staff");
  }

  return <main className={styles.authPage}><div className={styles.authCard}>
    <Link href="/" className={styles.backLink}>← Torna alla pagina iniziale</Link>
    <Image src="/logo-cantina.svg" alt="La cantina dei briganti" width={190} height={141} className={styles.authLogo} />
    <span className={styles.kicker}>Accesso staff</span>
    <h1>La tua password.</h1>
    {ready ? <>
      <p>Scegli una password personale per entrare nell’area staff. Non condividerla con nessuno.</p>
      <form className={styles.authForm} onSubmit={setNewPassword}>
        <label className={styles.field}>Nuova password<input type="password" minLength={10} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <label className={styles.field}>Ripeti la password<input type="password" minLength={10} required autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} /></label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" disabled={busy} className={styles.primaryButton}>{busy ? "Salvataggio…" : "Salva password e accedi"}</button>
      </form>
    </> : error ? <><p className={styles.error} role="alert">{error}</p><Link href="/staff" className={styles.secondaryButton}>Vai all’accesso staff</Link></> : <p>Verifica dell’invito in corso…</p>}
  </div></main>;
}
