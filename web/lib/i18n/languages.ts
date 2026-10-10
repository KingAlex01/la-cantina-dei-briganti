export const SUPPORTED_LANGUAGES = ["it", "en", "es", "fr"] as const;
export type SiteLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_COOKIE = "cantina_language";
export const LANGUAGE_NAMES: Record<SiteLanguage, string> = {
  it: "Italiano", en: "English", es: "Español", fr: "Français",
};

export function isSiteLanguage(value: unknown): value is SiteLanguage {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as SiteLanguage);
}

/** Manual choices win; otherwise honour the browser's ordered, weighted preferences. */
export function resolveLanguage(acceptLanguage: string | null, savedLanguage?: string): SiteLanguage {
  if (isSiteLanguage(savedLanguage)) return savedLanguage;
  if (!acceptLanguage?.trim()) return "it";

  const preferences = acceptLanguage.split(",").map((entry, index) => {
    const [tag, ...parameters] = entry.trim().toLowerCase().split(";").map((part) => part.trim());
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const weight = quality === undefined ? 1 : Number(quality.trim().slice(2));
    return { tag, language: tag.split("-")[0], weight, index };
  }).filter(({ tag, weight }) => (tag === "*" || /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/.test(tag)) &&
    Number.isFinite(weight) && weight >= 0 && weight <= 1);

  const ranked = preferences.filter(({ weight }) => weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { language } of ranked) {
    if (isSiteLanguage(language)) return language;
  }

  // A wildcard expresses no specific preference. Foreign languages without a
  // translation fall back to English, respecting explicit base-language exclusions.
  const excluded = new Set(preferences.filter(({ weight, tag }) => weight === 0 && !tag.includes("-"))
    .map(({ language }) => language));
  const fallbacks: SiteLanguage[] = ranked.some(({ tag }) => tag === "*")
    ? ["it", "en", "es", "fr"] : ["en", "it", "es", "fr"];
  return fallbacks.find((language) => !excluded.has(language)) ?? "en";
}
