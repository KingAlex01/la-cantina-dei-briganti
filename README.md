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

## Conferma email facoltativa

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
