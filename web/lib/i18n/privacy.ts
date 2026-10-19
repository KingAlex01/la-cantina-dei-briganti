import type { SiteLanguage } from "./languages";

type PrivacyContent = {
  metadataTitle: string;
  metadataDescription: string;
  back: string;
  title: string;
  introduction: string;
  updated: string;
  languageUpdated: string;
  authority: string;
  home: string;
  sections: { title: string; paragraphs: string[] }[];
};

export const privacyContent: Record<SiteLanguage, PrivacyContent> = {
  it: {
    metadataTitle: "Privacy prenotazioni | La cantina dei briganti",
    metadataDescription: "Come trattiamo i dati inseriti per prenotare un tavolo.",
    back: "Torna alla prenotazione",
    title: "Informativa privacy",
    introduction: "Per le prenotazioni online e la gestione dei clienti del ristorante.",
    updated: "Aggiornata il 19 ottobre 2026",
    languageUpdated: "Informazioni sulla preferenza lingua aggiunte il 9 ottobre 2026",
    authority: "Garante per la protezione dei dati personali",
    home: "Pagina iniziale",
    sections: [
      {
        title: "Chi gestisce i dati",
        paragraphs: ["Il titolare del trattamento è {controller}, Via Nazario Sauro n. 32, 70042 Mola di Bari (BA), P. IVA 08788760729. Per domande o richieste sui tuoi dati scrivi a {email}."],
      },
      {
        title: "Finalità del trattamento e basi giuridiche",
        paragraphs: [
          "Per prenotare chiediamo nome e cognome e cellulare. Registriamo data, servizio, orario, numero di persone, tavolo e stato della prenotazione. Servono per riservare il tavolo e contattarti in caso di necessità: il trattamento è necessario per gestire la tua richiesta di prenotazione (art. 6, par. 1, lett. b, GDPR). Senza questi dati non possiamo completarla. Il codice permette di consultare e gestire la prenotazione effettuata sul sito: tienilo riservato, perché chi lo conosce può usarlo. Registriamo modifiche, cancellazioni e note prima e dopo gli aggiornamenti in uno storico riservato allo staff autorizzato, conservato per lo stesso periodo della prenotazione.",
          "L’email è facoltativa. Se la inserisci, la usiamo per inviarti la conferma della prenotazione; non inviamo pubblicità. Il personale autorizzato può vedere le prenotazioni, lo storico delle visite e le preferenze annotate per organizzare il servizio ai clienti abituali. Per la gestione di questo storico facciamo riferimento al legittimo interesse del ristorante (art. 6, par. 1, lett. f, GDPR); puoi opporti scrivendoci.",
          "Anche le note sono facoltative. Possono contenere informazioni su allergie o intolleranze. Se le compili, ti chiediamo un consenso esplicito separato per usarle solo nell’organizzazione della tua visita (art. 9, par. 2, lett. a, GDPR). Puoi prenotare senza note e puoi revocare il consenso scrivendoci; la revoca non cambia la liceità dell’uso precedente.",
          "Per gestire la prenotazione inviamo allo staff notifiche delle nuove richieste, delle modifiche e delle cancellazioni con i recapiti e i dettagli della prenotazione, comprese le note eventualmente inserite. Per i dati ordinari vale la base giuridica della gestione della prenotazione indicata sopra; per eventuali dati sulla salute nelle note vale il consenso esplicito separato.",
        ],
      },
      {
        title: "Chi può riceverli",
        paragraphs: [
          "Accede ai dati soltanto il personale autorizzato del ristorante. Per far funzionare il servizio usiamo Supabase per il database, Netlify per il sito e Resend per inviare la conferma quando fornisci l’email. Le comunicazioni inviate alla casella del ristorante sono gestite con il servizio email di OVHcloud. Questi fornitori trattano i dati necessari a svolgere i rispettivi servizi. Alcuni trattamenti possono comportare trasferimenti fuori dallo Spazio economico europeo; puoi chiederci informazioni sulle garanzie applicabili.",
          "Resend viene utilizzato anche per le notifiche allo staff. Gli avvisi sono inviati alle caselle dello staff configurate per il servizio e anche a una casella Gmail gratuita di Google. Le copie delle email possono contenere i recapiti, i dettagli della prenotazione e le note. Per Gmail gratuito si applicano le condizioni e l’informativa di Google: {googlePrivacy}.",
          "Per i dati che affidiamo loro nell’erogazione del servizio, Supabase, Netlify, Resend e OVHcloud operano come responsabili del trattamento secondo i rispettivi accordi sul trattamento dei dati. Puoi consultarli qui: {supabaseDpa}, {netlifyDpa}, {resendDpa}, {ovhDpa}.",
          "L’uso dei fornitori può comportare trattamenti fuori dallo Spazio economico europeo, inclusi gli Stati Uniti. Gli accordi di Supabase e Resend prevedono le clausole contrattuali tipo della Commissione europea; quello di Netlify prevede il Data Privacy Framework UE-USA per i trasferimenti coperti e le clausole tipo nei casi previsti dall’accordo. Per eventuali trasferimenti di OVHcloud verso Paesi privi di una decisione di adeguatezza il relativo accordo prevede le clausole tipo. Google descrive le proprie decisioni di adeguatezza, la certificazione Data Privacy Framework e le clausole tipo in {googleTransfers}. Puoi chiedere informazioni o copia delle garanzie pertinenti scrivendo a {email}.",
        ],
      },
      {
        title: "Per quanto tempo",
        paragraphs: [
          "Conserviamo la scheda cliente, le prenotazioni collegate e le relative notifiche fino a 24 mesi dopo la data dell’ultima prenotazione. Una prenotazione senza scheda cliente viene conservata fino a 24 mesi dalla data del servizio. Il database elimina automaticamente i dati scaduti ogni giorno. Eventuali dati tecnici conservati dai fornitori seguono i loro tempi di conservazione.",
          "Il termine di 24 mesi riguarda i dati nel database; la loro cancellazione non elimina automaticamente le copie delle email nelle caselle di posta o i log dei fornitori. Per le email di prenotazione gestite dal ristorante, comprese le note, adottiamo un termine di cancellazione entro 30 giorni dalla data prevista per la visita, anche in caso di mancata presentazione o richiesta rimasta in attesa. Se la prenotazione viene annullata o rifiutata prima di tale data, il termine decorre dalla cancellazione o dal rifiuto. Sono comprese le copie nelle caselle OVHcloud e Gmail e quelle scaricate sui dispositivi del personale. Un’eventuale conservazione ulteriore è limitata ai dati necessari per uno specifico obbligo di legge o per una contestazione concreta, per il tempo richiesto da tale obbligo o dalla gestione della contestazione.",
          "Nel piano Supabase Free i log API e database sono conservati per un giorno. Il piano non comprende backup giornalieri del database messi a disposizione del cliente. Riferimenti: {supabaseLogs} e {supabaseBackups}.",
          "Nel piano Resend Free i messaggi e i relativi log sono conservati per 30 giorni e i backup per sette giorni, secondo la documentazione del servizio: {resendRetention}.",
          "Netlify mette a disposizione log delle funzioni e delle funzioni edge per una finestra fino a sette giorni, secondo il piano e il tipo di log; per il piano Personal i dati di monitoraggio tecnico Observability sono consultabili nelle ultime 24 ore. Queste finestre di consultazione non indicano necessariamente la cancellazione di ogni copia interna del fornitore. L’eventuale conservazione residua segue i cicli di eliminazione del servizio e le esigenze di sicurezza, ripristino e obblighi di legge previste dal relativo accordo. Riferimenti: {netlifyLogs}, {netlifyObservability} e {netlifyDpa}. Puoi richiedere al titolare informazioni sui dati che ti riguardano e sui relativi tempi scrivendo a {email}.",
          "La cancellazione dalle caselle non coincide con l’immediata rimozione da tutti i sistemi dei fornitori. Google indica che la procedura di eliminazione richiede in genere circa due mesi e che copie cifrate di backup possono rimanere fino a sei mesi, salve le eccezioni descritte nelle sue regole: {googleRetention}.",
        ],
      },
      {
        title: "Lingua e controlli tecnici",
        paragraphs: [
          "Quando scegli manualmente la lingua, un cookie tecnico (cantina_language) ricorda la preferenza per un anno. Non è usato per pubblicità o tracciamento. Per limitare i tentativi di accesso alla gestione delle prenotazioni salviamo un’impronta HMAC dell’indirizzo IP, senza conservare l’IP in chiaro nel relativo registro. L’impronta scade dopo un’ora dall’ultimo tentativo ammesso e viene rimossa durante le richieste successive.",
          "La lingua iniziale può essere ricavata anche dalla preferenza trasmessa dal browser (Accept-Language). Questi trattamenti servono a presentare il sito nella lingua richiesta; i controlli sugli accessi servono a proteggere le prenotazioni e prevenire gli abusi. La base giuridica è il legittimo interesse del ristorante a fornire un sito funzionante e sicuro (art. 6, par. 1, lett. f, GDPR). Il cookie di preferenza è tecnico e non richiede il consenso previsto per i cookie di profilazione. Non usiamo nel sito strumenti di analisi statistica, pixel pubblicitari o tracciamento a fini di marketing.",
          "Netlify applica inoltre limiti alle richieste basati sull’indirizzo IP. Per il funzionamento e la diagnosi degli errori, i servizi di hosting e database trattano dati tecnici delle richieste e dei log, che possono comprendere indirizzo IP, data e ora, risorsa richiesta, esito, codici di errore e identificativi delle operazioni. Anche questi trattamenti si basano sul legittimo interesse alla sicurezza e alla continuità del servizio. Nell’area riservata allo staff sono memorizzati nel browser anche i dati tecnici di autenticazione necessari a mantenere la sessione, fino alla disconnessione o alla loro cancellazione dal browser.",
        ],
      },
      {
        title: "I tuoi diritti",
        paragraphs: [
          "Puoi chiedere accesso, correzione o cancellazione dei dati, la limitazione del trattamento e, quando applicabile, la portabilità. Puoi opporti al trattamento fondato sul legittimo interesse e revocare il consenso alle note. Scrivi a {email}. Hai anche il diritto di presentare un reclamo al {authority}.",
          "L’accesso ti permette di sapere quali dati trattiamo e di riceverne una copia; la rettifica permette di correggere quelli inesatti o incompleti. Nei casi previsti dal GDPR puoi chiedere la cancellazione o la limitazione del loro uso. Quando il trattamento è automatizzato e si basa sul consenso o su un contratto, puoi ricevere i dati che ci hai fornito in un formato strutturato e leggibile da un dispositivo e chiedere di trasmetterli a un altro titolare, se tecnicamente possibile. Per opporti al trattamento basato sul legittimo interesse puoi comunicarci i motivi legati alla tua situazione particolare. Puoi revocare il consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento già effettuato.",
          "Per esercitare i diritti puoi scrivere a {email}. Rispondiamo senza ingiustificato ritardo e, di regola, entro un mese dal ricevimento. Se necessario per la complessità o il numero delle richieste, il termine può essere prorogato di altri due mesi: ti informeremo della proroga e dei motivi entro il primo mese. Le richieste sono di regola gratuite, salvo le eccezioni previste dal GDPR. Il reclamo al {authority} può essere presentato anche indipendentemente da una richiesta al ristorante.",
        ],
      },
      {
        title: "Responsabile della protezione dei dati e decisioni automatizzate",
        paragraphs: [
          "Il titolare non ha nominato un responsabile della protezione dei dati (RPD/DPO). Per ogni richiesta relativa al trattamento dei dati personali puoi contattare direttamente il titolare scrivendo a {email}.",
          "Le richieste di prenotazione sono confermate o rifiutate dal personale del ristorante. Il sistema verifica automaticamente orari, aperture, disponibilità e capienza dei tavoli e assegna un tavolo provvisorio; queste verifiche non utilizzano valutazioni o punteggi del cliente. Nell’area riservata lo staff può consultare lo storico, il numero delle visite e delle mancate presentazioni e annotare preferenze ed etichette per organizzare il servizio. Questi dati non determinano automaticamente l’accettazione o il rifiuto della prenotazione: l’approvazione finale non è affidata a una decisione esclusivamente automatizzata.",
        ],
      },
    ],
  },
  en: {
    metadataTitle: "Booking privacy | La cantina dei briganti",
    metadataDescription: "How we process the data you provide to book a table.",
    back: "Back to booking",
    title: "Privacy notice",
    introduction: "For online bookings and the management of restaurant customers.",
    updated: "Updated on 19 October 2026",
    languageUpdated: "Language preference information added on 9 October 2026",
    authority: "Italian Data Protection Authority",
    home: "Home",
    sections: [
      {
        title: "Who manages your data",
        paragraphs: ["The data controller is {controller}, Via Nazario Sauro n. 32, 70042 Mola di Bari (BA), VAT number 08788760729. For questions or requests about your data, write to {email}."],
      },
      {
        title: "Purposes of processing and legal bases",
        paragraphs: [
          "To book, we ask for your first and last name and mobile number. We record the date, lunch or dinner service, arrival time, number of guests, table and booking status. These details are needed to reserve your table and contact you if necessary: processing is necessary to handle your booking request (Article 6(1)(b), GDPR). Without this data, we cannot complete it. Your code lets you view and manage a booking made on this website: keep it confidential, as anyone who knows it can use it. We record changes, cancellations and notes before and after updates in a history available only to authorised staff, kept for the same period as the booking.",
          "Your email address is optional. If you provide it, we use it to send your booking confirmation; we do not send advertising. Authorised staff can view bookings, visit history and recorded preferences to organise service for regular customers. We rely on the restaurant’s legitimate interest to manage this history (Article 6(1)(f), GDPR); you can object by writing to us.",
          "Notes are also optional. They may contain information about allergies or intolerances. If you add notes, we ask for separate explicit consent to use them solely to organise your visit (Article 9(2)(a), GDPR). You can book without notes and withdraw your consent by writing to us; withdrawal does not affect the lawfulness of previous use.",
          "To manage bookings, we send staff notifications of new requests, changes and cancellations with contact details and booking information, including any notes provided. The legal basis stated above for managing bookings applies to ordinary personal data; separate explicit consent applies to any health data in the notes.",
        ],
      },
      {
        title: "Who may receive your data",
        paragraphs: [
          "Only authorised restaurant staff can access the data. To operate the service, we use Supabase for the database, Netlify for the website and Resend to send confirmation when you provide your email address. Messages sent to the restaurant’s mailbox are managed through OVHcloud’s email service. These providers process the data needed to deliver their respective services. Some processing may involve transfers outside the European Economic Area; you can ask us for information about the applicable safeguards.",
          "Resend is also used for staff notifications. Alerts are sent to the staff mailboxes configured for the service and to a free Google Gmail account. Email copies may contain contact details, booking details and notes. Google's terms and privacy policy apply to free Gmail: {googlePrivacy}.",
          "For the data we entrust to them to provide the service, Supabase, Netlify, Resend and OVHcloud act as data processors under their respective data processing agreements. You can read them here: {supabaseDpa}, {netlifyDpa}, {resendDpa}, {ovhDpa}.",
          "Using these providers may involve processing outside the European Economic Area, including in the United States. The Supabase and Resend agreements provide for the European Commission's standard contractual clauses; Netlify's agreement provides for the EU-US Data Privacy Framework for covered transfers and standard contractual clauses in the cases specified in the agreement. For any OVHcloud transfers to countries without an adequacy decision, its agreement provides for standard contractual clauses. Google describes the adequacy decisions it relies on, its Data Privacy Framework certification and standard contractual clauses at {googleTransfers}. You can request information or a copy of the relevant safeguards by writing to {email}.",
        ],
      },
      {
        title: "How long we keep your data",
        paragraphs: [
          "We keep your customer record, linked bookings and related notifications for up to 24 months after the date of your last booking. A booking without a customer record is kept for up to 24 months from the date of the service. The database automatically deletes expired data every day. Any technical data retained by providers is subject to their own retention periods.",
          "The 24-month period applies to data in the database; deleting it does not automatically delete email copies in mailboxes or provider logs. For booking emails managed by the restaurant, including notes, we adopt a deletion deadline of within 30 days after the scheduled visit date, including in the event of a no-show or a request that remains pending. If the booking is cancelled or declined before that date, this period starts from the cancellation or refusal. This includes copies in OVHcloud and Gmail mailboxes and copies downloaded to staff devices. Any further retention is limited to the data necessary for a specific legal obligation or an actual dispute, for the time required by that obligation or to handle the dispute.",
          "On the Supabase Free plan, API and database logs are retained for one day. The plan does not include daily database backups made available to the customer. References: {supabaseLogs} and {supabaseBackups}.",
          "On the Resend Free plan, messages and their logs are retained for 30 days and backups for seven days, according to the service documentation: {resendRetention}.",
          "Netlify makes function and edge function logs available for a viewing window of up to seven days, depending on the plan and log type; on the Personal plan, technical monitoring data in Observability can be viewed for the last 24 hours. These viewing windows do not necessarily mean that every internal copy held by the provider has been deleted. Any remaining retention follows the service's deletion cycles and the security, recovery and legal obligation requirements set out in the relevant agreement. References: {netlifyLogs}, {netlifyObservability} and {netlifyDpa}. You can ask the data controller for information about your data and its retention periods by writing to {email}.",
          "Deleting messages from mailboxes does not mean they are immediately removed from all provider systems. Google states that the deletion process generally takes around two months and that encrypted backup copies may remain for up to six months, subject to the exceptions described in its policies: {googleRetention}.",
        ],
      },
      {
        title: "Language and technical controls",
        paragraphs: [
          "When you choose a language manually, a technical cookie (cantina_language) remembers your preference for one year. It is not used for advertising or tracking. To limit attempts to access booking management, we store an HMAC fingerprint of the IP address without storing the raw IP address in that register. The fingerprint expires one hour after the last allowed attempt and is removed during subsequent requests.",
          "The initial language may also be determined from the preference sent by the browser (Accept-Language). This processing displays the site in the requested language; access controls protect bookings and prevent abuse. The legal basis is the restaurant's legitimate interest in providing a functioning and secure website (Article 6(1)(f) GDPR). The preference cookie is a technical cookie and does not require the consent required for profiling cookies. We do not use statistical analytics tools, advertising pixels or tracking for marketing purposes on the site.",
          "Netlify also applies request limits based on IP addresses. To operate the service and diagnose errors, the hosting and database services process technical request and log data, which may include IP address, date and time, requested resource, outcome, error codes and operation identifiers. This processing is also based on the legitimate interest in security and service continuity. In the staff-only area, the technical authentication data needed to maintain the session is also stored in the browser until logout or deletion from the browser.",
        ],
      },
      {
        title: "Your rights",
        paragraphs: [
          "You can request access to, correction or deletion of your data, restriction of processing and, where applicable, data portability. You can object to processing based on legitimate interest and withdraw your consent for notes. Write to {email}. You also have the right to lodge a complaint with the {authority}.",
          "Access lets you find out which data we process and receive a copy; rectification lets you correct inaccurate or incomplete data. In the cases provided for by the GDPR, you can request erasure or restriction of use. Where processing is automated and based on consent or a contract, you can receive the data you provided in a structured, machine-readable format and request transmission to another controller where technically feasible. To object to processing based on legitimate interest, you can explain grounds relating to your particular situation. You may withdraw consent at any time without affecting the lawfulness of processing already carried out.",
          "To exercise your rights, write to {email}. We respond without undue delay and normally within one month of receipt. Where necessary because of the complexity or number of requests, this may be extended by two further months: we will tell you about the extension and its reasons within the first month. Requests are normally free, subject to the exceptions provided for by the GDPR. A complaint to the {authority} may also be lodged independently of any request to the restaurant.",
        ],
      },
      {
        title: "Data protection officer and automated decisions",
        paragraphs: [
          "The data controller has not appointed a Data Protection Officer (DPO). For any request concerning the processing of personal data, you can contact the controller directly by writing to {email}.",
          "Booking requests are confirmed or declined by restaurant staff. The system automatically checks opening times, opening dates, availability and table capacity and provisionally assigns a table; these checks do not use customer assessments or scores. In the staff-only area, staff can view booking history and the number of visits and no-shows, and record preferences and labels to organise the service. These data do not automatically determine whether a booking is accepted or declined: final approval is not based on a solely automated decision.",
        ],
      },
    ],
  },
  es: {
    metadataTitle: "Privacidad de las reservas | La cantina dei briganti",
    metadataDescription: "Cómo tratamos los datos que facilitas para reservar una mesa.",
    back: "Volver a la reserva",
    title: "Aviso de privacidad",
    introduction: "Para las reservas en línea y la gestión de los clientes del restaurante.",
    updated: "Actualizado el 19 de octubre de 2026",
    languageUpdated: "Información sobre la preferencia de idioma añadida el 9 de octubre de 2026",
    authority: "Autoridad italiana de protección de datos personales",
    home: "Página de inicio",
    sections: [
      {
        title: "Quién gestiona los datos",
        paragraphs: ["El responsable del tratamiento es {controller}, Via Nazario Sauro n. 32, 70042 Mola di Bari (BA), número de IVA 08788760729. Para preguntas o solicitudes sobre tus datos, escribe a {email}."],
      },
      {
        title: "Finalidades del tratamiento y bases jurídicas",
        paragraphs: [
          "Para reservar pedimos nombre, apellidos y número de móvil. Registramos la fecha, el servicio, la hora, el número de personas, la mesa y el estado de la reserva. Estos datos sirven para reservar la mesa y contactarte si es necesario: el tratamiento es necesario para gestionar tu solicitud de reserva (art. 6, apdo. 1, letra b, RGPD). Sin estos datos no podemos completarla. El código permite consultar y gestionar una reserva realizada en este sitio: mantenlo confidencial, ya que quien lo conozca puede usarlo. Registramos los cambios, las cancelaciones y las notas antes y después de las actualizaciones en un historial reservado al personal autorizado, conservado durante el mismo plazo que la reserva.",
          "El correo electrónico es opcional. Si lo facilitas, lo usamos para enviarte la confirmación de la reserva; no enviamos publicidad. El personal autorizado puede consultar las reservas, el historial de visitas y las preferencias anotadas para organizar el servicio a los clientes habituales. Para gestionar este historial nos basamos en el interés legítimo del restaurante (art. 6, apdo. 1, letra f, RGPD); puedes oponerte escribiéndonos.",
          "Las notas también son opcionales. Pueden contener información sobre alergias o intolerancias. Si las rellenas, te pedimos un consentimiento explícito separado para usarlas únicamente en la organización de tu visita (art. 9, apdo. 2, letra a, RGPD). Puedes reservar sin notas y retirar el consentimiento escribiéndonos; la retirada no afecta a la licitud del uso anterior.",
          "Para gestionar las reservas enviamos al personal avisos de nuevas solicitudes, cambios y cancelaciones con los datos de contacto y los detalles de la reserva, incluidas las notas facilitadas. A los datos ordinarios se aplica la base jurídica de gestión de reservas indicada anteriormente; a los posibles datos de salud en las notas se aplica el consentimiento explícito separado.",
        ],
      },
      {
        title: "Quién puede recibirlos",
        paragraphs: [
          "Solo el personal autorizado del restaurante accede a los datos. Para prestar el servicio usamos Supabase para la base de datos, Netlify para el sitio web y Resend para enviar la confirmación cuando facilitas tu correo electrónico. Las comunicaciones enviadas al buzón del restaurante se gestionan con el servicio de correo de OVHcloud. Estos proveedores tratan los datos necesarios para prestar sus respectivos servicios. Algunos tratamientos pueden implicar transferencias fuera del Espacio Económico Europeo; puedes solicitarnos información sobre las garantías aplicables.",
          "Resend también se utiliza para las notificaciones al personal. Los avisos se envían a los buzones del personal configurados para el servicio y también a una cuenta gratuita de Gmail de Google. Las copias de los correos pueden contener datos de contacto, detalles de la reserva y notas. A Gmail gratuito se le aplican las condiciones y la política de privacidad de Google: {googlePrivacy}.",
          "Respecto de los datos que les confiamos para prestar el servicio, Supabase, Netlify, Resend y OVHcloud actúan como encargados del tratamiento según sus respectivos acuerdos de tratamiento de datos. Puedes consultarlos aquí: {supabaseDpa}, {netlifyDpa}, {resendDpa}, {ovhDpa}.",
          "El uso de estos proveedores puede implicar tratamientos fuera del Espacio Económico Europeo, incluidos los Estados Unidos. Los acuerdos de Supabase y Resend contemplan las cláusulas contractuales tipo de la Comisión Europea; el de Netlify contempla el Marco de Privacidad de Datos UE-EE. UU. para las transferencias cubiertas y las cláusulas tipo en los casos previstos en el acuerdo. Para posibles transferencias de OVHcloud a países sin una decisión de adecuación, su acuerdo contempla las cláusulas tipo. Google describe las decisiones de adecuación en las que se basa, su certificación en el Marco de Privacidad de Datos y las cláusulas tipo en {googleTransfers}. Puedes solicitar información o una copia de las garantías pertinentes escribiendo a {email}.",
        ],
      },
      {
        title: "Durante cuánto tiempo",
        paragraphs: [
          "Conservamos la ficha de cliente, las reservas vinculadas y sus notificaciones hasta 24 meses después de la fecha de la última reserva. Una reserva sin ficha de cliente se conserva hasta 24 meses desde la fecha del servicio. La base de datos elimina automáticamente los datos caducados cada día. Los datos técnicos que puedan conservar los proveedores siguen sus propios plazos de conservación.",
          "El plazo de 24 meses se refiere a los datos de la base de datos; su eliminación no borra automáticamente las copias de los correos en los buzones ni los registros de los proveedores. Para los correos de reservas gestionados por el restaurante, incluidas las notas, adoptamos un plazo de eliminación de un máximo de 30 días desde la fecha prevista para la visita, también en caso de que el cliente no se presente o la solicitud siga pendiente. Si la reserva se cancela o se rechaza antes de esa fecha, el plazo empieza a contar desde la cancelación o el rechazo. Se incluyen las copias en los buzones de OVHcloud y Gmail y las descargadas en los dispositivos del personal. Cualquier conservación adicional se limita a los datos necesarios para una obligación legal específica o una controversia concreta, durante el tiempo que exija dicha obligación o la gestión de la controversia.",
          "En el plan Supabase Free, los registros de API y de base de datos se conservan durante un día. El plan no incluye copias de seguridad diarias de la base de datos puestas a disposición del cliente. Referencias: {supabaseLogs} y {supabaseBackups}.",
          "En el plan Resend Free, los mensajes y sus registros se conservan durante 30 días y las copias de seguridad durante siete días, según la documentación del servicio: {resendRetention}.",
          "Netlify permite consultar los registros de funciones y funciones edge durante un periodo de hasta siete días, según el plan y el tipo de registro; en el plan Personal, los datos de monitorización técnica de Observability pueden consultarse para las últimas 24 horas. Estos periodos de consulta no indican necesariamente que se haya eliminado cada copia interna del proveedor. La posible conservación residual sigue los ciclos de eliminación del servicio y las necesidades de seguridad, recuperación y cumplimiento de obligaciones legales previstas en el acuerdo correspondiente. Referencias: {netlifyLogs}, {netlifyObservability} y {netlifyDpa}. Puedes solicitar al responsable del tratamiento información sobre tus datos y sus plazos de conservación escribiendo a {email}.",
          "La eliminación de los buzones no supone la retirada inmediata de todos los sistemas de los proveedores. Google indica que el procedimiento de eliminación suele requerir unos dos meses y que las copias de seguridad cifradas pueden permanecer hasta seis meses, salvo las excepciones descritas en sus políticas: {googleRetention}.",
        ],
      },
      {
        title: "Idioma y controles técnicos",
        paragraphs: [
          "Cuando eliges el idioma manualmente, una cookie técnica (cantina_language) recuerda tu preferencia durante un año. No se utiliza para publicidad ni seguimiento. Para limitar los intentos de acceso a la gestión de reservas, guardamos una huella HMAC de la dirección IP sin conservar la IP en claro en ese registro. La huella caduca una hora después del último intento admitido y se elimina durante las solicitudes posteriores.",
          "El idioma inicial también puede obtenerse de la preferencia transmitida por el navegador (Accept-Language). Estos tratamientos permiten mostrar el sitio en el idioma solicitado; los controles de acceso sirven para proteger las reservas y prevenir abusos. La base jurídica es el interés legítimo del restaurante en ofrecer un sitio web operativo y seguro (art. 6, apartado 1, letra f, del RGPD). La cookie de preferencias es técnica y no requiere el consentimiento previsto para las cookies de elaboración de perfiles. No utilizamos en el sitio herramientas de análisis estadístico, píxeles publicitarios ni seguimiento con fines de marketing.",
          "Netlify también aplica límites a las solicitudes basados en la dirección IP. Para el funcionamiento y el diagnóstico de errores, los servicios de alojamiento y base de datos tratan datos técnicos de las solicitudes y los registros, que pueden incluir la dirección IP, la fecha y hora, el recurso solicitado, el resultado, los códigos de error y los identificadores de las operaciones. Estos tratamientos también se basan en el interés legítimo en la seguridad y la continuidad del servicio. En el área reservada al personal también se guardan en el navegador los datos técnicos de autenticación necesarios para mantener la sesión, hasta que se cierre la sesión o se eliminen del navegador.",
        ],
      },
      {
        title: "Tus derechos",
        paragraphs: [
          "Puedes solicitar el acceso, la rectificación o la supresión de los datos, la limitación del tratamiento y, cuando corresponda, la portabilidad. Puedes oponerte al tratamiento basado en el interés legítimo y retirar el consentimiento para las notas. Escribe a {email}. También tienes derecho a presentar una reclamación ante la {authority}.",
          "El acceso te permite saber qué datos tratamos y recibir una copia; la rectificación permite corregir los datos inexactos o incompletos. En los casos previstos por el RGPD puedes solicitar la supresión o la limitación de su uso. Cuando el tratamiento es automatizado y se basa en el consentimiento o en un contrato, puedes recibir los datos que nos has facilitado en un formato estructurado y de lectura mecánica y solicitar su transmisión a otro responsable, si es técnicamente posible. Para oponerte al tratamiento basado en el interés legítimo puedes comunicar los motivos relacionados con tu situación particular. Puedes retirar el consentimiento en cualquier momento sin afectar a la licitud del tratamiento ya realizado.",
          "Para ejercer tus derechos escribe a {email}. Respondemos sin dilación indebida y, por regla general, en el plazo de un mes desde la recepción. Si la complejidad o el número de solicitudes lo requieren, el plazo puede ampliarse dos meses más: te informaremos de la ampliación y de sus motivos dentro del primer mes. Las solicitudes son normalmente gratuitas, salvo las excepciones previstas por el RGPD. También puedes presentar una reclamación ante la {authority} con independencia de cualquier solicitud al restaurante.",
        ],
      },
      {
        title: "Delegado de protección de datos y decisiones automatizadas",
        paragraphs: [
          "El responsable del tratamiento no ha designado un delegado de protección de datos (DPD/DPO). Para cualquier solicitud relativa al tratamiento de datos personales, puedes contactar directamente con el responsable escribiendo a {email}.",
          "El personal del restaurante confirma o rechaza las solicitudes de reserva. El sistema comprueba automáticamente los horarios, los días de apertura, la disponibilidad y la capacidad de las mesas y asigna una mesa provisional; estas comprobaciones no utilizan valoraciones ni puntuaciones del cliente. En el área reservada, el personal puede consultar el historial, el número de visitas y de ausencias, y anotar preferencias y etiquetas para organizar el servicio. Estos datos no determinan automáticamente la aceptación o el rechazo de la reserva: la aprobación final no se basa en una decisión exclusivamente automatizada.",
        ],
      },
    ],
  },
  fr: {
    metadataTitle: "Confidentialité des réservations | La cantina dei briganti",
    metadataDescription: "Comment nous traitons les données fournies pour réserver une table.",
    back: "Retour à la réservation",
    title: "Politique de confidentialité",
    introduction: "Pour les réservations en ligne et la gestion des clients du restaurant.",
    updated: "Mise à jour le 19 octobre 2026",
    languageUpdated: "Informations sur la préférence de langue ajoutées le 9 octobre 2026",
    authority: "Autorité italienne de protection des données personnelles",
    home: "Accueil",
    sections: [
      {
        title: "Qui gère les données",
        paragraphs: ["Le responsable du traitement est {controller}, Via Nazario Sauro n. 32, 70042 Mola di Bari (BA), numéro de TVA 08788760729. Pour toute question ou demande concernant vos données, écrivez à {email}."],
      },
      {
        title: "Finalités du traitement et bases juridiques",
        paragraphs: [
          "Pour réserver, nous demandons votre prénom, votre nom et votre numéro de portable. Nous enregistrons la date, le service, l’heure, le nombre de personnes, la table et le statut de la réservation. Ces données servent à réserver la table et à vous contacter si nécessaire : le traitement est nécessaire pour gérer votre demande de réservation (art. 6, par. 1, point b, RGPD). Sans ces données, nous ne pouvons pas la finaliser. Le code permet de consulter et de gérer une réservation effectuée sur ce site : gardez-le confidentiel, car toute personne qui le connaît peut l’utiliser. Nous enregistrons les modifications, les annulations et les notes avant et après les mises à jour dans un historique réservé au personnel autorisé, conservé pendant la même durée que la réservation.",
          "L’adresse e-mail est facultative. Si vous la fournissez, nous l’utilisons pour vous envoyer la confirmation de réservation ; nous n’envoyons pas de publicité. Le personnel autorisé peut consulter les réservations, l’historique des visites et les préférences notées pour organiser le service aux clients habituels. Pour gérer cet historique, nous nous fondons sur l’intérêt légitime du restaurant (art. 6, par. 1, point f, RGPD) ; vous pouvez vous y opposer en nous écrivant.",
          "Les notes sont également facultatives. Elles peuvent contenir des informations sur des allergies ou des intolérances. Si vous les remplissez, nous vous demandons un consentement explicite distinct pour les utiliser uniquement afin d’organiser votre visite (art. 9, par. 2, point a, RGPD). Vous pouvez réserver sans notes et retirer votre consentement en nous écrivant ; le retrait ne change pas la licéité de l’utilisation antérieure.",
          "Pour gérer les réservations, nous envoyons au personnel des notifications de nouvelles demandes, de modifications et d’annulations avec les coordonnées et les détails de la réservation, y compris les notes éventuellement fournies. La base juridique de gestion des réservations indiquée ci-dessus s’applique aux données ordinaires ; le consentement explicite distinct s’applique aux éventuelles données de santé dans les notes.",
        ],
      },
      {
        title: "Qui peut les recevoir",
        paragraphs: [
          "Seul le personnel autorisé du restaurant accède aux données. Pour assurer le fonctionnement du service, nous utilisons Supabase pour la base de données, Netlify pour le site et Resend pour envoyer la confirmation lorsque vous fournissez votre adresse e-mail. Les messages envoyés à la boîte du restaurant sont gérés avec le service e-mail d’OVHcloud. Ces prestataires traitent les données nécessaires à leurs services respectifs. Certains traitements peuvent entraîner des transferts hors de l’Espace économique européen ; vous pouvez nous demander des informations sur les garanties applicables.",
          "Resend est également utilisé pour les notifications au personnel. Les alertes sont envoyées aux boîtes mail du personnel configurées pour le service ainsi qu’à un compte Gmail gratuit de Google. Les copies des e-mails peuvent contenir les coordonnées, les détails de la réservation et les notes. Les conditions et la politique de confidentialité de Google s’appliquent à Gmail gratuit : {googlePrivacy}.",
          "Pour les données que nous leur confions afin de fournir le service, Supabase, Netlify, Resend et OVHcloud agissent en qualité de sous-traitants conformément à leurs accords respectifs sur le traitement des données. Vous pouvez les consulter ici : {supabaseDpa}, {netlifyDpa}, {resendDpa}, {ovhDpa}.",
          "Le recours à ces fournisseurs peut entraîner des traitements en dehors de l’Espace économique européen, notamment aux États-Unis. Les accords de Supabase et Resend prévoient les clauses contractuelles types de la Commission européenne ; celui de Netlify prévoit le cadre de protection des données UE-États-Unis pour les transferts couverts et les clauses types dans les cas prévus par l’accord. Pour les éventuels transferts d’OVHcloud vers des pays ne bénéficiant pas d’une décision d’adéquation, son accord prévoit les clauses types. Google décrit les décisions d’adéquation sur lesquelles il s’appuie, sa certification au cadre de protection des données et les clauses types à l’adresse suivante : {googleTransfers}. Vous pouvez demander des informations ou une copie des garanties pertinentes en écrivant à {email}.",
        ],
      },
      {
        title: "Pendant combien de temps",
        paragraphs: [
          "Nous conservons la fiche client, les réservations associées et leurs notifications jusqu’à 24 mois après la date de la dernière réservation. Une réservation sans fiche client est conservée jusqu’à 24 mois à compter de la date du service. La base de données supprime automatiquement les données expirées chaque jour. Les éventuelles données techniques conservées par les prestataires suivent leurs propres durées de conservation.",
          "Le délai de 24 mois concerne les données de la base de données ; leur suppression ne supprime pas automatiquement les copies des e-mails dans les boîtes mail ni les journaux des fournisseurs. Pour les e-mails de réservation gérés par le restaurant, y compris les notes, nous adoptons un délai de suppression de 30 jours au maximum après la date prévue pour la visite, y compris si le client ne se présente pas ou si la demande reste en attente. Si la réservation est annulée ou refusée avant cette date, ce délai court à compter de l’annulation ou du refus. Cela comprend les copies dans les boîtes mail OVHcloud et Gmail ainsi que celles téléchargées sur les appareils du personnel. Toute conservation supplémentaire se limite aux données nécessaires au respect d’une obligation légale précise ou à un litige concret, pendant la durée requise par cette obligation ou la gestion du litige.",
          "Dans le cadre de l’offre Supabase Free, les journaux d’API et de base de données sont conservés pendant un jour. L’offre ne comprend pas de sauvegardes quotidiennes de la base de données mises à la disposition du client. Références : {supabaseLogs} et {supabaseBackups}.",
          "Dans le cadre de l’offre Resend Free, les messages et leurs journaux sont conservés pendant 30 jours et les sauvegardes pendant sept jours, selon la documentation du service : {resendRetention}.",
          "Netlify permet de consulter les journaux des fonctions et des fonctions edge sur une période allant jusqu’à sept jours, selon l’offre et le type de journal ; dans le cadre de l’offre Personal, les données de suivi technique d’Observability peuvent être consultées pour les dernières 24 heures. Ces périodes de consultation ne signifient pas nécessairement que chaque copie interne du fournisseur a été supprimée. Toute conservation résiduelle suit les cycles de suppression du service et les besoins de sécurité, de restauration et de respect des obligations légales prévus dans l’accord correspondant. Références : {netlifyLogs}, {netlifyObservability} et {netlifyDpa}. Vous pouvez demander au responsable du traitement des informations sur vos données et leurs durées de conservation en écrivant à {email}.",
          "La suppression des boîtes mail ne signifie pas le retrait immédiat de tous les systèmes des fournisseurs. Google indique que la procédure de suppression prend généralement environ deux mois et que des copies de sauvegarde chiffrées peuvent subsister jusqu’à six mois, sous réserve des exceptions décrites dans ses règles : {googleRetention}.",
        ],
      },
      {
        title: "Langue et contrôles techniques",
        paragraphs: [
          "Lorsque vous choisissez manuellement la langue, un cookie technique (cantina_language) mémorise votre préférence pendant un an. Il n’est pas utilisé à des fins publicitaires ou de suivi. Pour limiter les tentatives d’accès à la gestion des réservations, nous conservons une empreinte HMAC de l’adresse IP sans enregistrer l’adresse IP en clair dans ce registre. L’empreinte expire une heure après la dernière tentative admise et est supprimée lors des requêtes suivantes.",
          "La langue initiale peut également être déterminée à partir de la préférence transmise par le navigateur (Accept-Language). Ces traitements permettent de présenter le site dans la langue demandée ; les contrôles d’accès servent à protéger les réservations et à prévenir les abus. La base juridique est l’intérêt légitime du restaurant à fournir un site fonctionnel et sécurisé (article 6, paragraphe 1, point f, du RGPD). Le cookie de préférence est technique et ne nécessite pas le consentement prévu pour les cookies de profilage. Nous n’utilisons sur le site aucun outil d’analyse statistique, pixel publicitaire ou suivi à des fins de marketing.",
          "Netlify applique également des limites aux requêtes fondées sur l’adresse IP. Pour le fonctionnement du service et le diagnostic des erreurs, les services d’hébergement et de base de données traitent des données techniques des requêtes et des journaux, qui peuvent comprendre l’adresse IP, la date et l’heure, la ressource demandée, le résultat, les codes d’erreur et les identifiants des opérations. Ces traitements reposent également sur l’intérêt légitime à assurer la sécurité et la continuité du service. Dans l’espace réservé au personnel, les données techniques d’authentification nécessaires au maintien de la session sont également stockées dans le navigateur jusqu’à la déconnexion ou leur suppression du navigateur.",
        ],
      },
      {
        title: "Vos droits",
        paragraphs: [
          "Vous pouvez demander l’accès, la rectification ou l’effacement des données, la limitation du traitement et, lorsque cela s’applique, la portabilité. Vous pouvez vous opposer au traitement fondé sur l’intérêt légitime et retirer votre consentement pour les notes. Écrivez à {email}. Vous avez également le droit d’introduire une réclamation auprès de l’{authority}.",
          "L’accès vous permet de savoir quelles données nous traitons et d’en recevoir une copie ; la rectification permet de corriger les données inexactes ou incomplètes. Dans les cas prévus par le RGPD, vous pouvez demander leur effacement ou la limitation de leur utilisation. Lorsque le traitement est automatisé et fondé sur le consentement ou un contrat, vous pouvez recevoir les données fournies dans un format structuré et lisible par machine et demander leur transmission à un autre responsable, si cela est techniquement possible. Pour vous opposer au traitement fondé sur l’intérêt légitime, vous pouvez communiquer les raisons liées à votre situation particulière. Vous pouvez retirer votre consentement à tout moment, sans affecter la licéité du traitement déjà effectué.",
          "Pour exercer vos droits, écrivez à {email}. Nous répondons sans retard injustifié et, en règle générale, dans un délai d’un mois à compter de la réception. Si la complexité ou le nombre des demandes le nécessite, ce délai peut être prolongé de deux mois supplémentaires : nous vous informerons de la prolongation et de ses motifs pendant le premier mois. Les demandes sont en principe gratuites, sous réserve des exceptions prévues par le RGPD. Une réclamation auprès de l’{authority} peut également être présentée indépendamment d’une demande au restaurant.",
        ],
      },
      {
        title: "Délégué à la protection des données et décisions automatisées",
        paragraphs: [
          "Le responsable du traitement n’a pas désigné de délégué à la protection des données (DPD/DPO). Pour toute demande concernant le traitement des données personnelles, vous pouvez contacter directement le responsable du traitement en écrivant à {email}.",
          "Les demandes de réservation sont confirmées ou refusées par le personnel du restaurant. Le système vérifie automatiquement les horaires, les jours d’ouverture, la disponibilité et la capacité des tables et attribue une table provisoire ; ces vérifications n’utilisent ni évaluations ni scores des clients. Dans l’espace réservé, le personnel peut consulter l’historique, le nombre de visites et de réservations non honorées, et noter des préférences et des étiquettes pour organiser le service. Ces données ne déterminent pas automatiquement l’acceptation ou le refus de la réservation : l’approbation finale ne repose pas sur une décision exclusivement automatisée.",
        ],
      },
    ],
  },
};
