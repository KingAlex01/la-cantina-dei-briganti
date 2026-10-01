import { pageMetadata } from "../../lib/site-metadata";

export const metadata = pageMetadata("/prenota", "Prenota un tavolo | La cantina dei briganti",
  "Invia una richiesta per prenotare un tavolo alla Cantina dei Briganti a Mola di Bari. La prenotazione sarà confermata dopo l’approvazione dello staff.");

export default function BookingLayout({ children }: LayoutProps<"/prenota">) {
  return children;
}
