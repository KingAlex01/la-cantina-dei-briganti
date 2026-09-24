import type { Metadata } from "next";
import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy prenotazioni | La cantina dei briganti",
  description: "Come trattiamo i dati inseriti per prenotare un tavolo.",
};

export default function PrivacyPage() {
  return <main className={styles.page}>
    <div className={styles.wrap}>
      <Link className={styles.back} href="/prenota">← Torna alla prenotazione</Link>
      <header className={styles.header}>
        <span className={styles.kicker}>La cantina dei briganti · Mola di Bari</span>
        <h1>Informativa privacy</h1>
        <p>Per le prenotazioni online e la gestione dei clienti del ristorante.</p>
        <small>Aggiornata il 24 settembre 2026</small>
      </header>

      <article className={styles.content}>
        <section>
          <h2>Chi gestisce i dati</h2>
          <p>Il titolare del trattamento è <strong>PARENTE SNC di Francesco e Vito Parente</strong>, Via Nazario Sauro n. 32, 70042 Mola di Bari (BA), P. IVA 08788760729. Per domande o richieste sui tuoi dati scrivi a <a href="mailto:prenotazioni@lacantinadeibriganti.com">prenotazioni@lacantinadeibriganti.com</a>.</p>
        </section>
        <section>
          <h2>Quali dati usiamo e perché</h2>
          <p>Per prenotare chiediamo nome e cognome e cellulare. Registriamo data, servizio, orario, numero di persone, tavolo e stato della prenotazione. Servono per riservare il tavolo e contattarti in caso di necessità: il trattamento è necessario per gestire la tua richiesta di prenotazione (art. 6, par. 1, lett. b, GDPR). Senza questi dati non possiamo completarla.</p>
          <p>L’email è facoltativa. Se la inserisci, la usiamo per inviarti la conferma della prenotazione; non inviamo pubblicità. Il personale autorizzato può vedere le prenotazioni, lo storico delle visite e le preferenze annotate per organizzare il servizio ai clienti abituali. Per la gestione di questo storico facciamo riferimento al legittimo interesse del ristorante (art. 6, par. 1, lett. f, GDPR); puoi opporti scrivendoci.</p>
          <p>Anche le note sono facoltative. Possono contenere informazioni su allergie o intolleranze. Se le compili, ti chiediamo un consenso esplicito separato per usarle solo nell’organizzazione della tua visita (art. 9, par. 2, lett. a, GDPR). Puoi prenotare senza note e puoi revocare il consenso scrivendoci; la revoca non cambia la liceità dell’uso precedente.</p>
        </section>
        <section>
          <h2>Chi può riceverli</h2>
          <p>Accede ai dati soltanto il personale autorizzato del ristorante. Per far funzionare il servizio usiamo Supabase per il database, Netlify per il sito e Resend per inviare la conferma quando fornisci l’email. Le comunicazioni inviate alla casella del ristorante sono gestite con il servizio email di OVHcloud. Questi fornitori trattano i dati necessari a svolgere i rispettivi servizi. Alcuni trattamenti possono comportare trasferimenti fuori dallo Spazio economico europeo; puoi chiederci informazioni sulle garanzie applicabili.</p>
        </section>
        <section>
          <h2>Per quanto tempo</h2>
          <p>Conserviamo la scheda cliente, le prenotazioni collegate e le relative notifiche fino a 24 mesi dopo la data dell’ultima prenotazione. Una prenotazione senza scheda cliente viene conservata fino a 24 mesi dalla data del servizio. Il database elimina automaticamente i dati scaduti ogni giorno. Eventuali dati tecnici conservati dai fornitori seguono i loro tempi di conservazione.</p>
        </section>
        <section>
          <h2>I tuoi diritti</h2>
          <p>Puoi chiedere accesso, correzione o cancellazione dei dati, la limitazione del trattamento e, quando applicabile, la portabilità. Puoi opporti al trattamento fondato sul legittimo interesse e revocare il consenso alle note. Scrivi a <a href="mailto:prenotazioni@lacantinadeibriganti.com">prenotazioni@lacantinadeibriganti.com</a>. Hai anche il diritto di presentare un reclamo al <a href="https://www.garanteprivacy.it/" rel="noopener noreferrer">Garante per la protezione dei dati personali</a>.</p>
        </section>
      </article>
      <footer className={styles.footer}><Link href="/prenota">Torna alla prenotazione</Link><Link href="/">Pagina iniziale</Link></footer>
    </div>
  </main>;
}
