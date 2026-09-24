# Gestionale prenotazioni — La cantina dei briganti

Questo file riassume tutto ciò che è stato deciso durante la fase di progettazione (fatta in chat su claude.ai). Leggilo prima di scrivere codice. Rispondi sempre in **italiano**.

## Contesto

- Ristorante piccolo (circa 10 tavoli), a Mola di Bari. Il nome reale è **La cantina dei briganti**; "Osteria Controvento" resta il nome usato nel prototipo di riferimento.
- Dominio acquistato: `lacantinadeibriganti.com`. La casella `prenotazioni@lacantinadeibriganti.com` è su OVHcloud; Resend usa il dominio verificato solo per l'invio automatico.
- Obiettivo: un gestionale di prenotazioni online moderno. Il sito web del ristorante verrà dopo e riutilizzerà la pagina di prenotazione di questo progetto.
- Esiste un **prototipo funzionante** in `prototipo/osteria-controvento.html`: è il riferimento per flussi, testi, stile visivo e regole. Aprilo nel browser per vederlo. Le chiamate `window.claude.use("db")` al suo interno funzionano solo su claude.ai e vanno sostituite con il backend reale (fuori da claude.ai il prototipo gira in "demo locale" con dati in memoria).

## Stack deciso

- **Next.js** (App Router, TypeScript) — un unico progetto con la pagina pubblica di prenotazione e l'area staff.
- **Supabase** — Postgres, autenticazione staff, Realtime per aggiornare la sala in tempo reale, Row Level Security.
- **Resend** per le email di conferma quando il cliente inserisce l'indirizzo. Per chi non inserisce l'email, conferma sul sito e pulsante WhatsApp manuale per lo staff. SMS e WhatsApp automatici rinviati per contenere i costi.
- **Netlify** per il deploy: scelto al posto di Vercel dopo le prove di costo. Il progetto è collegato a GitHub ed è pubblico; il dominio OVH è associato usando la zona DNS di OVH, che continua a gestire la posta.
- Stile: Tailwind CSS va bene, ma mantieni l'identità visiva del prototipo (vedi sotto).

## Funzionalità

### Lato cliente (pubblico, senza login)
Wizard in 3 passi + conferma:
1. Data (da oggi a +60 giorni) e numero persone (1–8; oltre 8 → invito a telefonare).
2. Servizio (Pranzo / Cena) e orario di arrivo. Un servizio senza tavoli liberi per quel numero di persone appare come "completo".
3. Nome e cognome, cellulare (obbligatori), email (facoltativa), note (allergie, occasioni, seggiolone).
4. Schermata di conferma con data, orario, persone, tavolo, codice prenotazione e riepilogo delle notifiche inviate.

### Area staff (con login)
- **Sala**: selettore data + servizio, statistiche (coperti, prenotazioni, tavoli liberi, prossimo arrivo), planimetria e lista prenotazioni del servizio con ricerca.
- Azioni sulla prenotazione: Arrivati, Promemoria, No-show, Annulla, Riporta a confermata, spostamento su un altro tavolo.
- **Nuova prenotazione da staff** (telefono/walk-in): nome, cellulare, email, data, persone, servizio, orario, tavolo (automatico o manuale), note, opzione "invia conferma al cliente".
- **Planimetria modificabile** ("Modifica sala"): drag & drop dei tavoli, clic su un tavolo per modificare nome, posti, zona, forma; aggiungi/elimina. Modifiche in bozza, salvate solo con "Salva sala", annullabili.
- **Vista Lista** alternativa alla planimetria: stesse modifiche in tabella; fuori dalla modifica mostra lo stato dei tavoli con pulsante "Assegna" sui liberi.
- Cliccando un tavolo libero si apre "Nuova prenotazione" con quel tavolo preselezionato; su un tavolo occupato si apre il dettaglio.
- **Clienti (CRM)**: elenco con ricerca e filtri (Tutti / Abituali / Con no-show); scheda con visite, coperti totali, no-show, prossima prenotazione, etichette, note interne, storico prenotazioni, pulsante "Nuova prenotazione".
- Nella lista prenotazioni della sala si vedono per ogni cliente: numero di visite o "Prima volta", etichette, numero di no-show.
- **Notifiche**: modelli dei messaggi modificabili con anteprima, registro di tutti gli invii.

### Fuori ambito per ora
- Pannello eventi speciali (rimandato su richiesta del titolare).
- Caparre / pagamenti.

## Regole di business (importanti)

- **Turno singolo**: un tavolo prenotato è occupato per l'intero servizio (pranzo o cena) di quella data. L'orario indica solo l'arrivo. Non esiste una durata per turno.
- Una prenotazione occupa il tavolo se lo stato è `confermata` o `arrivato`.
- **Assegnazione automatica**: il tavolo libero con capienza ≥ persone e capienza minima.
- La disponibilità va **verificata lato server** al momento del salvataggio (vincolo o transazione) per evitare doppie prenotazioni sullo stesso tavolo/data/servizio.
- Lo staff può assegnare manualmente anche un tavolo più piccolo (mostrato come "(piccolo)").
- Non si può eliminare un tavolo con prenotazioni attive future: prima vanno spostate.
- Validazione sala: ogni tavolo ha un nome non vuoto e unico, posti tra 1 e 20.
- Ripristinare una prenotazione annullata: se il suo tavolo è stato occupato, riassegnarne uno libero; se non ce ne sono, bloccare con messaggio.
- **Identità cliente = numero di cellulare normalizzato**: solo cifre, rimosso il prefisso `0039` o `39` (se lunghezza ≥ 12). Scheda cliente creata automaticamente alla prima prenotazione; email e nome si aggiungono se mancanti.
- Statistiche cliente calcolate dalle prenotazioni (non contatori salvati): visite = prenotazioni `arrivato`; abituale = almeno 2 visite.
- Etichette cliente: VIP, Habitué, Allergie, Vegetariano, Attenzione.
- Stati prenotazione: `confermata`, `arrivato`, `no-show`, `annullata`.

### Orari servizi (configurabili in futuro)
- Pranzo: 12:30, 13:00, 13:30, 14:00 (martedì–domenica)
- Cena: 19:00, 19:30, 20:00, 20:30, 21:00, 21:30, 22:00 (tutti i giorni)

Nota: il prototipo non blocca ancora il pranzo del lunedì; nella versione reale sì. Giorni di chiusura e orari dovrebbero diventare impostazioni modificabili dallo staff.

## Notifiche

Eventi:
- **Conferma pubblica** (alla creazione): email automatica solo se il cliente indica un indirizzo. Senza email, conferma e codice sul sito; lo staff può aprire un messaggio WhatsApp precompilato e inviarlo manualmente.
- **Promemoria**: per ora solo testo copiabile dallo staff. Invii automatici e SMS rinviati.
- **Annullamento**: per ora lo staff contatta il cliente manualmente.

Segnaposto nei modelli: `{nome}` (solo il nome proprio), `{data}` (es. "mer 23 set"), `{ora}`, `{persone}`, `{codice}` (ultimi 6 caratteri alfanumerici dell'id, maiuscoli), `{ristorante}`.

Modelli predefiniti:
- Conferma, oggetto email: `Prenotazione confermata — {ristorante}`
- Conferma, testo email: `Ciao {nome},\n\nti confermiamo il tavolo per {persone} persone, {data} alle {ora}. Il tavolo è tuo per tutto il servizio.\n\nCodice prenotazione: {codice}\n\nPer modificare o annullare contatta il ristorante.\n\nA presto,\n{ristorante}`
- Conferma SMS: `{ristorante}: tavolo confermato per {persone}, {data} ore {ora}. Codice {codice}.`
- Promemoria SMS: `Ciao {nome}, ti aspettiamo oggi alle {ora} per {persone}. Se non riesci a venire avvisaci. {ristorante}`
- Annullamento SMS: `{ristorante}: la prenotazione di {data} alle {ora} è stata annullata. Per info chiamaci.`

Ogni invio va registrato (canale, tipo, destinatario, oggetto, testo, esito, data). Le chiavi API di Twilio/Resend stanno solo in variabili d'ambiente lato server, mai nel client.

## Modello dati (proposta per Supabase)

- `tables`: id, name (unico), capacity, area, shape (`round`|`square`|`rect`), pos_x, pos_y (percentuali 0–100), created_at
- `customers`: id, phone_key (unico), name, phone, email, notes, tags (text[]), created_at
- `reservations`: id, date, service (`pranzo`|`cena`), arrival_time, party_size, name, phone, email, notes, reminder_opt_in, table_id → tables, customer_id → customers, status, source (`online`|`staff`), code, created_at
  - Vincolo di unicità parziale su (table_id, date, service) dove status in (`confermata`, `arrivato`)
- `message_templates`: key, content, updated_at
- `notifications`: id, reservation_id, channel (`sms`|`email`), kind (`conferma`|`promemoria`|`annullamento`), recipient, subject, body, status, provider_id, created_at
- Staff: utenti Supabase Auth; ruoli per ora semplici (tutto lo staff vede tutto).

Sicurezza: il pubblico può solo creare prenotazioni tramite una funzione/endpoint server che verifica la disponibilità; non può leggere dati di altri clienti. Lo staff autenticato legge e scrive tutto. Attenzione al GDPR: informativa privacy nel form e dati clienti accessibili solo allo staff.

Privacy: titolare **PARENTE SNC di Francesco e Vito Parente**, Via Nazario Sauro n. 32, 70042 Mola di Bari (BA), P. IVA 08788760729, contatto `prenotazioni@lacantinadeibriganti.com`. Il titolare ha scelto 24 mesi dall'ultima prenotazione per la conservazione della scheda cliente e delle prenotazioni collegate; una funzione SQL programmata le elimina. Le note facoltative del modulo pubblico richiedono consenso separato, registrato con la prenotazione. L'informativa in `/privacy` va riletta dal titolare prima dell'apertura al pubblico, in particolare per le note sanitarie raccolte dallo staff fuori dal sito e gli accordi con i fornitori.

## Identità visiva (dal prototipo)

- Colori: verde pino `#1F3B32` / `#2B4E42`, ottone `#A9812F`, argilla `#A0503C`, salvia `#6C8A6F`, fondo carta `#EDE7D8` / `#F8F5EC`. Supporto al tema scuro.
- Font: **Fraunces** per i titoli, **Public Sans** per il testo.
- Stati tavolo: salvia = libero, ottone = prenotato, argilla = cliente arrivato.
- Tono dei testi: italiano semplice, frasi brevi, pulsanti che dicono esattamente cosa fanno.
- Responsive: l'area staff deve funzionare bene su tablet, la prenotazione su smartphone.

## Roadmap

1. **Base**: progetto Next.js + Supabase, schema del database con migrazioni, dati iniziali dei 10 tavoli del prototipo.
2. **Area staff con login**: sala, planimetria modificabile + vista lista, prenotazioni, CRM, realtime.
3. **Prenotazione pubblica** con controllo di disponibilità lato server.
4. **Notifiche**: conferma email con Resend per chi inserisce l'indirizzo; in assenza di email, conferma sul sito e WhatsApp manuale dallo staff. SMS e promemoria automatici rinviati.
5. **Messa online** su Netlify con dominio OVH, test in parallelo al metodo attuale.
6. **Dopo**: sito web del ristorante che integra la pagina di prenotazione; eventualmente eventi speciali.

## Modo di lavorare

- Procedi una fase alla volta e chiedi conferma al titolare prima di passare alla successiva.
- Spiega in modo semplice cosa stai facendo e cosa serve da parte sua (es. creare l'account Supabase e fornire le chiavi).
- Non inserire mai chiavi o password nel codice: usa `.env.local` (escluso da git).
