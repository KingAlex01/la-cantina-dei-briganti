"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ALLERGENS } from "../../lib/menu/types";
import type { MenuCategory, MenuItem, MenuLanguage, LocalizedText } from "../../lib/menu/types";
import styles from "./menu.module.css";

type Props = { categories: MenuCategory[]; items: MenuItem[]; sourceLanguage: MenuLanguage; preview?: boolean };

const UI: Record<MenuLanguage, { all: string; search: string; empty: string; menu: string; allergens: string; reserve: string; reviews: string; googleReviews: string; tripadvisorReviews: string; untranslated: string }> = {
  it: { all: "Tutti", search: "Cerca un piatto", empty: "Nessun piatto trovato.", menu: "Il nostro menù", allergens: "Allergeni", reserve: "Prenota un tavolo", reviews: "Cosa dicono di noi", googleReviews: "Recensioni su Google", tripadvisorReviews: "Recensioni su Tripadvisor", untranslated: "Traduzione non ancora disponibile: i piatti sono mostrati nella lingua originale." },
  en: { all: "All", search: "Search dishes", empty: "No dishes found.", menu: "Our menu", allergens: "Allergens", reserve: "Book a table", reviews: "What guests say", googleReviews: "Reviews on Google", tripadvisorReviews: "Reviews on Tripadvisor", untranslated: "Translation is not available yet; dishes are shown in the original language." },
  es: { all: "Todos", search: "Buscar platos", empty: "No se encontraron platos.", menu: "Nuestro menú", allergens: "Alérgenos", reserve: "Reservar mesa", reviews: "Qué dicen de nosotros", googleReviews: "Reseñas en Google", tripadvisorReviews: "Reseñas en Tripadvisor", untranslated: "La traducción aún no está disponible; los platos se muestran en el idioma original." },
  fr: { all: "Tout", search: "Rechercher un plat", empty: "Aucun plat trouvé.", menu: "Notre carte", allergens: "Allergènes", reserve: "Réserver une table", reviews: "Ce qu'on dit de nous", googleReviews: "Avis sur Google", tripadvisorReviews: "Avis sur Tripadvisor", untranslated: "La traduction n’est pas encore disponible ; les plats sont affichés dans la langue d’origine." },
};

const NOTES: Record<MenuLanguage, { allergy: string; frozen: string; cover: string }> = {
  it: { allergy: "Per allergie o intolleranze, chiedi sempre al personale, anche per i piatti senza indicazioni.", frozen: "* Prodotti o ingredienti contrassegnati sono surgelati all’origine oppure congelati in loco secondo le procedure HACCP.", cover: "Coperto" },
  en: { allergy: "For allergies or intolerances, always ask our staff, including for dishes without allergen labels.", frozen: "* Marked products or ingredients are supplied frozen or frozen on site in accordance with HACCP procedures.", cover: "Cover charge" },
  es: { allergy: "Si tienes alergias o intolerancias, consulta siempre al personal, también para los platos sin indicaciones.", frozen: "* Los productos o ingredientes marcados son congelados de origen o en el local según los procedimientos HACCP.", cover: "Cubierto" },
  fr: { allergy: "En cas d’allergie ou d’intolérance, demandez toujours au personnel, même pour les plats sans indication.", frozen: "* Les produits ou ingrédients marqués sont surgelés à l’origine ou congelés sur place selon les procédures HACCP.", cover: "Couvert" },
};

function searchText(value: string, language: MenuLanguage) {
  return value.toLocaleLowerCase(language).normalize("NFD").replace(/\p{M}/gu, "");
}

function localized(value: LocalizedText, language: MenuLanguage, source: MenuLanguage) {
  return value[language] || value[source] || Object.values(value).find(Boolean) || "";
}

export default function DigitalMenu({ categories, items, sourceLanguage, preview = false }: Props) {
  const [language, setLanguage] = useState<MenuLanguage>(sourceLanguage);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const matches = useMemo(() => {
    const normalized = searchText(query.trim(), language);
    return items.filter((item) => {
      if (activeCategory && item.category_id !== activeCategory) return false;
      if (!normalized) return true;
      return searchText(`${localized(item.name, language, sourceLanguage)} ${localized(item.description, language, sourceLanguage)}`, language)
        .includes(normalized);
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
            <option value="fr">FR</option>
          </select>
        </label>
      </div>
      <div className={styles.controls}>
        <label className={styles.searchLabel}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} aria-label={copy.search} />
        </label>
        <nav className={styles.tabs} aria-label={copy.menu}>
          <button type="button" className={!activeCategory ? styles.selected : ""} onClick={() => setActiveCategory(null)} aria-pressed={!activeCategory}>{copy.all}</button>
          {categories.map((category) => <button key={category.id} type="button"
            className={activeCategory === category.id ? styles.selected : ""}
            onClick={() => setActiveCategory(category.id)} aria-pressed={activeCategory === category.id}>
            {localized(category.name, language, sourceLanguage)}
            <span className={styles.tabCount} aria-hidden="true">{items.filter((item) => item.category_id === category.id).length}</span>
          </button>)}
        </nav>
      </div>
    </div>

    <div className={styles.content}>
      {preview && <p className={styles.previewNotice} role="status">Anteprima locale dai dati del progetto. Supabase non è stato aggiornato.</p>}
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
      {items.length > 0 && <aside className={styles.menuNotes} aria-label={copy.allergens}>
        <div className={styles.cover}><span>{NOTES[language].cover}</span><strong>{price.format(2)}</strong></div>
        <p>{NOTES[language].allergy}</p>
        {items.some((item) => localized(item.name, language, sourceLanguage).includes("*")) && <p>{NOTES[language].frozen}</p>}
      </aside>}
      <section className={styles.reviews} aria-labelledby="reviews-title">
        <h2 id="reviews-title">{copy.reviews}</h2>
        <div className={styles.reviewLinks}>
          <a href="https://www.google.com/maps/search/?api=1&query=La%20Cantina%20dei%20Briganti%2C%20Vico%20Morgese%201%2C%20Mola%20di%20Bari" target="_blank" rel="noopener noreferrer">{copy.googleReviews} <span aria-hidden="true">↗</span></a>
          <a href="https://www.tripadvisor.it/Restaurant_Review-g1078047-d14075097-Reviews-La_cantina_dei_briganti-Mola_di_Bari_Province_of_Bari_Puglia.html" target="_blank" rel="noopener noreferrer">{copy.tripadvisorReviews} <span aria-hidden="true">↗</span></a>
        </div>
      </section>
      <footer className={styles.footer}><span>La cantina dei briganti · Mola di Bari</span><Link href="/prenota">{copy.reserve} ↗</Link></footer>
    </div>
  </main>;
}
