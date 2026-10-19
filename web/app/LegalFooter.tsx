import Link from "next/link";
import styles from "./legal-footer.module.css";

export default function LegalFooter() {
  return <footer className={styles.footer} lang="it" aria-label="Dati dell’impresa">
    <div className={styles.inner}>
      <p>PARENTE SNC di Francesco e Vito Parente · Sede: Via Nazario Sauro n. 32, 70042 Mola di Bari (BA) · P. IVA 08788760729 · REA: 650169</p>
      <Link href="/privacy">Informativa privacy</Link>
    </div>
  </footer>;
}
