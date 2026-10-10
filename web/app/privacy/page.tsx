import { Fragment } from "react";
import Link from "next/link";
import LanguageSelector from "../LanguageSelector";
import { getRequestLanguage } from "../../lib/i18n/server";
import { privacyContent } from "../../lib/i18n/privacy";
import { pageMetadata } from "../../lib/site-metadata";
import styles from "./privacy.module.css";

export async function generateMetadata() {
  const language = await getRequestLanguage();
  const content = privacyContent[language];
  return pageMetadata("/privacy", content.metadataTitle, content.metadataDescription, language);
}

function privacyParagraph(text: string, authority: string) {
  return text.split(/(\{(?:controller|email|authority)\})/g).map((part, index) => {
    if (part === "{controller}") return <strong key={index}>PARENTE SNC di Francesco e Vito Parente</strong>;
    if (part === "{email}") return <a key={index} href="mailto:prenotazioni@lacantinadeibriganti.com">prenotazioni@lacantinadeibriganti.com</a>;
    if (part === "{authority}") return <a key={index} href="https://www.garanteprivacy.it/" rel="noopener noreferrer">{authority}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export default async function PrivacyPage() {
  const language = await getRequestLanguage();
  const content = privacyContent[language];
  return <main className={styles.page}>
    <div className={styles.wrap}>
      <div className={styles.navigation}>
        <Link className={styles.back} href="/prenota">← {content.back}</Link>
        <LanguageSelector tone="dark" />
      </div>
      <header className={styles.header}>
        <span className={styles.kicker}>La cantina dei briganti · Mola di Bari</span>
        <h1>{content.title}</h1>
        <p>{content.introduction}</p>
        <small>{content.updated}<br />{content.languageUpdated}</small>
      </header>

      <article className={styles.content}>
        {content.sections.map((section) => <section key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{privacyParagraph(paragraph, content.authority)}</p>)}
        </section>)}
      </article>
      <footer className={styles.footer}><Link href="/prenota">{content.back}</Link><Link href="/">{content.home}</Link></footer>
    </div>
  </main>;
}
