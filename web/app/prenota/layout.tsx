import { pageMetadata } from "../../lib/site-metadata";
import { getRequestLanguage } from "../../lib/i18n/server";

const metadataCopy = {
  it: { title: "Prenota un tavolo | La cantina dei briganti", description: "Invia una richiesta per prenotare un tavolo alla Cantina dei Briganti a Mola di Bari. La prenotazione sarà confermata dopo l’approvazione dello staff." },
  en: { title: "Book a table | La cantina dei briganti", description: "Request a table at La Cantina dei Briganti in Mola di Bari. Your booking will be confirmed after approval by our staff." },
  es: { title: "Reserva una mesa | La cantina dei briganti", description: "Solicita una mesa en La Cantina dei Briganti en Mola di Bari. La reserva se confirmará tras la aprobación de nuestro equipo." },
  fr: { title: "Réservez une table | La cantina dei briganti", description: "Demandez une table à La Cantina dei Briganti à Mola di Bari. Votre réservation sera confirmée après l’approbation de notre équipe." },
};

export async function generateMetadata() {
  const language = await getRequestLanguage();
  const { title, description } = metadataCopy[language];
  return pageMetadata("/prenota", title, description, language);
}

export default function BookingLayout({ children }: LayoutProps<"/prenota">) {
  return children;
}
