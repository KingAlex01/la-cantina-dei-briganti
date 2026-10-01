import type { MetadataRoute } from "next";
import { RESTAURANT } from "../lib/restaurant";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${RESTAURANT.url}/sitemap.xml`,
  };
}
