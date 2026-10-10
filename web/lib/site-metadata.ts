import type { Metadata } from "next";
import { RESTAURANT } from "./restaurant";
import type { SiteLanguage } from "./i18n/languages";

const OG_LOCALES: Record<SiteLanguage, string> = { it: "it_IT", en: "en_GB", es: "es_ES", fr: "fr_FR" };

export function pageMetadata(path: string, title: string, description: string, language: SiteLanguage = "it"): Metadata {
  const url = `${RESTAURANT.url}${path}`;
  const image = { url: "/social-preview.png", width: 1200, height: 630, alt: "La Cantina dei Briganti · Mola di Bari" };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: OG_LOCALES[language], siteName: RESTAURANT.name, title, description, url, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
