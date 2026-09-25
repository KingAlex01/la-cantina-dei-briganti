# Gestionale prenotazioni — La cantina dei briganti

Questo file riassume le decisioni di progetto e lo stato del codice al **25 settembre 2026**. Leggilo prima di scrivere codice. Rispondi sempre in **italiano**. Per sapere cosa è pubblicato controlla anche l'ultimo deploy Netlify: le modifiche locali non sono automaticamente online.

## Stato attuale: online, locale, da completare

- **Già pubblicato:** sito Next.js su Netlify, pagina iniziale, `/prenota`, `/staff`, `/privacy`, prenotazione pubblica collegata a Supabase, gestione sala e CRM. Il codice pubblicato potrebbe ancora inviare subito l'email di conferma pubblica quando il cliente indica l'indirizzo; dopo la migrazione del database questo creerebbe una richiesta `in_attesa` ma comunicherebbe erroneamente una conferma. Controllare l'ultimo deploy Netlify e allineare il codice prima di usare il flusso online. Il progetto Netlify è pubblico; `lacantinadeibriganti.com` e `www` sono configurati nella zona DNS OVH. Il fix dell'origine delle richieste di prenotazione è già stato pubblicato e provato; la prenotazione tecnica usata per la prova è stata eliminata.
- **Modifiche applicate solo al database remoto:** il 25 settembre 2026 il titolare ha eseguito `supabase db push --linked`; `supabase migration list --linked` mostra `20260925000100` sia in Local sia in Remote. La migrazione abilita `in_attesa`, `approved_at` e gli avvisi di tipo `richiesta`. Questo non pubblica il codice Next.js.
- **Menù digitale nel database remoto, interfaccia ancora locale:** il 25 settembre 2026 sono state applicate nel SQL Editor Supabase le migrazioni `20260925000200` e `20260925000300` e registrate nella cronologia. Sono presenti 3 categorie e 24 piatti con traduzioni IT/EN/ES/FR estratte dai quattro PDF di maggio 2026; il prezzo degli spaghetti alle cozze è 12 € in tutte le lingue, come confermato dal titolare. Il ruolo anonimo può leggere i piatti ma non inserirli né chiamare `import_menu`. La pagina `/menu` locale legge i dati dal database ed è stata verificata con risposta HTTP 200. Nessun PDF tedesco era disponibile: DE è previsto nell'interfaccia ma le traduzioni vanno ancora caricate. Il codice del menù non è stato pubblicato su Netlify. Il titolare ha scelto di non usare l'area staff né l'API OpenAI per aggiornare il menù: i nuovi PDF si copiano in `menu-sorgenti/`, Codex li revisiona e aggiorna `web/lib/menu/current-menu.json`, poi lo script `web/scripts/sync-menu.mjs` pubblica i dati in Supabase. I PDF sono esclusi da Git perché contengono anche la password Wi-Fi.
- **Modifiche al codice presenti solo nel computer, non pubblicate:** scheda staff **Notifiche** con registro degli ultimi 60 tentativi email e modelli modificabili con anteprima; opzione di inviare la conferma email per una prenotazione creata dallo staff; ripristino di una prenotazione su un tavolo libero se quello precedente è occupato; visite, etichette e no-show nella lista della sala; limiti di dimensione del corpo delle API e intestazioni HTTP di sicurezza. È stato inoltre aggiunto il nuovo flusso di approvazione manuale: richiesta pubblica `in_attesa`, avviso email allo staff, pulsanti Accetta/Rifiuta e conferma email al cliente solo dopo l'accettazione. Il debug locale successivo ha aggiunto log diagnostici, controllo dello schema prima dell'inserimento e un fix per mantenere visibile l'errore nella Sala. Non fare push senza una nuova istruzione del titolare: le build Netlify consumano crediti e vuole riunire più modifiche.
- **Da verificare prima di dichiarare pronta anche questa versione:** allineamento del deploy Netlify al database migrato; prova con un account staff reale di una nuova richiesta, avviso email, accettazione, rifiuto e gestione dell'email cliente fallita; accesso staff, modifica dei modelli e invio email da una prenotazione staff nel sito pubblicato; comportamento HTTPS del dominio personalizzato su dispositivi diversi; revisione dell'informativa privacy da parte del titolare. Le prove locali di lint, TypeScript e build passano, ma non sostituiscono una prova completa online.
- **Ancora fuori dalla versione attuale:** SMS e WhatsApp automatici, promemoria automatici, impostazioni staff per giorni di chiusura e orari, sito web completo del ristorante, eventi speciali, caparre e pagamenti. I promemoria si copiano e WhatsApp si apre con testo precompilato: l'invio è sempre manuale.

### Inventario delle modifiche non committate

Il riferimento dell'ultimo commit pubblicato è `bb37f74` (`Fix production booking origin validation`). Al 25 settembre 2026 questi file sono modificati o nuovi nella cartella di lavoro, **senza commit e senza push**:

- `CLAUDE.md` — questo aggiornamento dello stato reale.
- `web/app/api/public/reservations/route.ts` e il nuovo `web/lib/read-json-object.ts` — controllo aggiuntivo delle richieste provenienti da altri siti, tipo JSON e limite alla dimensione dei dati ricevuti; la nuova prenotazione resta in attesa e l'API avvisa lo staff senza inviare subito la conferma al cliente.
- `web/app/staff/page.tsx` e `web/app/staff/staff.module.css` — terza scheda Notifiche, opzione email per prenotazioni create dallo staff, promemoria dal modello salvato, ripristino su un tavolo libero, etichette e no-show nella lista della Sala; evidenza per le richieste in attesa, azioni Accetta/Rifiuta e messaggio chiaro se l'email cliente non viene confermata.
- Nuovi `web/app/staff/notifications-panel.tsx` e `web/app/staff/notifications.module.css` — interfaccia dei modelli e registro delle email, adattabile a schermi piccoli.
- `web/lib/notifications/email.ts` e il nuovo `web/lib/notifications/templates.ts` — testi iniziali, segnaposto e uso dei modelli salvati per le email automatiche; nuovo avviso email allo staff, registrato in `notifications`.
- Nuovo `web/app/api/staff/confirmation/route.ts` — invio email richiesto dallo staff, protetto da token Supabase, lista `staff_users` e controllo contro un secondo tentativo sulla stessa prenotazione.
- Nuovo `web/app/api/staff/reservations/decision/route.ts` — approvazione o rifiuto di una richiesta online, con token Supabase, verifica in `staff_users`, aggiornamento condizionato sullo stato `in_attesa` e invio della conferma al cliente dopo l'approvazione.
- `web/app/prenota/page.tsx`, `web/lib/public-booking.ts` e `web/lib/staff/types.ts` — testi pubblici coerenti con l'attesa di approvazione e tipi aggiornati; `web/app/staff/notifications-panel.tsx` mostra anche gli avvisi allo staff.
- `web/.env.example` — destinatario configurabile `RESEND_STAFF_EMAIL`, con fallback nel codice a `prenotazioni@lacantinadeibriganti.com`.
- Nuova migrazione `supabase/migrations/20260925000100_manual_online_approval.sql`, applicata al database remoto ma ancora non committata — stato `in_attesa`, `approved_at`, avvisi di tipo `richiesta`, disponibilità e unicità che includono le richieste pendenti, e blocco delle conferme online dirette fuori dall'API.
- `web/next.config.ts` — intestazioni di sicurezza e risposte API senza cache; HSTS resta da valutare dopo la verifica del certificato HTTPS.
- `supabase/migrations/20260925000200_digital_menu.sql` e `20260925000300_current_menu_may_2026.sql` — schema del menù multilingua e dati iniziali, applicati al database remoto tramite SQL Editor Supabase e ancora non committati.
- `web/app/menu/`, `web/lib/menu/`, `web/scripts/sync-menu.mjs`, `menu-sorgenti/` — menù pubblico, dati strutturati, script di verifica/pubblicazione e cartella locale per i PDF; tutto il codice è ancora solo locale. L'area staff per caricare PDF e la dipendenza OpenAI sono state rimosse su richiesta del titolare.

La migrazione per l'approvazione manuale **risulta applicata al database remoto** dalla cronologia CLI fornita dal titolare. Per le modifiche precedenti `npm run lint`, `npm run build`, i controlli locali degli endpoint e `npm audit` erano passati; l'accesso anonimo alle tabelle sensibili era stato rifiutato dal database online. Per il nuovo flusso e i fix di debug passano lint, `tsc --noEmit` e la build Next.js locale. Gli invii email e l'approvazione di una nuova richiesta non sono ancora stati verificati con un account staff reale. Le richieste create prima della migrazione restano confermate: la migrazione valorizza per esse `approved_at = created_at` e non invia avvisi retroattivi.

## Contesto

- Ristorante piccolo (circa 10 tavoli), a Mola di Bari. Il nome reale è **La cantina dei briganti**; "Osteria Controvento" resta il nome usato nel prototipo di riferimento.
- Dominio acquistato: `lacantinadeibriganti.com`. La casella `prenotazioni@lacantinadeibriganti.com` è su OVHcloud; Resend usa il dominio verificato solo per l'invio automatico.
- Obiettivo: un gestionale di prenotazioni online moderno. Il sito web del ristorante verrà dopo e riutilizzerà la pagina di prenotazione di questo progetto.
- Esiste un **prototipo funzionante** in `osteria-controvento.html` nella radice del repository: è il riferimento per flussi, testi, stile visivo e regole. Le chiamate `window.claude.use("db")` al suo interno funzionano solo su claude.ai; l'app reale usa Supabase. Fuori da claude.ai il prototipo gira in "demo locale" con dati in memoria. Il nome "Osteria Controvento" e gli SMS simulati del prototipo non vanno copiati nell'app reale.

## Stack deciso

- **Next.js** (App Router, TypeScript) — un unico progetto con la pagina pubblica di prenotazione e l'area staff.
- **Supabase** — Postgres, autenticazione staff, Realtime per aggiornare la sala in tempo reale, Row Level Security.
- **Resend** per l'avviso allo staff quando arriva una richiesta pubblica e per la conferma al cliente, se ha indicato l'email, solo dopo l'accettazione. Per chi non inserisce l'email, lo staff deve comunicare l'esito manualmente; dopo la conferma può aprire il messaggio WhatsApp precompilato. SMS e WhatsApp automatici sono rinviati per contenere i costi.
- **Netlify** per il deploy: scelto al posto di Vercel dopo le prove di costo. Il progetto è collegato a GitHub ed è pubblico; il dominio OVH è associato usando la zona DNS di OVH, che continua a gestire la posta.
- Stile: l'app attuale usa CSS Modules e i font Fraunces e Public Sans; mantieni l'identità visiva descritta sotto. Tailwind è installato ma non è necessario per modificare le pagine esistenti.

## Funzionalità

### Lato cliente (pubblico, senza login)
Wizard in 3 passi + riepilogo della richiesta:
1. Data (da oggi a +60 giorni) e numero persone (1–8; oltre 8 → invito a telefonare).
2. Servizio (Pranzo / Cena) e orario di arrivo. Un servizio senza tavoli liberi per quel numero di persone appare come "completo".
3. Nome e cognome, cellulare (obbligatori), email (facoltativa), note (allergie, occasioni, seggiolone).
4. Schermata «Richiesta inviata» con data, orario, persone, tavolo assegnato provvisoriamente e codice. Specifica che il tavolo non è ancora confermato e che lo staff deve approvare la richiesta.

### Area staff (con login)
- **Sala**: selettore data + servizio, statistiche (coperti, prenotazioni, tavoli liberi, prossimo arrivo), planimetria e lista prenotazioni del servizio con ricerca.
- Azioni sulla prenotazione: Accetta/Rifiuta per le richieste `in_attesa`; per quelle già confermate Arrivati, Promemoria, No-show e Annulla; ripristino delle prenotazioni già confermate in passato e spostamento su un altro tavolo. Una richiesta online rifiutata non offre il ripristino diretto.
- Le richieste online in attesa sono evidenziate nella lista e nel riquadro delle richieste recenti, con aggiornamenti Realtime. Accetta usa l'API staff; Rifiuta imposta `annullata` e lo staff contatta il cliente manualmente se necessario.
- **Nuova prenotazione da staff** (telefono/walk-in): nome, cellulare, email, persone, orario, tavolo (automatico o manuale), note, opzione "invia conferma email" nella versione locale. Data e servizio si selezionano nella Sala prima di aprire il modulo; nel prototipo sono presenti anche nel modulo.
- **Planimetria modificabile** ("Modifica sala"): drag & drop dei tavoli, clic su un tavolo per modificare nome, posti, zona, forma; aggiungi/elimina. Modifiche in bozza, salvate solo con "Salva sala", annullabili.
- **Vista Lista** alternativa alla planimetria: stesse modifiche in tabella; fuori dalla modifica mostra lo stato dei tavoli con pulsante "Assegna" sui liberi.
- Cliccando un tavolo libero si apre "Nuova prenotazione" con quel tavolo preselezionato; su un tavolo occupato si apre il dettaglio.
- **Clienti (CRM)**: elenco con ricerca e filtri (Tutti / Abituali / Con no-show); scheda con visite, coperti totali, no-show, prossima prenotazione, etichette, note interne, storico prenotazioni, pulsante "Nuova prenotazione".
- Nella lista prenotazioni della sala si vedono per ogni cliente: numero di visite o "Prima volta", etichette, numero di no-show.
- **Notifiche** (solo versione locale finché non viene pubblicata): modelli modificabili per oggetto e corpo della conferma email e per il promemoria da copiare, con anteprima; registro degli ultimi 60 tentativi email. Lo stato "inviata" indica che Resend ha accettato il messaggio, non garantisce la consegna finale. I messaggi manuali non sono registrati come inviati.

### Fuori ambito per ora
- Pannello eventi speciali (rimandato su richiesta del titolare).
- Caparre / pagamenti.

## Regole di business (importanti)

- **Turno singolo**: un tavolo prenotato è occupato per l'intero servizio (pranzo o cena) di quella data. L'orario indica solo l'arrivo. Non esiste una durata per turno.
- Una richiesta `in_attesa` riserva provvisoriamente il tavolo: per disponibilità, assegnazione automatica e indice univoco occupa il tavolo come gli stati `confermata` e `arrivato`. Il rifiuto lo libera.
- **Assegnazione automatica**: il tavolo libero con capienza ≥ persone e capienza minima.
- La disponibilità va **verificata lato server** al momento del salvataggio (vincolo o transazione) per evitare doppie prenotazioni sullo stesso tavolo/data/servizio.
- Lo staff può assegnare manualmente anche un tavolo più piccolo (mostrato come "(piccolo)").
- Non si può eliminare un tavolo con prenotazioni attive future: prima vanno spostate.
- Validazione sala: ogni tavolo ha un nome non vuoto e unico, posti tra 1 e 20.
- Ripristinare una prenotazione annullata o no-show: nella versione locale, se il suo tavolo è stato occupato, riassegnarne uno libero di capienza sufficiente; se non ce ne sono, bloccare con messaggio. Il vincolo univoco nel database resta la protezione finale contro gare tra richieste.
- **Identità cliente = numero di cellulare normalizzato**: solo cifre, rimosso il prefisso `0039` o `39` (se lunghezza ≥ 12). Scheda cliente creata automaticamente alla prima prenotazione; l'email si aggiunge se prima assente. Il nome iniziale della scheda non viene aggiornato automaticamente dalle prenotazioni successive.
- Statistiche cliente calcolate dalle prenotazioni (non contatori salvati): visite = prenotazioni `arrivato`; abituale = almeno 2 visite.
- Etichette cliente: VIP, Habitué, Allergie, Vegetariano, Attenzione.
- Stati prenotazione: `in_attesa`, `confermata`, `arrivato`, `no-show`, `annullata`. Le nuove richieste online iniziano in `in_attesa`; le prenotazioni create dallo staff iniziano in `confermata`.

### Orari servizi (configurabili in futuro)
- Pranzo: 12:30, 13:00, 13:30, 14:00 (martedì–domenica)
- Cena: 19:00, 19:30, 20:00, 20:30, 21:00, 21:30, 22:00 (tutti i giorni)

Nota: il prototipo non blocca il pranzo del lunedì. La prenotazione pubblica reale lo blocca nel database e la Sala staff lo disabilita nell'interfaccia; la funzione SQL staff non applica ancora quel divieto a una chiamata diretta. Giorni di chiusura e orari non sono ancora impostazioni modificabili.

## Notifiche

Eventi:
- **Nuova richiesta pubblica** (alla creazione, solo nella versione locale): l'API invia un avviso allo staff tramite Resend e registra il tentativo. Usa `RESEND_STAFF_EMAIL` o, se assente, `prenotazioni@lacantinadeibriganti.com`. Un errore dell'email allo staff non annulla la richiesta salvata. Nessuna conferma viene inviata subito al cliente.
- **Accettazione pubblica** (solo nella versione locale): l'API verifica token Supabase e `staff_users`, porta atomicamente una sola richiesta ancora `in_attesa` a `confermata` e imposta `approved_at`. Solo dopo tenta la conferma email al cliente che ha fornito un indirizzo. Se l'email manca o fallisce, la prenotazione resta confermata e la Sala avvisa lo staff che deve contattare il cliente. «Inviata» significa accettata da Resend, non consegnata con certezza.
- **Rifiuto pubblico** (solo nella versione locale): la richiesta passa da `in_attesa` ad `annullata`; non parte un'email automatica al cliente.
- **Conferma da staff** (versione locale): il modulo offre una casella per inviare la conferma via email se è stato indicato un indirizzo. La nuova API verifica il token Supabase e l'appartenenza a `staff_users`; se l'email fallisce, la prenotazione resta salvata e lo staff vede un avviso.
- **Promemoria**: per ora solo testo copiabile dallo staff. Invii automatici e SMS rinviati.
- **Annullamento**: per ora lo staff contatta il cliente manualmente.

Segnaposto nei modelli: `{nome}` (solo il nome proprio), `{data}`, `{ora}`, `{persone}`, `{codice}` (codice alfanumerico di sei caratteri generato dal database, non derivato dall'ID), `{ristorante}`. La data è formattata in italiano.

Modelli effettivamente usati dalla versione locale: `confirmEmailSubject`, `confirmEmailBody`, `reminderText`. I testi iniziali sono in `web/lib/notifications/templates.ts`; lo staff può modificarli nella scheda Notifiche. Gli SMS simulati del prototipo non sono modelli attivi nel gestionale.

Ogni tentativo di invio email automatico viene registrato in `notifications` (canale, tipo, destinatario, oggetto, testo, esito, data). I testi copiati e le aperture di WhatsApp non provano che il cliente abbia ricevuto un messaggio e non sono registrati come invii. Le chiavi `RESEND_API_KEY` e `SUPABASE_SECRET_KEY` restano solo nelle variabili d'ambiente lato server, mai nel client o nel repository.

## Modello dati (proposta per Supabase)

- `tables`: id, name (unico), capacity, area, shape (`round`|`square`|`rect`), pos_x, pos_y (percentuali 0–100), archived_at, created_at
- `customers`: id, phone_key (unico), name, phone, email, notes, tags (text[]), created_at
- `reservations`: id, date, service (`pranzo`|`cena`), arrival_time, party_size, name, phone, email, notes, notes_consent_at, reminder_opt_in, table_id → tables, customer_id → customers, status, approved_at, source (`online`|`staff`), code, created_at
  - Dopo la migrazione applicata, vincolo di unicità parziale su (table_id, date, service) dove status in (`in_attesa`, `confermata`, `arrivato`). `approved_at` è valorizzato all'accettazione; per le vecchie prenotazioni online è stato inizializzato a `created_at`.
- `message_templates`: key, content, updated_at
- `notifications`: id, reservation_id, channel (`sms`|`email`), kind (`richiesta`|`conferma`|`promemoria`|`annullamento`), recipient, subject, body, status, provider_id, created_at
- `staff_users`: lista degli ID Supabase Auth abilitati; ogni membro autorizzato ha gli stessi permessi operativi.

Sicurezza attuale: il pubblico prenota tramite un endpoint server che ricontrolla la disponibilità; un indice univoco nel database impedisce due prenotazioni attive sullo stesso tavolo/data/servizio. Le tabelle hanno RLS e permessi espliciti: la chiave pubblicabile senza login riceve `42501` se tenta di leggere clienti, prenotazioni, notifiche o `staff_users` (verificato il 24 settembre 2026). Le chiavi privilegiate sono solo lato server. Netlify limita a 5 al minuto per IP gli invii del modulo pubblico; la versione locale aggiunge controllo dell'origine e `Sec-Fetch-Site`, limite di dimensione del JSON, risposte API senza cache e intestazioni anti-embedding. Le API email e decisione staff richiedono autenticazione e verifica in `staff_users`; l'aggiornamento dell'approvazione è condizionato a `in_attesa`. La migrazione applicata impedisce agli utenti autenticati di confermare direttamente una richiesta online mai approvata modificando le righe via client. `npm audit` il 24 settembre 2026 non segnalava vulnerabilità note nelle dipendenze. Queste misure riducono i rischi, ma non garantiscono resistenza a ogni attacco.

Sicurezza ancora da completare o ricontrollare: verificare il certificato HTTPS del dominio prima di attivare HSTS; provare il flusso staff e l'email della versione locale dopo la pubblicazione; valutare test RLS automatizzati con un Postgres locale; spostare in uno schema non esposto le funzioni `SECURITY DEFINER` pubbliche oggi accessibili solo al ruolo server, secondo la guida Supabase. Per gli aggiornamenti di sicurezza di Next.js, controllare gli avvisi ufficiali prima dei prossimi deploy.

Privacy: titolare **PARENTE SNC di Francesco e Vito Parente**, Via Nazario Sauro n. 32, 70042 Mola di Bari (BA), P. IVA 08788760729, contatto `prenotazioni@lacantinadeibriganti.com`. Il titolare ha scelto 24 mesi dall'ultima prenotazione per la conservazione della scheda cliente e delle prenotazioni collegate; una funzione SQL programmata le elimina. Le note facoltative del modulo pubblico richiedono consenso separato, registrato con la prenotazione. Il sito è già pubblico, ma la revisione finale dell'informativa in `/privacy` da parte del titolare non risulta ancora confermata; verificare soprattutto le note sanitarie raccolte dallo staff fuori dal sito e gli accordi con i fornitori.

## Identità visiva (dal prototipo)

- Colori: verde pino `#1F3B32` / `#2B4E42`, ottone `#A9812F`, argilla `#A0503C`, salvia `#6C8A6F`, fondo carta `#EDE7D8` / `#F8F5EC`. Supporto al tema scuro.
- Font: **Fraunces** per i titoli, **Public Sans** per il testo.
- Stati tavolo: salvia = libero, ottone = prenotato, argilla = cliente arrivato.
- Tono dei testi: italiano semplice, frasi brevi, pulsanti che dicono esattamente cosa fanno.
- Responsive: l'area staff deve funzionare bene su tablet, la prenotazione su smartphone.

## Roadmap e avanzamento

1. **Base — realizzata**: progetto Next.js + Supabase, migrazioni e 10 tavoli iniziali del prototipo.
2. **Area staff — realizzata nelle funzioni principali**: login, Sala, planimetria modificabile, vista Lista, prenotazioni, CRM e Realtime. La scheda Notifiche e gli altri miglioramenti indicati sopra sono ancora solo locali.
3. **Prenotazione pubblica — migrazione database applicata; codice di approvazione ancora locale**: controllo disponibilità lato server, limite 1–8 persone e date entro 60 giorni. Il nuovo flusso locale mostra codice e stato di attesa. Fino alla pubblicazione del nuovo codice, la vecchia API pubblica può inviare una conferma email per una richiesta che il database lascia in attesa: controllare il deploy Netlify prima di accettare nuove richieste online.
4. **Notifiche — conferma email immediata ancora pubblicata; nuovo flusso solo locale**: avviso allo staff alla richiesta, conferma email al cliente dopo l'accettazione, email da prenotazione staff, modelli e registro. SMS e promemoria automatici rinviati.
5. **Messa online — in corso di verifica finale**: Netlify pubblico e dominio configurato su OVH senza spostare la posta. Ricontrollare HTTPS e i flussi completi dopo il prossimo deploy.
6. **Futuro**: sito web completo del ristorante che riusa la pagina di prenotazione; eventualmente eventi speciali.

## Modo di lavorare

- Rispetta l'ambito chiesto dal titolare. Non anticipare nuove fasi o un push/deploy quando chiede solo modifiche locali; raccogli più modifiche prima della build Netlify per contenere i crediti.
- Spiega in modo semplice cosa stai facendo e cosa serve da parte sua (es. creare l'account Supabase e fornire le chiavi).
- Non inserire mai chiavi o password nel codice: usa `.env.local` (escluso da git).
