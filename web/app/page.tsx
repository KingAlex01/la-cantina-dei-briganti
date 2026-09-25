import Image from "next/image";
import Link from "next/link";
import InviteRedirect from "./invite-redirect";
import WhatsAppFloatingButton from "./WhatsAppFloatingButton";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={`${styles.page} ${styles.withWhatsApp}`}>
      <InviteRedirect />
      <div className={styles.grain} aria-hidden="true" />
      <header className={styles.header}>
        <span className={styles.headerLine} aria-hidden="true" />
        <Image
          className={styles.logo}
          src="/logo-cantina.svg"
          alt="La cantina dei briganti"
          width={270}
          height={200}
          priority
        />
        <span className={styles.headerLine} aria-hidden="true" />
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowMark} aria-hidden="true">✦</span>
          Mola di Bari · La cantina dei briganti
          <span className={styles.eyebrowMark} aria-hidden="true">✦</span>
        </div>
        <h1 id="hero-title" className={styles.title}>
          Il tavolo è tuo.
          <br />
          <em>Il tempo anche.</em>
        </h1>
        <div className={styles.divider} aria-hidden="true"><span /></div>
        <p className={styles.description}>
          Un tavolo per tutto il servizio, senza fretta. Scegli data, orario e
          numero di persone: al resto pensiamo noi.
        </p>
        <Link href="/prenota" className={styles.bookingLink}>Prenota un tavolo <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className={styles.footer}>
        <span>Una sala, tante storie da raccontare.</span>
        <div className={styles.footerLinks}>
          <Link href="/privacy" className={styles.staffLink}>Privacy</Link>
          <Link href="/staff" className={styles.staffLink}>Accesso staff <span aria-hidden="true">↗</span></Link>
        </div>
      </footer>
      <WhatsAppFloatingButton phoneNumber="+39 345 168 0145" />
    </main>
  );
}
