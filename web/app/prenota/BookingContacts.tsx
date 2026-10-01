import { RESTAURANT } from "../../lib/restaurant";
import styles from "./prenota.module.css";

export default function BookingContacts({ code }: { code?: string }) {
  const message = code ? `Ciao, vorrei conoscere l’esito della richiesta di prenotazione ${code}.` : "Ciao, vorrei informazioni per prenotare un tavolo.";
  return <div className={styles.contactActions}>
    <a href={RESTAURANT.phoneHref} className={styles.secondary}>Chiamaci</a>
    <a href={`${RESTAURANT.whatsappUrl}?text=${encodeURIComponent(message)}`} className={styles.secondary}
      target="_blank" rel="noopener noreferrer">Scrivici su WhatsApp <span aria-hidden="true">↗</span></a>
  </div>;
}
