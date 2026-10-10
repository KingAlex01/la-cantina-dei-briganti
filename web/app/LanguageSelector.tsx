"use client";

import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type SiteLanguage } from "../lib/i18n/languages";
import { useLanguage } from "./LanguageProvider";
import styles from "./language-selector.module.css";

const LABELS = { it: "Lingua", en: "Language", es: "Idioma", fr: "Langue" };
const ERRORS = { it: "Lingua non aggiornata. Riprova.", en: "Language could not be updated. Try again.", es: "No se pudo cambiar el idioma. Inténtalo de nuevo.", fr: "La langue n’a pas pu être modifiée. Réessayez." };

export default function LanguageSelector({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const { language, setLanguage, pending, failed } = useLanguage();
  return <label className={`${styles.selector} ${styles[tone]} ${className}`}>
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" />
    </svg>
    <span className={styles.srOnly}>{LABELS[language]} / Language</span>
    <select value={language} onChange={(event) => setLanguage(event.target.value as SiteLanguage)} aria-busy={pending} disabled={pending}>
      {SUPPORTED_LANGUAGES.map((value) => <option key={value} value={value} lang={value}>{LANGUAGE_NAMES[value]}</option>)}
    </select>
    {failed && <span role="alert" className={styles.error}>{ERRORS[language]}</span>}
  </label>;
}
