import Image from "next/image";
import Link from "next/link";
import LegalFooter from "./LegalFooter";
import InviteRedirect from "./invite-redirect";
import LanguageSelector from "./LanguageSelector";
import WhatsAppFloatingButton from "./WhatsAppFloatingButton";
import { OPENING_HOURS } from "../lib/public-booking";
import { RESTAURANT, restaurantStructuredData } from "../lib/restaurant";
import { homeContent } from "../lib/i18n/home";
import { getRequestLanguage } from "../lib/i18n/server";
import { pageMetadata } from "../lib/site-metadata";
import styles from "./page.module.css";

export async function generateMetadata() {
  const language = await getRequestLanguage();
  const content = homeContent[language];
  return pageMetadata("/", content.metadataTitle, content.metadataDescription, language);
}

export default async function Home() {
  const language = await getRequestLanguage();
  const content = homeContent[language];
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantStructuredData).replace(/</g, "\\u003c") }} />
      <InviteRedirect />
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.introScreen}>
      <div className={styles.languageBar}><LanguageSelector tone="dark" /></div>
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
          {content.title}
          <br />
          <em>{content.titleEmphasis}</em>
        </h1>
        <div className={styles.divider} aria-hidden="true"><span /></div>
        <p className={styles.description}>
          {content.description}
        </p>
        <Link href="/prenota" className={styles.bookingLink}>{content.bookTable} <span aria-hidden="true">↗</span></Link>
        <Link href="/prenota/gestisci" className={`${styles.menuLink} ${styles.manageBookingLink}`}>{content.manageBooking} <span aria-hidden="true">↗</span></Link>
        <p className={styles.bookingNote}>{content.bookingNote}</p>
        <Link href="/menu" className={styles.menuLink}>{content.discoverMenu} <span aria-hidden="true">↗</span></Link>
      </section>
      </div>

      <section className={styles.story} aria-labelledby="story-title">
        <div className={styles.storyInner}>
          <div className={styles.storyImageWrap}>
            <Image src="/locale/sala.jpeg" alt={content.roomAlt} width={4032} height={3024} sizes="(max-width: 800px) 100vw, 54vw" className={styles.storyImage} />
          </div>
          <div className={styles.storyCopy}>
            <span className={styles.sectionKicker}>{content.storyKicker}</span>
            <h2 id="story-title">{content.storyTitle}</h2>
            {content.storyParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <Link href="/menu" className={styles.storyLink}>{content.exploreMenu} <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className={styles.gallery} aria-label={content.galleryLabel}>
          <Image src="/locale/tavoli-e-vini.jpeg" alt={content.galleryAlts[0]} width={5712} height={4284} sizes="(max-width: 700px) 100vw, 40vw" />
          <Image src="/locale/volta-in-pietra.jpeg" alt={content.galleryAlts[1]} width={2268} height={4032} sizes="(max-width: 700px) 40vw, 22vw" />
          <Image src="/locale/dettaglio-sala.jpeg" alt={content.galleryAlts[2]} width={5712} height={4284} sizes="(max-width: 700px) 60vw, 40vw" />
        </div>
      </section>

      <section className={styles.visit} aria-labelledby="visit-title">
        <div className={styles.visitInner}>
          <div className={styles.visitDetails}>
            <span className={styles.sectionKicker}>{content.visitKicker}</span>
            <h2 id="visit-title">{content.visitTitle}<br /><em>{content.visitEmphasis}</em></h2>
            <address>{RESTAURANT.address.streetAddress}<br />{RESTAURANT.address.postalCode} {RESTAURANT.address.addressLocality} ({RESTAURANT.address.addressRegion})</address>
            <a className={styles.directionsLink} href="https://www.google.com/maps/search/?api=1&query=Vico%20Morgese%201%2C%2070042%20Mola%20di%20Bari" target="_blank" rel="noopener noreferrer">{content.directions} <span aria-hidden="true">↗</span></a>
            <a className={styles.phoneLink} href={RESTAURANT.phoneHref}>{RESTAURANT.phone}</a>
            <div className={styles.socialLinks} aria-label={content.socialLabel}>
              <a href={RESTAURANT.socials[0]} target="_blank" rel="noopener noreferrer">Instagram ↗</a>
              <a href={RESTAURANT.socials[1]} target="_blank" rel="noopener noreferrer">Facebook ↗</a>
            </div>
          </div>
          <div className={styles.hours}>
            <h3>{content.openingHours}</h3>
            <dl>{OPENING_HOURS.map(({ day, hours, pranzo, cena }, index) => <div key={day}><dt>{content.weekdays[index]}</dt><dd>{pranzo || cena ? hours : content.closed}</dd></div>)}</dl>
            <p>{content.hoursNote}</p>
          </div>
        </div>
        <div className={styles.finalCta}>
          <p>{content.finalCta}</p>
          <Link href="/prenota" className={styles.bookingLink}>{content.bookTable} <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <LegalFooter className={styles.footer}>
        <span>© La cantina dei briganti · Mola di Bari</span>
        <div className={styles.footerLinks}>
          <Link href="/privacy" className={styles.footerLink}>{content.privacy}</Link>
          <Link href="/staff" className={styles.footerLink}>{content.staffAccess} <span aria-hidden="true">↗</span></Link>
        </div>
      </LegalFooter>
      <WhatsAppFloatingButton phoneNumber={RESTAURANT.phone} side="right" />
    </main>
  );
}
