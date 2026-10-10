import type { SiteLanguage } from "./languages";

type HomeContent = {
  metadataTitle: string;
  metadataDescription: string;
  title: string;
  titleEmphasis: string;
  description: string;
  bookTable: string;
  bookingNote: string;
  discoverMenu: string;
  storyKicker: string;
  storyTitle: string;
  storyParagraphs: [string, string];
  exploreMenu: string;
  roomAlt: string;
  galleryLabel: string;
  galleryAlts: [string, string, string];
  visitKicker: string;
  visitTitle: string;
  visitEmphasis: string;
  directions: string;
  socialLabel: string;
  openingHours: string;
  weekdays: [string, string, string, string, string, string, string];
  closed: string;
  hoursNote: string;
  finalCta: string;
  privacy: string;
  staffAccess: string;
};

export const homeContent: Record<SiteLanguage, HomeContent> = {
  it: {
    metadataTitle: "La Cantina dei Briganti | Ristorante a Mola di Bari",
    metadataDescription: "La cucina dei fratelli Parente nel cuore di Mola di Bari: prodotti di famiglia, menù stagionale e un tavolo senza fretta. Scopri il menù e prenota online.",
    title: "Ci vediamo a tavola.",
    titleEmphasis: "Senza fretta.",
    description: "Scegli data, orario e numero di persone. Al resto pensiamo noi: il tavolo resta vostro per tutto il servizio.",
    bookTable: "Prenota un tavolo",
    bookingNote: "La richiesta sarà confermata dopo l’approvazione dello staff. Lo staff esamina le richieste durante gli orari di apertura. Per prenotazioni in giornata o se non ricevi risposta, chiamaci.",
    discoverMenu: "Scopri il menù",
    storyKicker: "La nostra storia",
    storyTitle: "Una cucina di famiglia, nel cuore di Mola.",
    storyParagraphs: [
      "Francesco e Vito Parente hanno aperto La Cantina dei Briganti nel giugno 2023, dopo anni di esperienza nelle cucine italiane e all’estero. Con loro lavora il fratello Luca.",
      "Vengono da una famiglia di origini contadine. Portano in tavola anche i prodotti coltivati dal padre, a chilometro zero, con cura e senza trattamenti. Il menù segue le stagioni e quello che il territorio offre.",
    ],
    exploreMenu: "Esplora il menù",
    roomAlt: "La sala della Cantina dei Briganti, con volte in pietra e tavoli apparecchiati",
    galleryLabel: "Altri scorci del locale",
    galleryAlts: [
      "Tavoli apparecchiati e selezione di vini lungo la parete in pietra",
      "Volta in pietra e un angolo della sala",
      "Dettaglio dell’illuminazione e degli arredi della Cantina",
    ],
    visitKicker: "Vieni a trovarci",
    visitTitle: "Ci trovi a Mola.",
    visitEmphasis: "Ti aspettiamo.",
    directions: "Come arrivare",
    socialLabel: "Profili social",
    openingHours: "Orari di apertura",
    weekdays: ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"],
    closed: "Chiuso",
    hoursNote: "Il menù cambia con le stagioni. Per gruppi di oltre 8 persone, contattaci direttamente.",
    finalCta: "Una sala, tante storie da raccontare.",
    privacy: "Privacy",
    staffAccess: "Accesso staff",
  },
  en: {
    metadataTitle: "La Cantina dei Briganti | Restaurant in Mola di Bari",
    metadataDescription: "The Parente brothers’ cooking in the heart of Mola di Bari: family-grown produce, a seasonal menu and time to enjoy your table. Discover the menu and book online.",
    title: "See you at the table.",
    titleEmphasis: "Take your time.",
    description: "Choose your date, arrival time and number of guests. We’ll take care of the rest: your table is yours for the whole lunch or dinner service.",
    bookTable: "Book a table",
    bookingNote: "Your request will be confirmed after staff approval. Our staff reviews requests during opening hours. For same-day bookings or if you haven’t received a reply, please call us.",
    discoverMenu: "Discover the menu",
    storyKicker: "Our story",
    storyTitle: "Family cooking in the heart of Mola.",
    storyParagraphs: [
      "Francesco and Vito Parente opened La Cantina dei Briganti in June 2023, after years of experience in kitchens in Italy and abroad. Their brother Luca works alongside them.",
      "They come from a farming family. They also serve produce grown locally by their father, with care and without treatments. The menu follows the seasons and what the local area has to offer.",
    ],
    exploreMenu: "Explore the menu",
    roomAlt: "The dining room at La Cantina dei Briganti, with stone vaults and set tables",
    galleryLabel: "More views of the restaurant",
    galleryAlts: [
      "Set tables and a selection of wines along the stone wall",
      "Stone vault and a corner of the dining room",
      "A detail of the lighting and furnishings at La Cantina",
    ],
    visitKicker: "Come and visit us",
    visitTitle: "Find us in Mola.",
    visitEmphasis: "We look forward to seeing you.",
    directions: "Get directions",
    socialLabel: "Social profiles",
    openingHours: "Opening hours",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    closed: "Closed",
    hoursNote: "Our menu changes with the seasons. For groups of more than 8 people, please contact us directly.",
    finalCta: "One dining room, so many stories to share.",
    privacy: "Privacy",
    staffAccess: "Staff login",
  },
  es: {
    metadataTitle: "La Cantina dei Briganti | Restaurante en Mola di Bari",
    metadataDescription: "La cocina de los hermanos Parente en el corazón de Mola di Bari: productos de familia, menú de temporada y una mesa sin prisas. Descubre el menú y reserva en línea.",
    title: "Nos vemos a la mesa.",
    titleEmphasis: "Sin prisas.",
    description: "Elige la fecha, la hora y el número de personas. Del resto nos ocupamos nosotros: la mesa será vuestra durante todo el servicio.",
    bookTable: "Reserva una mesa",
    bookingNote: "La solicitud se confirmará tras la aprobación del personal. Revisamos las solicitudes durante el horario de apertura. Para reservas del mismo día o si no recibes respuesta, llámanos.",
    discoverMenu: "Descubre el menú",
    storyKicker: "Nuestra historia",
    storyTitle: "Una cocina familiar en el corazón de Mola.",
    storyParagraphs: [
      "Francesco y Vito Parente abrieron La Cantina dei Briganti en junio de 2023, después de años de experiencia en cocinas italianas y en el extranjero. Su hermano Luca trabaja con ellos.",
      "Proceden de una familia de origen campesino. También llevan a la mesa los productos que cultiva su padre, de proximidad, con cuidado y sin tratamientos. El menú sigue las estaciones y lo que ofrece la zona.",
    ],
    exploreMenu: "Explora el menú",
    roomAlt: "El comedor de La Cantina dei Briganti, con bóvedas de piedra y mesas puestas",
    galleryLabel: "Otras vistas del restaurante",
    galleryAlts: [
      "Mesas puestas y una selección de vinos junto a la pared de piedra",
      "Bóveda de piedra y un rincón del comedor",
      "Detalle de la iluminación y el mobiliario de La Cantina",
    ],
    visitKicker: "Ven a visitarnos",
    visitTitle: "Estamos en Mola.",
    visitEmphasis: "Te esperamos.",
    directions: "Cómo llegar",
    socialLabel: "Perfiles en redes sociales",
    openingHours: "Horario de apertura",
    weekdays: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    closed: "Cerrado",
    hoursNote: "El menú cambia con las estaciones. Para grupos de más de 8 personas, contacta directamente con nosotros.",
    finalCta: "Un comedor, muchas historias que contar.",
    privacy: "Privacidad",
    staffAccess: "Acceso del personal",
  },
  fr: {
    metadataTitle: "La Cantina dei Briganti | Restaurant à Mola di Bari",
    metadataDescription: "La cuisine des frères Parente au cœur de Mola di Bari : produits de famille, carte de saison et une table où prendre son temps. Découvrez la carte et réservez en ligne.",
    title: "À bientôt à table.",
    titleEmphasis: "Prenez votre temps.",
    description: "Choisissez la date, l’heure et le nombre de personnes. Nous nous occupons du reste : votre table vous est réservée pour tout le service.",
    bookTable: "Réserver une table",
    bookingNote: "Votre demande sera confirmée après l’accord du personnel. Nous examinons les demandes pendant les heures d’ouverture. Pour réserver le jour même ou si vous ne recevez pas de réponse, appelez-nous.",
    discoverMenu: "Découvrir la carte",
    storyKicker: "Notre histoire",
    storyTitle: "Une cuisine de famille, au cœur de Mola.",
    storyParagraphs: [
      "Francesco et Vito Parente ont ouvert La Cantina dei Briganti en juin 2023, après des années d’expérience dans les cuisines italiennes et à l’étranger. Leur frère Luca travaille à leurs côtés.",
      "Ils sont issus d’une famille paysanne. Ils servent aussi les produits cultivés localement par leur père, avec soin et sans traitements. La carte suit les saisons et ce que le territoire offre.",
    ],
    exploreMenu: "Explorer la carte",
    roomAlt: "La salle de La Cantina dei Briganti, avec ses voûtes en pierre et ses tables dressées",
    galleryLabel: "Autres vues du restaurant",
    galleryAlts: [
      "Tables dressées et sélection de vins le long du mur en pierre",
      "Voûte en pierre et un coin de la salle",
      "Détail de l’éclairage et du mobilier de La Cantina",
    ],
    visitKicker: "Venez nous rendre visite",
    visitTitle: "Retrouvez-nous à Mola.",
    visitEmphasis: "Nous vous attendons.",
    directions: "Itinéraire",
    socialLabel: "Réseaux sociaux",
    openingHours: "Heures d’ouverture",
    weekdays: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    closed: "Fermé",
    hoursNote: "La carte change au fil des saisons. Pour les groupes de plus de 8 personnes, contactez-nous directement.",
    finalCta: "Une salle, tant d’histoires à raconter.",
    privacy: "Confidentialité",
    staffAccess: "Accès du personnel",
  },
};
