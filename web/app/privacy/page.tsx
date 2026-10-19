import { Fragment } from "react";
import Link from "next/link";
import LegalFooter from "../LegalFooter";
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

const providerReferences: Record<string, { href: string; label: string }> = {
  "{supabaseDpa}": { href: "https://supabase.com/legal/customer-resources/data-processing-addendum", label: "Supabase (DPA)" },
  "{netlifyDpa}": { href: "https://www.netlify.com/pdf/netlify-dpa.pdf", label: "Netlify (DPA)" },
  "{resendDpa}": { href: "https://resend.com/legal/dpa", label: "Resend (DPA)" },
  "{ovhDpa}": { href: "https://contract.eu.ovhapis.com/1.0/pdf/OVH_Data_Protection_Agreement-it.pdf", label: "OVHcloud (DPA)" },
  "{googlePrivacy}": { href: "https://policies.google.com/privacy", label: "Google (Privacy)" },
  "{googleTransfers}": { href: "https://policies.google.com/privacy/frameworks", label: "Google" },
  "{googleRetention}": { href: "https://policies.google.com/technologies/retention", label: "Google" },
  "{supabaseLogs}": { href: "https://supabase.com/pricing", label: "Supabase" },
  "{supabaseBackups}": { href: "https://supabase.com/docs/guides/platform/backups", label: "Supabase" },
  "{netlifyLogs}": { href: "https://docs.netlify.com/manage/monitoring/logs/", label: "Netlify" },
  "{netlifyObservability}": { href: "https://docs.netlify.com/manage/monitoring/observability/overview/", label: "Netlify (Observability)" },
  "{resendRetention}": { href: "https://resend.com/security/gdpr", label: "Resend" },
};

function privacyParagraph(text: string, authority: string) {
  return text.split(/(\{[a-zA-Z]+\})/g).map((part, index) => {
    if (part === "{controller}") return <strong key={index}>PARENTE SNC di Francesco e Vito Parente</strong>;
    if (part === "{email}") return <a key={index} href="mailto:prenotazioni@lacantinadeibriganti.com">prenotazioni@lacantinadeibriganti.com</a>;
    if (part === "{authority}") return <a key={index} href="https://www.garanteprivacy.it/" rel="noopener noreferrer">{authority}</a>;
    const reference = providerReferences[part];
    if (reference) return <a key={index} href={reference.href} rel="noopener noreferrer">{reference.label}</a>;
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
      <LegalFooter className={styles.footer}><Link href="/prenota">{content.back}</Link><Link href="/">{content.home}</Link></LegalFooter>
    </div>
  </main>;
}
