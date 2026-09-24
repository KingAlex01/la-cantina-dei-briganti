import type { Metadata } from "next";
import "@fontsource/fraunces/latin-500.css";
import "@fontsource/public-sans/latin-400.css";
import "@fontsource/public-sans/latin-600.css";
import "@fontsource/public-sans/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "La cantina dei briganti",
  description: "Prenotazioni online della Cantina dei Briganti",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
