import type { Metadata } from "next";
import { RESTAURANT } from "../lib/restaurant";
import { getRequestLanguage } from "../lib/i18n/server";
import LanguageProvider from "./LanguageProvider";
import "@fontsource/fraunces/latin-500.css";
import "@fontsource/public-sans/latin-400.css";
import "@fontsource/public-sans/latin-600.css";
import "@fontsource/public-sans/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(RESTAURANT.url),
  title: "La Cantina dei Briganti | Ristorante a Mola di Bari",
  description: "La cucina dei fratelli Parente nel cuore di Mola di Bari: prodotti di famiglia, menù stagionale e un tavolo senza fretta. Scopri il menù e prenota online.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const language = await getRequestLanguage();
  return (
    <html lang={language} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LanguageProvider initialLanguage={language}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
