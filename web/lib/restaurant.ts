import { OPENING_HOURS } from "./public-booking";

export const RESTAURANT = {
  name: "La Cantina dei Briganti",
  url: "https://lacantinadeibriganti.com",
  phone: "+39 345 168 0145",
  phoneHref: "tel:+393451680145",
  whatsappUrl: "https://wa.me/393451680145",
  address: {
    streetAddress: "Vico Morgese 1",
    addressLocality: "Mola di Bari",
    addressRegion: "BA",
    postalCode: "70042",
    addressCountry: "IT",
  },
  socials: [
    "https://www.instagram.com/la.cantinadeibriganti/",
    "https://www.facebook.com/lacantinadeibriganti2017",
  ],
} as const;

export const BOOKING_RESPONSE_NOTE = "Lo staff esamina le richieste durante gli orari di apertura. Per prenotazioni in giornata o se non ricevi risposta, chiamaci.";

const schemaDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const restaurantStructuredData = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": `${RESTAURANT.url}/#restaurant`,
  name: RESTAURANT.name,
  url: RESTAURANT.url,
  telephone: RESTAURANT.phone,
  address: { "@type": "PostalAddress", ...RESTAURANT.address },
  image: ["sala", "tavoli-e-vini", "volta-in-pietra", "dettaglio-sala"].map((name) => `${RESTAURANT.url}/locale/${name}.jpeg`),
  logo: `${RESTAURANT.url}/logo-cantina.svg`,
  menu: `${RESTAURANT.url}/menu`,
  acceptsReservations: `${RESTAURANT.url}/prenota`,
  sameAs: RESTAURANT.socials,
  openingHoursSpecification: OPENING_HOURS.flatMap(({ hours }, index) => {
    if (hours === "Chiuso") return [];
    return hours.split(" · ").map((period) => {
      const [opens, closes] = period.split("–");
      return { "@type": "OpeningHoursSpecification", dayOfWeek: `https://schema.org/${schemaDays[index]}`, opens, closes };
    });
  }),
};
