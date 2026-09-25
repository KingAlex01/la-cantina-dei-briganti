"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ALLERGENS } from "../../lib/menu/types";
import type { MenuCategory, MenuItem, MenuLanguage, LocalizedText } from "../../lib/menu/types";
import styles from "./menu.module.css";

type Props = { categories: MenuCategory[]; items: MenuItem[]; sourceLanguage: MenuLanguage; preview?: boolean };

const UI: Record<MenuLanguage, { all: string; search: string; empty: string; menu: string; allergens: string; reserve: string; untranslated: string }> = {
  it: { all: "Tutti", search: "Cerca un piatto", empty: "Nessun piatto trovato.", menu: "Il nostro menù", allergens: "Allergeni", reserve: "Prenota un tavolo", untranslated: "Traduzione non ancora disponibile: i piatti sono mostrati nella lingua originale." },
  en: { all: "All", search: "Search dishes", empty: "No dishes found.", menu: "Our menu", allergens: "Allergens", reserve: "Book a table", untranslated: "Translation is not available yet; dishes are shown in the original language." },
  es: { all: "Todos", search: "Buscar platos", empty: "No se encontraron platos.", menu: "Nuestro menú", allergens: "Alérgenos", reserve: "Reservar mesa", untranslated: "La traducción aún no está disponible; los platos se muestran en el idioma original." },
  fr: { all: "Tout", search: "Rechercher un plat", empty: "Aucun plat trouvé.", menu: "Notre carte", allergens: "Allergènes", reserve: "Réserver une table", untranslated: "La traduction n’est pas encore disponible ; les plats sont affichés dans la langue d’origine." },
  de: { all: "Alle", search: "Gerichte suchen", empty: "Keine Gerichte gefunden.", menu: "Unsere Speisekarte", allergens: "Allergene", reserve: "Tisch reservieren", untranslated: "Die Übersetzung ist noch nicht verfügbar; die Gerichte werden in der Originalsprache angezeigt." },
};

function localized(value: LocalizedText, language: MenuLanguage, source: MenuLanguage) {
  return value[language] || value[source] || Object.values(value).find(Boolean) || "";
}

export default function DigitalMenu({ categories, items, sourceLanguage, preview = false }: Props) {
  const [language, setLanguage] = useState<MenuLanguage>(sourceLanguage);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const matches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language);
    return items.filter((item) => {
      if (activeCategory && item.category_id !== activeCategory) return false;
      if (!normalized) return true;
      return `${localized(item.name, language, sourceLanguage)} ${localized(item.description, language, sourceLanguage)}`
        .toLocaleLowerCase(language).includes(normalized);
    });
  }, [activeCategory, items, language, query, sourceLanguage]);
  const price = new Intl.NumberFormat(language, { style: "currency", currency: "EUR" });
  const copy = UI[language];

  return <main className={styles.page}>
    <div className={styles.sticky}>
      <div className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="La cantina dei briganti, home">
          <Image src="/logo-cantina.svg" alt="" width={80} height={60} />
          <span>La cantina<br />dei briganti</span>
        </Link>
        <label className={styles.languageLabel}>
          <span className={styles.srOnly}>Lingua / Language</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as MenuLanguage)} aria-label="Lingua / Language">
            <option value="it">IT</option><option value="en">EN</option><option value="es">ES</option>
            <option value="fr">FR</option><option value="de">DE</option>
          </select>
        </label>
      </div>
      <div className={styles.controls}>
        <label className={styles.searchLabel}>
          <span aria-hidden="true">⌕</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} aria-label={copy.search} />
        </label>
        <nav className={styles.tabs} aria-label={copy.menu}>
          <button type="button" className={!activeCategory ? styles.selected : ""} onClick={() => setActiveCategory(null)} aria-pressed={!activeCategory}>{copy.all}</button>
          {categories.map((category) => <button key={category.id} type="button"
            className={activeCategory === category.id ? styles.selected : ""}
            onClick={() => setActiveCategory(category.id)} aria-pressed={activeCategory === category.id}>
            {localized(category.name, language, sourceLanguage)}
          </button>)}
        </nav>
      </div>
    </div>

    <div className={styles.content}>
      {preview && <p className={styles.previewNotice} role="status">Anteprima locale dai PDF di maggio 2026. Il database Supabase non è ancora aggiornato.</p>}
      <div className={styles.intro}><span>Mola di Bari · La cantina dei briganti</span><h1>{copy.menu}</h1><div className={styles.ornament} aria-hidden="true">✦</div>
        {items.length > 0 && language !== sourceLanguage && !items.some((item) => item.name[language]) && <p className={styles.translationNotice}>{copy.untranslated}</p>}
      </div>
      {categories.filter((category) => !activeCategory || category.id === activeCategory).map((category) => {
        const categoryItems = matches.filter((item) => item.category_id === category.id);
        if (!categoryItems.length) return null;
        return <section key={category.id} className={styles.section} aria-labelledby={`category-${category.id}`}>
          <div className={styles.sectionHead}><h2 id={`category-${category.id}`}>{localized(category.name, language, sourceLanguage)}</h2><span>{String(categoryItems.length).padStart(2, "0")}</span></div>
          <div className={styles.list}>{categoryItems.map((item) => <article key={item.id} className={styles.item}>
            <div className={styles.itemMain}>
              <div className={styles.itemTitleRow}><h3>{localized(item.name, language, sourceLanguage)}</h3><span className={styles.price}>{price.format(item.price)}</span></div>
              {localized(item.description, language, sourceLanguage) && <p>{localized(item.description, language, sourceLanguage)}</p>}
              {item.allergen_codes.length > 0 && <div className={styles.badges} aria-label={copy.allergens}>
                {item.allergen_codes.map((code) => <span key={code} className={styles.badge} title={`${copy.allergens}: ${ALLERGENS[language][code]}`}>{ALLERGENS[language][code]}</span>)}
              </div>}
            </div>
          </article>)}</div>
        </section>;
      })}
      {matches.length === 0 && <p className={styles.empty}>{categories.length ? copy.empty : "Il menù sarà disponibile a breve."}</p>}
      <footer className={styles.footer}><span>La cantina dei briganti · Mola di Bari</span><Link href="/prenota">{copy.reserve} ↗</Link></footer>
    </div>
  </main>;
}
