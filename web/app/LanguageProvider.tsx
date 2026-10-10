"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { isSiteLanguage, type SiteLanguage } from "../lib/i18n/languages";
import { saveLanguagePreference } from "./language-actions";

type LanguageContextValue = { language: SiteLanguage; setLanguage: (language: SiteLanguage) => void; pending: boolean; failed: boolean };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export default function LanguageProvider({ initialLanguage, children }: { initialLanguage: SiteLanguage; children: ReactNode }) {
  const [language, updateLanguage] = useState(initialLanguage);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function setLanguage(nextLanguage: SiteLanguage) {
    if (!isSiteLanguage(nextLanguage)) return;
    document.documentElement.lang = nextLanguage;
    updateLanguage(nextLanguage);
    setFailed(false);
    // Updating the preference also refreshes server copy, preserving form/filter state.
    startTransition(async () => {
      try {
        await saveLanguagePreference(nextLanguage);
      } catch {
        updateLanguage(language);
        document.documentElement.lang = language;
        setFailed(true);
      }
    });
  }

  return <LanguageContext.Provider value={{ language, setLanguage, pending, failed }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage requires LanguageProvider");
  return context;
}
