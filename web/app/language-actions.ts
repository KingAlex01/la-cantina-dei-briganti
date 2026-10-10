"use server";

import { cookies, headers } from "next/headers";
import { isSiteLanguage, LANGUAGE_COOKIE } from "../lib/i18n/languages";

export async function saveLanguagePreference(language: unknown) {
  if (!isSiteLanguage(language)) return;
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  cookieStore.set(LANGUAGE_COOKIE, language, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
    secure: requestHeaders.get("x-forwarded-proto") === "https" || requestHeaders.get("origin")?.startsWith("https://") === true,
  });
  // Next also invalidates prefetched pages when a Server Action changes cookies.
}
