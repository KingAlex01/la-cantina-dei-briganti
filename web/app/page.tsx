import Image from "next/image";
import Link from "next/link";
import InviteRedirect from "./invite-redirect";
import WhatsAppFloatingButton from "./WhatsAppFloatingButton";
import { OPENING_HOURS } from "../lib/public-booking";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <InviteRedirect />
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.introScreen}>
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
          Ci vediamo a tavola.
          <br />
          <em>Senza fretta.</em>
        </h1>
        <div className={styles.divider} aria-hidden="true"><span /></div>
        <p className={styles.description}>
          Scegli data, orario e numero di persone. Al resto pensiamo noi:
          il tavolo resta vostro per tutto il servizio.
        </p>
        <Link href="/prenota" className={styles.bookingLink}>Prenota un tavolo <span aria-hidden="true">↗</span></Link>
        <p className={styles.bookingNote}>La richiesta sarà confermata dopo l’approvazione dello staff.</p>
        <Link href="/menu" className={styles.menuLink}>Scopri il menù <span aria-hidden="true">↗</span></Link>
      </section>
      </div>

      <section className={styles.story} aria-labelledby="story-title">
        <div className={styles.storyInner}>
          <div className={styles.storyImageWrap}>
            <Image src="/locale/sala.jpeg" alt="La sala della Cantina dei Briganti, con volte in pietra e tavoli apparecchiati" width={4032} height={3024} sizes="(max-width: 800px) 100vw, 54vw" className={styles.storyImage} />
          </div>
          <div className={styles.storyCopy}>
            <span className={styles.sectionKicker}>La nostra storia</span>
            <h2 id="story-title">Una cucina di famiglia, nel cuore di Mola.</h2>
            <p>Francesco e Vito Parente hanno aperto La Cantina dei Briganti nel giugno 2023, dopo anni di esperienza nelle cucine italiane e all’estero. Con loro lavora il fratello Luca.</p>
            <p>Vengono da una famiglia di origini contadine. Portano in tavola anche i prodotti coltivati dal padre, a chilometro zero, con cura e senza trattamenti. Il menù segue le stagioni e quello che il territorio offre.</p>
            <Link href="/menu" className={styles.storyLink}>Esplora il menù <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className={styles.gallery} aria-label="Altri scorci del locale">
          <Image src="/locale/tavoli-e-vini.jpeg" alt="Tavoli apparecchiati e selezione di vini lungo la parete in pietra" width={5712} height={4284} sizes="(max-width: 700px) 100vw, 40vw" />
          <Image src="/locale/volta-in-pietra.jpeg" alt="Volta in pietra e un angolo della sala" width={2268} height={4032} sizes="(max-width: 700px) 40vw, 22vw" />
          <Image src="/locale/dettaglio-sala.jpeg" alt="Dettaglio dell'illuminazione e degli arredi della Cantina" width={5712} height={4284} sizes="(max-width: 700px) 60vw, 40vw" />
        </div>
      </section>

      <section className={styles.visit} aria-labelledby="visit-title">
        <div className={styles.visitInner}>
          <div className={styles.visitDetails}>
            <span className={styles.sectionKicker}>Vieni a trovarci</span>
            <h2 id="visit-title">Ci trovi a Mola.<br /><em>Ti aspettiamo.</em></h2>
            <address>Vico Morgese 1<br />70042 Mola di Bari (BA)</address>
            <a className={styles.directionsLink} href="https://www.google.com/maps/search/?api=1&query=Vico%20Morgese%201%2C%2070042%20Mola%20di%20Bari" target="_blank" rel="noopener noreferrer">Come arrivare <span aria-hidden="true">↗</span></a>
            <a className={styles.phoneLink} href="tel:+393451680145">+39 345 168 0145</a>
            <div className={styles.socialLinks} aria-label="Profili social">
              <a href="https://www.instagram.com/la.cantinadeibriganti/" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
              <a href="https://www.facebook.com/lacantinadeibriganti2017" target="_blank" rel="noopener noreferrer">Facebook ↗</a>
            </div>
          </div>
          <div className={styles.hours}>
            <h3>Orari di apertura</h3>
            <dl>{OPENING_HOURS.map(({ day, hours }) => <div key={day}><dt>{day}</dt><dd>{hours}</dd></div>)}</dl>
            <p>Il menù cambia con le stagioni. Per gruppi di oltre 8 persone, contattaci direttamente.</p>
          </div>
        </div>
        <div className={styles.finalCta}>
          <p>Una sala, tante storie da raccontare.</p>
          <Link href="/prenota" className={styles.bookingLink}>Prenota un tavolo <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© La cantina dei briganti · Mola di Bari</span>
        <div className={styles.footerLinks}>
          <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
          <Link href="/staff" className={styles.footerLink}>Accesso staff <span aria-hidden="true">↗</span></Link>
        </div>
      </footer>
      <WhatsAppFloatingButton phoneNumber="+39 345 168 0145" side="right" />
    </main>
  );
}
