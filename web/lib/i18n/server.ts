import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LANGUAGE_COOKIE, resolveLanguage } from "./languages";

// React cache is scoped to a server render, never shared between visitors.
export const getRequestLanguage = cache(async () => {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  return resolveLanguage(requestHeaders.get("accept-language"), cookieStore.get(LANGUAGE_COOKIE)?.value);
});
