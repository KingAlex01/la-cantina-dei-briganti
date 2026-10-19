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
          "Resend viene utilizzato anche per le notifiche allo staff. Gli avvisi sono inviati alle caselle dello staff configurate per il servizio e anche a una casella Gmail gestita da Google. Le copie delle email possono quindi contenere i recapiti, i dettagli della prenotazione e le note. [DA COMPILARE: precisare, per ciascun fornitore, l’entità contrattuale, il ruolo privacy e gli eventuali Paesi fuori dallo SEE coinvolti; indicare la decisione di adeguatezza o le altre garanzie effettivamente applicabili e come ottenerne copia.]",
        ],
      },
      {
        title: "Per quanto tempo",
        paragraphs: [
          "Conserviamo la scheda cliente, le prenotazioni collegate e le relative notifiche fino a 24 mesi dopo la data dell’ultima prenotazione. Una prenotazione senza scheda cliente viene conservata fino a 24 mesi dalla data del servizio. Il database elimina automaticamente i dati scaduti ogni giorno. Eventuali dati tecnici conservati dai fornitori seguono i loro tempi di conservazione.",
          "Il termine di 24 mesi riguarda i dati nel database; la loro cancellazione non elimina automaticamente le copie delle email nelle caselle di posta o i log dei fornitori. [DA COMPILARE: indicare i tempi di conservazione, o i criteri per determinarli, delle email di prenotazione, delle relative note, dei log tecnici e degli eventuali backup, verificandoli anche nei servizi esterni.]",
        ],
      },
      {
        title: "Lingua e controlli tecnici",
        paragraphs: [
          "Quando scegli manualmente la lingua, un cookie tecnico (cantina_language) ricorda la preferenza per un anno. Non è usato per pubblicità o tracciamento. Per limitare i tentativi di accesso alla gestione delle prenotazioni salviamo un’impronta HMAC dell’indirizzo IP, senza conservare l’IP in chiaro nel relativo registro. L’impronta scade dopo un’ora dall’ultimo tentativo ammesso e viene rimossa durante le richieste successive.",
          "Questi trattamenti servono a ricordare la lingua scelta e a proteggere la gestione delle prenotazioni da tentativi di accesso abusivi. [DA COMPILARE: confermare e indicare la base giuridica di ciascun trattamento tecnico e gli eventuali ulteriori dati di navigazione o log effettivamente raccolti, con finalità, base giuridica, destinatari e durata di conservazione.]",
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
          "[DA COMPILARE: indicare se è stato designato un responsabile della protezione dei dati (RPD/DPO) e, se presente, i suoi contatti; se non è stato designato, sostituire questo segnaposto con una dichiarazione corrispondente alla situazione reale.]",
          "Le richieste di prenotazione online sono esaminate dal personale del ristorante. [DA COMPILARE: verificare e dichiarare l’eventuale presenza di altri processi decisionali esclusivamente automatizzati, compresa la profilazione, ai sensi dell’art. 22 GDPR; se presenti, descrivere logica, importanza e conseguenze previste; se assenti, dichiararne l’assenza.]",
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
          "Resend is also used for staff notifications. Alerts are sent to the staff mailboxes configured for the service and also to a Google Gmail mailbox. Email copies may therefore contain contact details, booking information and notes. [DA COMPILARE: specify each provider’s contracting entity, privacy role and any countries outside the EEA involved; identify the applicable adequacy decision or other actual safeguards and how to obtain a copy.]",
        ],
      },
      {
        title: "How long we keep your data",
        paragraphs: [
          "We keep your customer record, linked bookings and related notifications for up to 24 months after the date of your last booking. A booking without a customer record is kept for up to 24 months from the date of the service. The database automatically deletes expired data every day. Any technical data retained by providers is subject to their own retention periods.",
          "The 24-month period concerns database records; deleting them does not automatically remove email copies from mailboxes or provider logs. [DA COMPILARE: specify retention periods, or the criteria used to determine them, for booking emails, related notes, technical logs and any backups, checking external services as well.]",
        ],
      },
      {
        title: "Language and technical controls",
        paragraphs: [
          "When you choose a language manually, a technical cookie (cantina_language) remembers your preference for one year. It is not used for advertising or tracking. To limit attempts to access booking management, we store an HMAC fingerprint of the IP address without storing the raw IP address in that register. The fingerprint expires one hour after the last allowed attempt and is removed during subsequent requests.",
          "These operations remember your chosen language and protect booking management against abusive access attempts. [DA COMPILARE: confirm and state the legal basis for each technical operation and any additional browsing data or logs actually collected, with their purposes, legal bases, recipients and retention periods.]",
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
          "[DA COMPILARE: state whether a data protection officer (DPO) has been appointed and, if so, provide their contact details; if none has been appointed, replace this placeholder with a statement reflecting the actual situation.]",
          "Online booking requests are reviewed by restaurant staff. [DA COMPILARE: check and state whether any other solely automated decisions, including profiling under Article 22 GDPR, take place; if so, describe their logic, significance and expected consequences; otherwise state their absence.]",
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
          "Resend también se utiliza para los avisos al personal. Los avisos se envían a los buzones del personal configurados para el servicio y también a un buzón Gmail de Google. Las copias de los correos pueden contener datos de contacto, detalles de la reserva y notas. [DA COMPILARE: indicar para cada proveedor la entidad contratada, su función en materia de privacidad y los posibles países fuera del EEE implicados; especificar la decisión de adecuación u otras garantías efectivamente aplicables y cómo obtener una copia.]",
        ],
      },
      {
        title: "Durante cuánto tiempo",
        paragraphs: [
          "Conservamos la ficha de cliente, las reservas vinculadas y sus notificaciones hasta 24 meses después de la fecha de la última reserva. Una reserva sin ficha de cliente se conserva hasta 24 meses desde la fecha del servicio. La base de datos elimina automáticamente los datos caducados cada día. Los datos técnicos que puedan conservar los proveedores siguen sus propios plazos de conservación.",
          "El plazo de 24 meses se refiere a los datos de la base de datos; su eliminación no suprime automáticamente las copias de los correos en los buzones ni los registros de los proveedores. [DA COMPILARE: indicar los plazos de conservación, o los criterios para determinarlos, de los correos de reserva, sus notas, los registros técnicos y las posibles copias de seguridad, comprobándolos también en los servicios externos.]",
        ],
      },
      {
        title: "Idioma y controles técnicos",
        paragraphs: [
          "Cuando eliges el idioma manualmente, una cookie técnica (cantina_language) recuerda tu preferencia durante un año. No se utiliza para publicidad ni seguimiento. Para limitar los intentos de acceso a la gestión de reservas, guardamos una huella HMAC de la dirección IP sin conservar la IP en claro en ese registro. La huella caduca una hora después del último intento admitido y se elimina durante las solicitudes posteriores.",
          "Estos tratamientos sirven para recordar el idioma elegido y proteger la gestión de reservas frente a intentos de acceso abusivos. [DA COMPILARE: confirmar e indicar la base jurídica de cada tratamiento técnico y los posibles datos de navegación o registros adicionales realmente recogidos, con sus finalidades, bases jurídicas, destinatarios y plazos de conservación.]",
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
          "[DA COMPILARE: indicar si se ha designado un delegado de protección de datos (DPD) y, en tal caso, sus datos de contacto; si no se ha designado, sustituir este marcador por una declaración que refleje la situación real.]",
          "El personal del restaurante examina las solicitudes de reserva en línea. [DA COMPILARE: comprobar y declarar si existen otros procesos de decisión exclusivamente automatizados, incluida la elaboración de perfiles conforme al artículo 22 RGPD; si existen, describir su lógica, importancia y consecuencias previstas; si no, declarar su ausencia.]",
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
          "Resend est également utilisé pour les notifications au personnel. Les alertes sont envoyées aux boîtes du personnel configurées pour le service et également à une boîte Gmail de Google. Les copies des e-mails peuvent donc contenir les coordonnées, les détails de la réservation et les notes. [DA COMPILARE: préciser pour chaque prestataire l’entité contractante, son rôle en matière de protection des données et les éventuels pays hors EEE concernés ; indiquer la décision d’adéquation ou les autres garanties effectivement applicables et les moyens d’en obtenir une copie.]",
        ],
      },
      {
        title: "Pendant combien de temps",
        paragraphs: [
          "Nous conservons la fiche client, les réservations associées et leurs notifications jusqu’à 24 mois après la date de la dernière réservation. Une réservation sans fiche client est conservée jusqu’à 24 mois à compter de la date du service. La base de données supprime automatiquement les données expirées chaque jour. Les éventuelles données techniques conservées par les prestataires suivent leurs propres durées de conservation.",
          "La durée de 24 mois concerne les données de la base de données ; leur suppression n’efface pas automatiquement les copies des e-mails dans les boîtes ni les journaux des prestataires. [DA COMPILARE: indiquer les durées de conservation, ou les critères permettant de les déterminer, des e-mails de réservation, des notes associées, des journaux techniques et des éventuelles sauvegardes, en les vérifiant aussi dans les services externes.]",
        ],
      },
      {
        title: "Langue et contrôles techniques",
        paragraphs: [
          "Lorsque vous choisissez manuellement la langue, un cookie technique (cantina_language) mémorise votre préférence pendant un an. Il n’est pas utilisé à des fins publicitaires ou de suivi. Pour limiter les tentatives d’accès à la gestion des réservations, nous conservons une empreinte HMAC de l’adresse IP sans enregistrer l’adresse IP en clair dans ce registre. L’empreinte expire une heure après la dernière tentative admise et est supprimée lors des requêtes suivantes.",
          "Ces traitements permettent de mémoriser la langue choisie et de protéger la gestion des réservations contre les tentatives d’accès abusives. [DA COMPILARE: confirmer et indiquer la base juridique de chaque traitement technique ainsi que les éventuelles données de navigation ou journaux supplémentaires réellement collectés, avec leurs finalités, bases juridiques, destinataires et durées de conservation.]",
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
          "[DA COMPILARE: indiquer si un délégué à la protection des données (DPD) a été désigné et, le cas échéant, ses coordonnées ; sinon, remplacer ce marqueur par une déclaration correspondant à la situation réelle.]",
          "Les demandes de réservation en ligne sont examinées par le personnel du restaurant. [DA COMPILARE: vérifier et déclarer l’existence éventuelle d’autres décisions exclusivement automatisées, y compris le profilage au sens de l’article 22 RGPD ; si elles existent, décrire leur logique, leur importance et leurs conséquences prévues ; sinon, déclarer leur absence.]",
        ],
      },
    ],
  },
};
