import type { MetadataRoute } from "next";
import { RESTAURANT } from "../lib/restaurant";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/menu", "/prenota", "/privacy"].map((path) => ({ url: `${RESTAURANT.url}${path}` }));
}
