import type { Metadata } from "next";
import { RESTAURANT } from "./restaurant";

export function pageMetadata(path: string, title: string, description: string): Metadata {
  const url = `${RESTAURANT.url}${path}`;
  const image = { url: "/social-preview.png", width: 1200, height: 630, alt: "La Cantina dei Briganti · Mola di Bari" };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "it_IT", siteName: RESTAURANT.name, title, description, url, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
