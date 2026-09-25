// Verifica: node scripts/sync-menu.mjs
// Pubblica: node --env-file=.env.local scripts/sync-menu.mjs --publish
// I PDF in menu-sorgenti sono riferimenti: i dati revisionati sono in current-menu.json.
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const supportedLanguages = ["it", "en", "es", "fr", "de"];
const categories = JSON.parse(await readFile(new URL("../lib/menu/current-menu.json", import.meta.url), "utf8"));
if (!Array.isArray(categories) || categories.length === 0) throw new Error("Nessuna categoria nel menù.");

const foundLanguages = new Set();
let dishCount = 0;
for (const [categoryIndex, category] of categories.entries()) {
  if (category.position !== categoryIndex + 1 || !category.name || typeof category.name !== "object")
    throw new Error(`Categoria ${categoryIndex + 1} non valida.`);
  for (const language of Object.keys(category.name)) foundLanguages.add(language);
  if (!Array.isArray(category.items) || !category.items.length)
    throw new Error(`Categoria ${category.position} senza piatti.`);
  for (const [itemIndex, item] of category.items.entries()) {
    if (item.position !== itemIndex + 1 || !item.name || typeof item.name !== "object")
      throw new Error(`Piatto ${category.position}.${itemIndex + 1} non valido.`);
    if (typeof item.price !== "number" || !Number.isFinite(item.price) || item.price < 0 || item.price >= 10000)
      throw new Error(`Prezzo non valido per ${category.position}.${item.position}.`);
    if (!Array.isArray(item.allergens) ||
        item.allergens.some((code) => !Number.isInteger(code) || code < 1 || code > 6) ||
        new Set(item.allergens).size !== item.allergens.length)
      throw new Error(`Allergeni non validi per ${category.position}.${item.position}.`);
    for (const language of Object.keys(item.name)) foundLanguages.add(language);
    dishCount++;
  }
}
if (dishCount > 500 || !foundLanguages.has("it") ||
    [...foundLanguages].some((language) => !supportedLanguages.includes(language)))
  throw new Error("Numero di piatti o lingue del menù non valido.");

const languages = supportedLanguages.filter((language) => foundLanguages.has(language));
const rowsByLanguage = new Map();
for (const language of languages) {
  const rows = categories.flatMap((category) => category.items.map((item) => ({
    category_position: category.position,
    position: item.position,
    category: category.name[language],
    name: item.name[language],
    description: item.description?.[language] ?? "",
    price: item.price,
    allergens: item.allergens,
  })));
  if (rows.some((row) => typeof row.category !== "string" || !row.category.trim() ||
                       typeof row.name !== "string" || !row.name.trim() ||
                       typeof row.description !== "string"))
    throw new Error(`Traduzione ${language} incompleta. Nessun dato è stato pubblicato.`);
  rowsByLanguage.set(language, rows);
}

console.log(`${categories.length} categorie, ${dishCount} piatti, lingue: ${languages.join(", ")}`);
if (!process.argv.includes("--publish")) {
  console.log("Verifica riuscita. Per pubblicare usa --publish.");
} else {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("Configurazione Supabase mancante in .env.local.");
  const db = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  for (const language of languages) {
    const { data, error } = await db.rpc("import_menu", {
      p_language: language,
      p_items: rowsByLanguage.get(language),
    });
    if (error) throw new Error(`Importazione ${language}: ${error.message}. Riesegui il comando.`);
    console.log(`${language}: ${data} piatti pubblicati`);
  }
}
