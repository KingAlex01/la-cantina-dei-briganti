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
  sections: [
    { title: string; paragraphs: [string] },
    { title: string; paragraphs: [string, string, string] },
    { title: string; paragraphs: [string] },
    { title: string; paragraphs: [string] },
    { title: string; paragraphs: [string] },
    { title: string; paragraphs: [string] },
  ];
};

export const privacyContent: Record<SiteLanguage, PrivacyContent> = {
  it: {
    metadataTitle: "Privacy prenotazioni | La cantina dei briganti",
    metadataDescription: "Come trattiamo i dati inseriti per prenotare un tavolo.",
    back: "Torna alla prenotazione",
    title: "Informativa privacy",
    introduction: "Per le prenotazioni online e la gestione dei clienti del ristorante.",
    updated: "Aggiornata il 17 ottobre 2026",
    languageUpdated: "Informazioni sulla preferenza lingua aggiunte il 9 ottobre 2026",
    authority: "Garante per la protezione dei dati personali",
    home: "Pagina iniziale",
    sections: [
      {
        title: "Chi gestisce i dati",
        paragraphs: ["Il titolare del trattamento è {controller}, Via Nazario Sauro n. 32, 70042 Mola di Bari (BA), P. IVA 08788760729. Per domande o richieste sui tuoi dati scrivi a {email}."],
      },
      {
        title: "Quali dati usiamo e perché",
        paragraphs: [
          "Per prenotare chiediamo nome e cognome e cellulare. Registriamo data, servizio, orario, numero di persone, tavolo e stato della prenotazione. Servono per riservare il tavolo e contattarti in caso di necessità: il trattamento è necessario per gestire la tua richiesta di prenotazione (art. 6, par. 1, lett. b, GDPR). Senza questi dati non possiamo completarla. Il codice permette di consultare e gestire la prenotazione effettuata sul sito: tienilo riservato, perché chi lo conosce può usarlo. Registriamo modifiche, cancellazioni e note prima e dopo gli aggiornamenti in uno storico riservato allo staff autorizzato, conservato per lo stesso periodo della prenotazione.",
          "L’email è facoltativa. Se la inserisci, la usiamo per inviarti la conferma della prenotazione; non inviamo pubblicità. Il personale autorizzato può vedere le prenotazioni, lo storico delle visite e le preferenze annotate per organizzare il servizio ai clienti abituali. Per la gestione di questo storico facciamo riferimento al legittimo interesse del ristorante (art. 6, par. 1, lett. f, GDPR); puoi opporti scrivendoci.",
          "Anche le note sono facoltative. Possono contenere informazioni su allergie o intolleranze. Se le compili, ti chiediamo un consenso esplicito separato per usarle solo nell’organizzazione della tua visita (art. 9, par. 2, lett. a, GDPR). Puoi prenotare senza note e puoi revocare il consenso scrivendoci; la revoca non cambia la liceità dell’uso precedente.",
        ],
      },
      {
        title: "Chi può riceverli",
        paragraphs: ["Accede ai dati soltanto il personale autorizzato del ristorante. Per far funzionare il servizio usiamo Supabase per il database, Netlify per il sito e Resend per inviare la conferma quando fornisci l’email. Le comunicazioni inviate alla casella del ristorante sono gestite con il servizio email di OVHcloud. Questi fornitori trattano i dati necessari a svolgere i rispettivi servizi. Alcuni trattamenti possono comportare trasferimenti fuori dallo Spazio economico europeo; puoi chiederci informazioni sulle garanzie applicabili."],
      },
      {
        title: "Per quanto tempo",
        paragraphs: ["Conserviamo la scheda cliente, le prenotazioni collegate e le relative notifiche fino a 24 mesi dopo la data dell’ultima prenotazione. Una prenotazione senza scheda cliente viene conservata fino a 24 mesi dalla data del servizio. Il database elimina automaticamente i dati scaduti ogni giorno. Eventuali dati tecnici conservati dai fornitori seguono i loro tempi di conservazione."],
      },
      {
        title: "Lingua e controlli tecnici",
        paragraphs: ["Quando scegli manualmente la lingua, un cookie tecnico (cantina_language) ricorda la preferenza per un anno. Non è usato per pubblicità o tracciamento. Per limitare i tentativi di accesso alla gestione delle prenotazioni salviamo un’impronta HMAC dell’indirizzo IP, senza conservare l’IP in chiaro nel relativo registro. L’impronta scade dopo un’ora dall’ultimo tentativo ammesso e viene rimossa durante le richieste successive."],
      },
      {
        title: "I tuoi diritti",
        paragraphs: ["Puoi chiedere accesso, correzione o cancellazione dei dati, la limitazione del trattamento e, quando applicabile, la portabilità. Puoi opporti al trattamento fondato sul legittimo interesse e revocare il consenso alle note. Scrivi a {email}. Hai anche il diritto di presentare un reclamo al {authority}."],
      },
    ],
  },
  en: {
    metadataTitle: "Booking privacy | La cantina dei briganti",
    metadataDescription: "How we process the data you provide to book a table.",
    back: "Back to booking",
    title: "Privacy notice",
    introduction: "For online bookings and the management of restaurant customers.",
    updated: "Updated on 17 October 2026",
    languageUpdated: "Language preference information added on 9 October 2026",
    authority: "Italian Data Protection Authority",
    home: "Home",
    sections: [
      {
        title: "Who manages your data",
        paragraphs: ["The data controller is {controller}, Via Nazario Sauro n. 32, 70042 Mola di Bari (BA), VAT number 08788760729. For questions or requests about your data, write to {email}."],
      },
      {
        title: "What data we use and why",
        paragraphs: [
          "To book, we ask for your first and last name and mobile number. We record the date, lunch or dinner service, arrival time, number of guests, table and booking status. These details are needed to reserve your table and contact you if necessary: processing is necessary to handle your booking request (Article 6(1)(b), GDPR). Without this data, we cannot complete it. Your code lets you view and manage a booking made on this website: keep it confidential, as anyone who knows it can use it. We record changes, cancellations and notes before and after updates in a history available only to authorised staff, kept for the same period as the booking.",
          "Your email address is optional. If you provide it, we use it to send your booking confirmation; we do not send advertising. Authorised staff can view bookings, visit history and recorded preferences to organise service for regular customers. We rely on the restaurant’s legitimate interest to manage this history (Article 6(1)(f), GDPR); you can object by writing to us.",
          "Notes are also optional. They may contain information about allergies or intolerances. If you add notes, we ask for separate explicit consent to use them solely to organise your visit (Article 9(2)(a), GDPR). You can book without notes and withdraw your consent by writing to us; withdrawal does not affect the lawfulness of previous use.",
        ],
      },
      {
        title: "Who may receive your data",
        paragraphs: ["Only authorised restaurant staff can access the data. To operate the service, we use Supabase for the database, Netlify for the website and Resend to send confirmation when you provide your email address. Messages sent to the restaurant’s mailbox are managed through OVHcloud’s email service. These providers process the data needed to deliver their respective services. Some processing may involve transfers outside the European Economic Area; you can ask us for information about the applicable safeguards."],
      },
      {
        title: "How long we keep your data",
        paragraphs: ["We keep your customer record, linked bookings and related notifications for up to 24 months after the date of your last booking. A booking without a customer record is kept for up to 24 months from the date of the service. The database automatically deletes expired data every day. Any technical data retained by providers is subject to their own retention periods."],
      },
      {
        title: "Language and technical controls",
        paragraphs: ["When you choose a language manually, a technical cookie (cantina_language) remembers your preference for one year. It is not used for advertising or tracking. To limit attempts to access booking management, we store an HMAC fingerprint of the IP address without storing the raw IP address in that register. The fingerprint expires one hour after the last allowed attempt and is removed during subsequent requests."],
      },
      {
        title: "Your rights",
        paragraphs: ["You can request access to, correction or deletion of your data, restriction of processing and, where applicable, data portability. You can object to processing based on legitimate interest and withdraw your consent for notes. Write to {email}. You also have the right to lodge a complaint with the {authority}."],
      },
    ],
  },
  es: {
    metadataTitle: "Privacidad de las reservas | La cantina dei briganti",
    metadataDescription: "Cómo tratamos los datos que facilitas para reservar una mesa.",
    back: "Volver a la reserva",
    title: "Aviso de privacidad",
    introduction: "Para las reservas en línea y la gestión de los clientes del restaurante.",
    updated: "Actualizado el 17 de octubre de 2026",
    languageUpdated: "Información sobre la preferencia de idioma añadida el 9 de octubre de 2026",
    authority: "Autoridad italiana de protección de datos personales",
    home: "Página de inicio",
    sections: [
      {
        title: "Quién gestiona los datos",
        paragraphs: ["El responsable del tratamiento es {controller}, Via Nazario Sauro n. 32, 70042 Mola di Bari (BA), número de IVA 08788760729. Para preguntas o solicitudes sobre tus datos, escribe a {email}."],
      },
      {
        title: "Qué datos usamos y por qué",
        paragraphs: [
          "Para reservar pedimos nombre, apellidos y número de móvil. Registramos la fecha, el servicio, la hora, el número de personas, la mesa y el estado de la reserva. Estos datos sirven para reservar la mesa y contactarte si es necesario: el tratamiento es necesario para gestionar tu solicitud de reserva (art. 6, apdo. 1, letra b, RGPD). Sin estos datos no podemos completarla. El código permite consultar y gestionar una reserva realizada en este sitio: mantenlo confidencial, ya que quien lo conozca puede usarlo. Registramos los cambios, las cancelaciones y las notas antes y después de las actualizaciones en un historial reservado al personal autorizado, conservado durante el mismo plazo que la reserva.",
          "El correo electrónico es opcional. Si lo facilitas, lo usamos para enviarte la confirmación de la reserva; no enviamos publicidad. El personal autorizado puede consultar las reservas, el historial de visitas y las preferencias anotadas para organizar el servicio a los clientes habituales. Para gestionar este historial nos basamos en el interés legítimo del restaurante (art. 6, apdo. 1, letra f, RGPD); puedes oponerte escribiéndonos.",
          "Las notas también son opcionales. Pueden contener información sobre alergias o intolerancias. Si las rellenas, te pedimos un consentimiento explícito separado para usarlas únicamente en la organización de tu visita (art. 9, apdo. 2, letra a, RGPD). Puedes reservar sin notas y retirar el consentimiento escribiéndonos; la retirada no afecta a la licitud del uso anterior.",
        ],
      },
      {
        title: "Quién puede recibirlos",
        paragraphs: ["Solo el personal autorizado del restaurante accede a los datos. Para prestar el servicio usamos Supabase para la base de datos, Netlify para el sitio web y Resend para enviar la confirmación cuando facilitas tu correo electrónico. Las comunicaciones enviadas al buzón del restaurante se gestionan con el servicio de correo de OVHcloud. Estos proveedores tratan los datos necesarios para prestar sus respectivos servicios. Algunos tratamientos pueden implicar transferencias fuera del Espacio Económico Europeo; puedes solicitarnos información sobre las garantías aplicables."],
      },
      {
        title: "Durante cuánto tiempo",
        paragraphs: ["Conservamos la ficha de cliente, las reservas vinculadas y sus notificaciones hasta 24 meses después de la fecha de la última reserva. Una reserva sin ficha de cliente se conserva hasta 24 meses desde la fecha del servicio. La base de datos elimina automáticamente los datos caducados cada día. Los datos técnicos que puedan conservar los proveedores siguen sus propios plazos de conservación."],
      },
      {
        title: "Idioma y controles técnicos",
        paragraphs: ["Cuando eliges el idioma manualmente, una cookie técnica (cantina_language) recuerda tu preferencia durante un año. No se utiliza para publicidad ni seguimiento. Para limitar los intentos de acceso a la gestión de reservas, guardamos una huella HMAC de la dirección IP sin conservar la IP en claro en ese registro. La huella caduca una hora después del último intento admitido y se elimina durante las solicitudes posteriores."],
      },
      {
        title: "Tus derechos",
        paragraphs: ["Puedes solicitar el acceso, la rectificación o la supresión de los datos, la limitación del tratamiento y, cuando corresponda, la portabilidad. Puedes oponerte al tratamiento basado en el interés legítimo y retirar el consentimiento para las notas. Escribe a {email}. También tienes derecho a presentar una reclamación ante la {authority}."],
      },
    ],
  },
  fr: {
    metadataTitle: "Confidentialité des réservations | La cantina dei briganti",
    metadataDescription: "Comment nous traitons les données fournies pour réserver une table.",
    back: "Retour à la réservation",
    title: "Politique de confidentialité",
    introduction: "Pour les réservations en ligne et la gestion des clients du restaurant.",
    updated: "Mise à jour le 17 octobre 2026",
    languageUpdated: "Informations sur la préférence de langue ajoutées le 9 octobre 2026",
    authority: "Autorité italienne de protection des données personnelles",
    home: "Accueil",
    sections: [
      {
        title: "Qui gère les données",
        paragraphs: ["Le responsable du traitement est {controller}, Via Nazario Sauro n. 32, 70042 Mola di Bari (BA), numéro de TVA 08788760729. Pour toute question ou demande concernant vos données, écrivez à {email}."],
      },
      {
        title: "Quelles données nous utilisons et pourquoi",
        paragraphs: [
          "Pour réserver, nous demandons votre prénom, votre nom et votre numéro de portable. Nous enregistrons la date, le service, l’heure, le nombre de personnes, la table et le statut de la réservation. Ces données servent à réserver la table et à vous contacter si nécessaire : le traitement est nécessaire pour gérer votre demande de réservation (art. 6, par. 1, point b, RGPD). Sans ces données, nous ne pouvons pas la finaliser. Le code permet de consulter et de gérer une réservation effectuée sur ce site : gardez-le confidentiel, car toute personne qui le connaît peut l’utiliser. Nous enregistrons les modifications, les annulations et les notes avant et après les mises à jour dans un historique réservé au personnel autorisé, conservé pendant la même durée que la réservation.",
          "L’adresse e-mail est facultative. Si vous la fournissez, nous l’utilisons pour vous envoyer la confirmation de réservation ; nous n’envoyons pas de publicité. Le personnel autorisé peut consulter les réservations, l’historique des visites et les préférences notées pour organiser le service aux clients habituels. Pour gérer cet historique, nous nous fondons sur l’intérêt légitime du restaurant (art. 6, par. 1, point f, RGPD) ; vous pouvez vous y opposer en nous écrivant.",
          "Les notes sont également facultatives. Elles peuvent contenir des informations sur des allergies ou des intolérances. Si vous les remplissez, nous vous demandons un consentement explicite distinct pour les utiliser uniquement afin d’organiser votre visite (art. 9, par. 2, point a, RGPD). Vous pouvez réserver sans notes et retirer votre consentement en nous écrivant ; le retrait ne change pas la licéité de l’utilisation antérieure.",
        ],
      },
      {
        title: "Qui peut les recevoir",
        paragraphs: ["Seul le personnel autorisé du restaurant accède aux données. Pour assurer le fonctionnement du service, nous utilisons Supabase pour la base de données, Netlify pour le site et Resend pour envoyer la confirmation lorsque vous fournissez votre adresse e-mail. Les messages envoyés à la boîte du restaurant sont gérés avec le service e-mail d’OVHcloud. Ces prestataires traitent les données nécessaires à leurs services respectifs. Certains traitements peuvent entraîner des transferts hors de l’Espace économique européen ; vous pouvez nous demander des informations sur les garanties applicables."],
      },
      {
        title: "Pendant combien de temps",
        paragraphs: ["Nous conservons la fiche client, les réservations associées et leurs notifications jusqu’à 24 mois après la date de la dernière réservation. Une réservation sans fiche client est conservée jusqu’à 24 mois à compter de la date du service. La base de données supprime automatiquement les données expirées chaque jour. Les éventuelles données techniques conservées par les prestataires suivent leurs propres durées de conservation."],
      },
      {
        title: "Langue et contrôles techniques",
        paragraphs: ["Lorsque vous choisissez manuellement la langue, un cookie technique (cantina_language) mémorise votre préférence pendant un an. Il n’est pas utilisé à des fins publicitaires ou de suivi. Pour limiter les tentatives d’accès à la gestion des réservations, nous conservons une empreinte HMAC de l’adresse IP sans enregistrer l’adresse IP en clair dans ce registre. L’empreinte expire une heure après la dernière tentative admise et est supprimée lors des requêtes suivantes."],
      },
      {
        title: "Vos droits",
        paragraphs: ["Vous pouvez demander l’accès, la rectification ou l’effacement des données, la limitation du traitement et, lorsque cela s’applique, la portabilité. Vous pouvez vous opposer au traitement fondé sur l’intérêt légitime et retirer votre consentement pour les notes. Écrivez à {email}. Vous avez également le droit d’introduire une réclamation auprès de l’{authority}."],
      },
    ],
  },
};
