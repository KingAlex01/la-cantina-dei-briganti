"use client";

import { RESTAURANT } from "../../lib/restaurant";
import { bookingCopy } from "../../lib/i18n/booking";
import { useLanguage } from "../LanguageProvider";
import styles from "./prenota.module.css";

export default function BookingContacts({ code }: { code?: string }) {
  const { language } = useLanguage();
  const t = bookingCopy[language];
  const message = code ? t.whatsappStatus(code) : t.whatsappBooking;
  return <div className={styles.contactActions}>
    <a href={RESTAURANT.phoneHref} className={styles.secondary}>{t.call}</a>
    <a href={`${RESTAURANT.whatsappUrl}?text=${encodeURIComponent(message)}`} className={styles.secondary}
      target="_blank" rel="noopener noreferrer">{t.whatsapp} <span aria-hidden="true">↗</span></a>
  </div>;
}
