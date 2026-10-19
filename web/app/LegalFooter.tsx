import type { ReactNode } from "react";
import styles from "./legal-footer.module.css";

type LegalFooterProps = {
  children?: ReactNode;
  className?: string;
};

export default function LegalFooter({ children, className }: LegalFooterProps) {
  return <footer className={className ?? styles.footer}>
    {children}
    <p className={styles.details} lang="it">PARENTE SNC di Francesco e Vito Parente · Sede: Via Nazario Sauro n. 32, 70042 Mola di Bari (BA) · P. IVA 08788760729 · REA: 650169</p>
  </footer>;
}
