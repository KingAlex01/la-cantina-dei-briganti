# Revisione sicurezza e robustezza — 17 ottobre 2026

Ambito: codice locale del nuovo flusso di gestione prenotazioni e dipendenze
installate in `web/`. Revisione statica indipendente e prova isolata del caso
email; nessun accesso al database remoto o invio reale. I rilievi sotto sono
ancora aperti. Non pubblicare la funzione considerandola già verificata sotto
ogni aspetto di sicurezza.

## 1. Credenziali storiche deboli e recupero attraverso i vecchi codici

Il generatore precedente produce sei caratteri esadecimali (24 bit). La nuova
RPC `lookup_public_reservation` accetta questi codici e segue le sostituzioni
fino alla prenotazione corrente, restituendone codice e versione. Questi dati
autorizzano le operazioni successive: il codice precedente rimane quindi una
credenziale completa, anche se la scrittura diretta con codice/versione vecchi
viene rifiutata. Il commento SQL secondo cui il vecchio codice autorizzerebbe
solo la lettura non descrive questa possibilità.

Riferimenti: `supabase/migrations/20260924000300_reservation_codes.sql:19`,
`supabase/migrations/20261017154813_customer_reservation_management.sql:199`
e `web/app/api/public/reservations/manage/route.ts:93`.

Il limite per singolo IP rallenta i tentativi ma non copre tentativi distribuiti
o rotazione di indirizzi IPv6. Individuare una credenziale breve permette di
leggere anche le note e modificare/cancellare la prenotazione corrente.

Correzione proposta, mantenendo il requisito del solo codice: accesso autonomo
con codici robusti, riemissione dei codici per le prenotazioni storiche attive o
gestione di quelle prenotazioni tramite lo staff. Il recupero dopo risposta
persa va limitato alla singola operazione o a una finestra temporale, evitando
alias permanenti non revocabili. La scelta sulla compatibilità storica richiede
una decisione del titolare prima di cambiare il comportamento concordato.

## 2. Avvisi di sicurezza delle dipendenze

Controlli aggiornati eseguiti contro il registro npm ufficiale:

- `npm audit --json`: otto pacchetti segnalati con severità aggregata alta,
  incluse dipendenze transitive degli strumenti di sviluppo.
- `npm audit --omit=dev --json`: tre pacchetti di produzione segnalati:
  `next@16.3.6`, `sharp@0.35.4`, `source-map-js@1.2.1`.

Il conteggio riguarda pacchetti, non otto vulnerabilità indipendenti
necessariamente sfruttabili nel sito. Occorre aggiornare in modo controllato
pacchetti e lockfile, poi ripetere audit, build e verifiche funzionali. Evitare
un `npm audit fix --force` indiscriminato: l'audit suggerisce anche un downgrade
non appropriato di `eslint-config-next`.

L'esposizione dipende dall'uso effettivo e dall'ambiente: ad esempio l'avviso
SSRF Next.js sulle immagini richiede URL remoti autorizzati; la configurazione
del repository non definisce `images.remotePatterns`. L'avviso sharp richiede
specifiche condizioni del runtime e della decodifica SVG. Non è stato
dimostrato un attacco su questo deployment.

Fonti primarie:
[Next.js Image Optimization SSRF](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4),
[sharp/librsvg](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w).

## 3. Conferma email dopo cancellazione o sostituzione concorrente

L'API staff salva l'accettazione e poi invoca l'invio email. Nel frattempo il
cliente può rileggere e cancellare/sostituire la prenotazione. L'invio rilegge
soltanto l'ID, senza verificare stato o versione: può quindi inviare una
conferma ormai superata. Riprodotto con invocazione isolata e dati simulati:
la funzione invia la conferma anche quando la riga è già `annullata`.

Riferimenti: `web/app/api/staff/reservations/decision/route.ts:71` e `:101`,
`web/lib/notifications/email.ts:232`.

Correzione minima: trasmettere la versione risultante dall'accettazione e
controllare che stato/versione coincidano prima dell'invio. Per garanzie più
forti servono comunicazioni persistenti ordinate per prenotazione e gestione
esplicita degli eventi che rendono superata una conferma. Un controllo prima
del provider restringe la finestra, senza rendere atomici database ed email.

## 4. Avvisi staff senza recupero automatico dell'invio

L'evento cliente è persistito nella transazione, ma l'email è tentata solo dopo
il commit dalla richiesta HTTP. Un arresto del processo in quel punto o un
errore temporaneo del provider può lasciare l'evento senza email. Il ramo di
deduplicazione restituisce l'esito precedente e non riprova un invio fallito.

Riferimenti: `web/app/api/public/reservations/manage/route.ts:108`,
`web/lib/notifications/email.ts:86` e `:92`.

È un limite già documentato, non una perdita della prenotazione o del suo
storico. Per rendere l'avviso affidabile occorre un meccanismo di invio
persistente con tentativi successivi limitati, idempotenza e visibilità degli
errori. Va considerata anche la finestra di idempotenza del provider.

## Controlli già positivi e limiti della verifica

Le nuove RPC sono `SECURITY INVOKER`, con `search_path` vuoto, revoca a
`PUBLIC`, `anon`, `authenticated` ed esecuzione soltanto `service_role`.
Il registro eventi ha RLS con lettura riservata allo staff. La risposta
pubblica esclude telefono, email e tavolo; le chiavi privilegiate restano sul
server. Le scritture usano parametri RPC, limiti di dimensione del corpo,
controlli di origine e versioni per evitare sovrascritture obsolete.

I precedenti 68 test Node, 21 gruppi PostgreSQL/PGlite, build, lint e prove
browser coprono comportamento e permessi nei casi testati. La sostituzione
atomica conserva la prenotazione originale se la nuova richiesta fallisce.
Questi controlli non provano la revoca dei codici precedenti né le gare reali
tra connessioni PostgreSQL parallele. Restano da verificare il deployment
Netlify, l'IP fidato, il recapito email e la concorrenza su Postgres reale.
