# La cantina dei briganti — gestionale prenotazioni

Le fasi 1–4 sono implementate: base Next.js e Supabase, area staff,
prenotazione pubblica e conferma email facoltativa con Resend. Netlify è
collegato al ramo `main` di GitHub e il sito è pubblico su
`https://lacantinadeibriganti.netlify.app`. Il dominio OVH è associato; restano
da verificare il certificato HTTPS e il flusso completo di prenotazione online.

## Cartelle

- `web/`: nuova applicazione Next.js con App Router e TypeScript.
- `supabase/migrations/`: struttura del database e dieci tavoli iniziali.
- `prototipo/osteria-controvento.html`: prototipo di riferimento.
- `frontend/`, `backend/`, `docker-compose.yml`: esperimenti precedenti,
  conservati senza modifiche.

## Avviare il sito in locale

Servono Node.js e npm. Dalla cartella principale della repository, in
PowerShell:

```powershell
npm --prefix web install
```

Inserire URL, chiave pubblicabile e chiave server del progetto Supabase in
`web/.env.local`, usando `web/.env.example` come guida. `.env.local` è escluso
da Git. La chiave server deve usare `SUPABASE_SECRET_KEY`, **mai** un nome che
inizia con `NEXT_PUBLIC_`: viene letta solo dalle API del server.

Avviare il sito, sempre dalla cartella principale:

```powershell
npm run dev
```

In alternativa, entrare in `web/` con `cd web` e lanciare lì `npm run dev`.

Aprire `http://localhost:3000`. La prenotazione pubblica è in
`http://localhost:3000/prenota`, l’area staff in `http://localhost:3000/staff`.
Il cliente non deve creare un account. Sceglie data e persone, poi servizio e
orario, infine inserisce i contatti. La conferma mostra il codice e il tavolo.
La disponibilità viene ricontrollata nel database al salvataggio.

## Lingua del sito pubblico

Home, menù, prenotazione e privacy supportano italiano, inglese, spagnolo e
francese. Il server legge `Accept-Language`, comprese le varianti regionali e
le priorità del browser: la prima pagina arriva già nella lingua disponibile
preferita. Per una lingua non disponibile si usa l'inglese; senza preferenze
si usa l'italiano.

Il selettore presente nelle pagine pubbliche permette di cambiare lingua.
Solo questa scelta manuale salva il cookie tecnico `cantina_language` per un
anno e prevale sulla preferenza del browser. Il cambio mantiene i campi della
prenotazione e la ricerca nel menù. Date e prezzi usano la lingua selezionata;
gli orari del ristorante restano nel fuso di Roma. L'area staff e le email
automatiche restano in italiano.

Le traduzioni dell'interfaccia sono in `web/lib/i18n/`; i testi dei piatti
rimangono nel catalogo multilingua esistente. Non vengono chiamati servizi di
traduzione esterni durante la visita. Per verificare la selezione della lingua
e le regole di prenotazione:

```powershell
cd web
node --test scripts/languages.test.mjs scripts/public-booking.test.mjs
```

Questa modifica del 9 ottobre 2026 è locale: richiede una pubblicazione
separata per apparire sul sito online.

## Primo accesso staff

Il primo account staff è stato invitato tramite Supabase. Aprire l’email di
invito sullo stesso computer su cui gira `npm run dev`, scegliere una password
personale nella pagina `/staff/accept` e poi accedere da `/staff`. La password
non deve essere comunicata o inserita nei file del progetto.

Per i futuri inviti, il **Site URL** di Supabase Auth è
`https://lacantinadeibriganti.com` e `/staff/accept` sul dominio è tra gli URL
di reindirizzamento autorizzati. La voce locale va mantenuta per le prove di
sviluppo.

La tabella `public.staff_users` è la lista degli account autorizzati. Anche se
un utente Supabase si autentica, senza una riga in questa tabella non può vedere
i dati del ristorante. Per aggiungere in futuro altri membri dello staff:

1. In Supabase, aprire **Authentication → Users → Add user → Send invitation**.
2. Dopo che l’invito ha creato l’utente, copiarne l’ID dalla pagina Users.
3. Nel **SQL Editor**, eseguire `insert into public.staff_users (user_id) values ('UUID-UTENTE') on conflict do nothing;`, sostituendo l’ID copiato.

Se l’invito arriva mentre il server locale è spento, avviare `npm run dev`
prima di aprire il link. Un invito scaduto va inviato di nuovo da Supabase.

L’area staff può creare prenotazioni, cambiare stato e tavolo, modificare la
planimetria e gestire note ed etichette dei clienti. La sala si aggiorna tra
dispositivi con Supabase Realtime. Dal dettaglio di una prenotazione con
cellulare italiano, lo staff può aprire WhatsApp con la conferma precompilata:
il messaggio va controllato e inviato manualmente. Le modifiche alle
prenotazioni non inviano messaggi automatici.

## Aprire o bloccare le prenotazioni online per una data

In **Staff → Sala e prenotazioni**, scegliere la data. Il riquadro
**Prenotazioni online** mostra lo stato di pranzo e cena e permette di:

- usare **Blocca pranzo** o **Blocca cena** per sospendere un solo servizio;
- usare **Blocca intera giornata** per sospenderli entrambi con una sola operazione;
- usare **Apri pranzo**, **Apri cena** o **Apri intera giornata**, anche quando il calendario settimanale prevede la chiusura;
- usare **Usa calendario** per un servizio o **Ripristina calendario** per la giornata per eliminare le eccezioni e tornare agli orari settimanali.

Il blocco riguarda le nuove richieste online della sola data selezionata.
Richieste già ricevute, approvazioni e prenotazioni manuali restano gestibili.
Le aperture straordinarie valgono per la sola data e i servizi selezionati:
aprire il pranzo di un giovedì non apre la cena né gli altri giovedì.
Gli orari già trascorsi e i tavoli occupati restano non prenotabili. Durante
l'apertura straordinaria lo staff può inserire anche prenotazioni manuali.
Le date passate sono consultabili ma non modificabili.
Lo stato si aggiorna sugli altri dispositivi staff tramite Realtime e al
ritorno nella pagina.

Il cliente vede **Prenotazioni online sospese**, distinto da **Completo**,
anche nelle altre lingue. Se ha già aperto il modulo quando lo staff blocca
il servizio, il database rifiuta la nuova richiesta e il sito lo riporta
alla scelta del servizio conservando i contatti inseriti. Non parte alcuna email.

I blocchi richiedono `supabase/migrations/20261010000100_booking_blocks.sql`.
Le aperture straordinarie richiedono inoltre
`supabase/migrations/20261015081045_booking_opening_overrides.sql`, da applicare
prima della pubblicazione del codice. La nuova migrazione conserva i blocchi
esistenti e aggiunge alla stessa tabella il campo `blocked`: `true` sospende
le nuove richieste online, `false` apre il servizio, nessuna riga usa il
calendario normale. La RPC `set_booking_override` è riservata allo staff;
la precedente `set_booking_block` conserva il comportamento originale.
I controlli transazionali coprono entrambe le RPC pubbliche e gli inserimenti
diretti. Il modulo pubblico verifica il database anche nei giorni normalmente
chiusi. La risposta di disponibilità include `opened` oltre a `blocked`.
Le prenotazioni presenti restano gestibili anche dopo il ripristino del
calendario. Nessuna nuova dipendenza viene aggiunta all'app.

Per verificare le regole pubbliche e gli endpoint con servizi simulati:

```powershell
cd web
node --test scripts/public-booking.test.mjs scripts/public-booking-api.test.mjs
```

`supabase/verify_booking_blocks.sql` verifica permessi, blocchi, riattivazioni
e conservazione delle prenotazioni su un database **locale** con tutte le
migrazioni applicate. Va eseguito come `postgres`; i dati di prova vengono
annullati dal `ROLLBACK` finale. Non invia email.

`supabase/verify_booking_openings.sql` aggiunge le verifiche di apertura
del pranzo di giovedì, apertura della giornata e della domenica sera,
blocco successivo, ripristino del calendario, prenotazioni manuali e
pubbliche, conservazione delle richieste e accesso riservato allo staff.
Anche questo script va eseguito come `postgres` su un database locale.

Il 10 ottobre 2026, dopo il push su `main` eseguito dal titolare, la migrazione
è stata applicata al progetto Supabase collegato. Verificati permessi, RLS,
trigger, Realtime e risposta della disponibilità sul dominio pubblico
(HTTP 200 con il campo `blocked`). Tutte le migrazioni risultano allineate.
I controlli online sono stati in sola lettura: nessuna prenotazione di prova,
attivazione di blocchi o email inviata.

## Conferma email facoltativa

Gli avvisi delle nuove richieste allo staff vengono inviati a
`prenotazioni@lacantinadeibriganti.com` e `la.cantina.dei.briganti23@gmail.com`.
`RESEND_STAFF_EMAIL` può contenere più destinatari separati da virgola; se manca
si usa la casella prenotazioni. La copia Gmail è sempre inclusa, anche con la
precedente configurazione a un solo destinatario, senza invii duplicati.
Il registro Notifiche riporta entrambi i destinatari nello stesso tentativo.
La modifica richiede la pubblicazione del codice su Netlify per essere attiva online.

L'indirizzo email nel modulo pubblico è facoltativo. Se il cliente lo inserisce
e Resend è configurato, l'app invia la conferma e registra l'esito in
`public.notifications`. Se manca l'email, il cliente vede la conferma e il
codice sul sito. Se l'invio fallisce, la prenotazione resta confermata e il
sito mostra chiaramente che l'email non è stata inviata.

Per attivare l'invio:

1. Usa il dominio verificato `lacantinadeibriganti.com` nell'account Resend.
2. Crea una chiave API Resend con permesso di solo invio per questo dominio.
3. Aggiungi `RESEND_API_KEY` e `RESEND_FROM_EMAIL` in `web/.env.local`, seguendo
   `web/.env.example`. L'indirizzo mittente deve appartenere al dominio verificato.
4. Riavvia `npm run dev` e prova una prenotazione con un tuo indirizzo email.
   Controlla la pagina di conferma, la casella di posta e la tabella
   `public.notifications` su Supabase.

Le chiavi restano solo in `.env.local`, escluso da Git. Le prove locali hanno
confermato sia l'invio con email sia l'assenza di invio senza email; le
prenotazioni tecniche sono state eliminate. Per il deploy, aggiungere le
variabili Resend anche alle impostazioni server di Netlify. WhatsApp resta
manuale e non richiede un provider a pagamento.

I contatori **Coperti**, **Prenotazioni**, **Tavoli liberi** e **Prossimo arrivo**
riguardano solo la data e il servizio selezionati in **Sala**. Il CRM **Clienti**
mostra invece lo storico completo. La Sala apre automaticamente il pranzo o la
cena corrente secondo l'ora di Mola di Bari e mostra le tre prenotazioni online più
recenti: premendo **Apri servizio** si passa alla data e al servizio corretti.

## Gestione della prenotazione da parte del cliente

`/prenota/gestisci` permette di cercare una prenotazione fatta sul sito con il
solo codice, senza account. Le prenotazioni inserite dallo staff restano gestite
tramite contatto diretto. Il collegamento compare in `/prenota`, dopo l'invio e
nelle conferme online, anche con modelli email personalizzati già salvati.

- **Cancellazione:** richiede una conferma esplicita, libera il tavolo, conserva
  lo storico e avvisa le due caselle staff già configurate.
- **Note:** mantiene lo stato della prenotazione e avvisa lo staff con testo
  precedente e nuovo; nuove note non vuote richiedono consenso separato.
- **Data, servizio, orario o persone:** annulla la precedente e crea una nuova
  richiesta `in_attesa`, con nuovo codice e nuova approvazione manuale. Le due
  scritture avvengono nella stessa transazione: se la nuova richiesta non può
  essere salvata, la precedente resta valida. Funziona anche quando il tavolo
  originale è l'ultimo disponibile per lo stesso servizio.

Le operazioni sono disponibili prima dell'orario di arrivo e solo per richieste
in attesa o confermate. La Sala distingue cancellazioni cliente, sostituzioni e
richieste da riconfermare; mostra lo storico prima/dopo. Una prenotazione
cancellata dal cliente non può essere ripristinata. Le versioni impediscono che
una pagina aperta da tempo sovrascriva un aggiornamento cliente o staff.

Ogni nuova prenotazione riceve un codice casuale di 16 caratteri. I codici
storici di sei caratteri restano compatibili. Il codice è una chiave di accesso:
chi lo conosce può consultare i dettagli e le note. Non viene salvato nei cookie
o negli archivi persistenti del browser né incluso nei collegamenti pubblici.
Se la risposta a una
sostituzione va persa, una ricerca con il vecchio codice recupera la richiesta
più recente. La ricerca restituisce solo riepilogo e note, senza telefono,
email, tavolo o identificativi interni.

L'API usa solo il server e RPC riservate a `service_role`; le tabelle sensibili
restano protette da RLS. La gestione limita gli accessi a cinque al minuto e
venti all'ora per IP con un controllo persistente nel database e un limite
aggiuntivo Netlify. L'identità usa l'header Netlify
`x-nf-client-connection-ip`; vengono salvate solo impronte HMAC, con scadenza
un'ora e rimozione delle impronte scadute nelle richieste successive. Fuori da
localhost la route richiede `NETLIFY=true` e un IP Netlify valido, altrimenti
rifiuta l'accesso. Non usa `X-Forwarded-For` fornito dal visitatore.

L'evento viene registrato nella stessa transazione della modifica. Il tentativo
email ha una chiave univoca per evento e una chiave di idempotenza Resend.
Un invio fallito non annulla la modifica: l'evento rimane nella Sala e il
tentativo fallito nel registro Notifiche. Non è previsto un reinvio automatico;
un arresto del processo prima del tentativo conserva comunque l'evento.

**Attivazione online:** questa modifica locale richiede la migrazione
`20261017154813_customer_reservation_management.sql` e un deploy del codice.
Applicare prima le migrazioni mancanti dopo l'anteprima `db push --dry-run`, poi
pubblicare il codice e ricaricare le pagine staff già aperte. Nessuna variabile
segreta nuova è richiesta; i destinatari e le chiavi Supabase/Resend restano
quelli esistenti. Verificare sul dominio pubblico un flusso completo concordato
con il titolare, inclusi recapito email e aggiornamenti Realtime. Non creare
prenotazioni o inviare email reali senza autorizzazione.

Verifiche locali ripetibili da `web/`:

```powershell
node --test scripts/*.test.mjs
npm run lint
npm run build
```

`web/scripts/verify-customer-management.mjs` applica tutte le migrazioni in un
Postgres PGlite isolato e verifica transazioni, permessi, consenso, recupero e
limiti. Richiede `@electric-sql/pglite` disponibile localmente oppure
`PGLITE_MODULE_PATH` impostato sul percorso assoluto di `dist/index.js` del
modulo; non legge `.env.local` e non accede al database online. PGlite non prova
gare reali tra connessioni parallele: eventuali deadlock con spostamenti diretti
dello staff producono rollback e HTTP 409, richiedendo una rilettura dello stato.

Riferimenti: [permessi delle funzioni Supabase](https://supabase.com/docs/guides/database/functions),
[limiti Netlify](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/).

## Controllo periodico di Supabase

`web/netlify/functions/supabase-keepalive.mjs` legge al massimo un ID dalle
categorie pubbliche del menù ogni sei ore (00:17, 06:17, 12:17 e 18:17 UTC).
La lettura genera attività reale sul database anche quando nessuno visita il
sito e il PC è spento. Usa solo `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, senza dati cliente o chiavi privilegiate.
Le due variabili devono essere disponibili anche alle Functions su Netlify.

Il controllo si attiva soltanto dopo un deploy di produzione contenente questa
funzione; una modifica locale o un'anteprima non attiva il calendario. Dopo il
deploy, verificare in **Netlify → Functions → supabase-keepalive** la presenza
della pianificazione e usare **Run now**: nei log deve comparire
`Controllo Supabase completato: database raggiungibile.` Errori HTTP, risposte
inattese e richieste oltre dieci secondi fanno fallire l'esecuzione nei log.

Le Scheduled Functions sono disponibili anche nel piano gratuito Netlify e
consumano le normali quote di richieste e calcolo. Il controllo può prevenire
la pausa Supabase per scarsa attività, ma non garantisce disponibilità continua
sui piani gratuiti e non riattiva un progetto già sospeso. Supabase indica che
in genere bastano poche richieste al database al giorno; per escludere la pausa
automatica serve un piano a pagamento.

Riferimenti: [pausa dei progetti Supabase](https://supabase.com/docs/guides/platform/free-project-pausing)
e [Scheduled Functions Netlify](https://docs.netlify.com/build/functions/scheduled-functions/).

## Applicare il database di sviluppo su Supabase

La CLI è installata nel progetto `web/`. Eseguire questi comandi dalla
**cartella principale della repository**, non da `web/`:

```powershell
.\web\node_modules\.bin\supabase.cmd login
.\web\node_modules\.bin\supabase.cmd link --project-ref <project-ref>
.\web\node_modules\.bin\supabase.cmd db push --dry-run
.\web\node_modules\.bin\supabase.cmd db push
```

`login` apre l'accesso al proprio account; `link` chiede la password del
database scelta alla creazione del progetto. Non inserirla nei file del
progetto o in chat. Controllare l'anteprima di `db push --dry-run` prima del
comando finale. Le migrazioni creano schema, permessi, tavoli e funzioni di
prenotazione; non serve incollare SQL manualmente nella Dashboard.

## Controlli della messa online

L'informativa in `/privacy` usa i dati legali forniti dal titolare e descrive la
conservazione per 24 mesi dall'ultima prenotazione. La cancellazione è
programmata ogni giorno nel database con Supabase Cron. Il modulo richiede un
consenso separato quando il cliente scrive note facoltative, che possono
contenere allergie. Il sito è stato reso pubblico: resta da far rileggere
l'informativa al titolare. Per le informazioni sanitarie raccolte dallo staff
per telefono o di persona serve un comportamento coerente anche fuori dal sito.

Netlify ospita il sito. Una Edge Function limita a 5 al minuto gli invii del
modulo da uno stesso IP; il log del deploy `30dcbf3` conferma che Netlify ha
applicato la regola. Il dominio è configurato in Netlify e nella zona DNS OVH
senza cambiare i record della posta; gli URL di Supabase Auth sono aggiornati e
il progetto Netlify è pubblico. Restano da verificare l'emissione del
certificato HTTPS sul dominio e una prenotazione con conferma email sul sito
pubblicato. SMS e promemoria automatici non sono attivi.

Per provare e ricreare il database **locale** occorre anche Docker Desktop:

```powershell
.\web\node_modules\.bin\supabase.cmd start
.\web\node_modules\.bin\supabase.cmd db reset
```

`db reset` senza `--linked` agisce sul database locale. Non eseguire
`db reset --linked` sul progetto online: cancellerebbe i dati remoti.

## Verifiche della fase 1

- `npm run lint` e `npm run build` dalla cartella principale completano
  senza errori.
- Nella Dashboard Supabase, `public.tables` contiene esattamente 10 tavoli
  (T1–T10), con zone, posti e coordinate del prototipo.
- Il database rifiuta due prenotazioni attive per lo stesso tavolo, data e
  servizio. Pranzo e cena possono invece usare lo stesso tavolo nello stesso
  giorno.
- Le tabelle non sono leggibili direttamente dal ruolo pubblico `anon`.

`supabase/verify_phase1.sql` contiene queste verifiche in una transazione:
si può eseguire nel SQL Editor del progetto di sviluppo dopo `db push` e le
prenotazioni di prova vengono eliminate dal `ROLLBACK` finale.

La chiave pubblicabile identifica l'applicazione; l'accesso ai dati dipende
anche dai permessi SQL e dalle regole RLS definite nella prima migrazione.
