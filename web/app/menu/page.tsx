import { pageMetadata } from "../../lib/site-metadata";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import DigitalMenu from "./DigitalMenu";
import type { MenuCategory, MenuItem, MenuLanguage } from "../../lib/menu/types";
import currentMenu from "../../lib/menu/current-menu.json";
import { MENU_LANGUAGES } from "../../lib/menu/types";

export const metadata = pageMetadata("/menu", "Menù | La cantina dei briganti",
  "Scopri il menù della Cantina dei Briganti a Mola di Bari.");

function localPreview() {
  const categories: MenuCategory[] = currentMenu.map((category) => ({
    id: `preview-category-${category.position}`, position: category.position, name: category.name,
  }));
  const items: MenuItem[] = currentMenu.flatMap((category) => category.items.map((item) => ({
    id: `preview-item-${category.position}-${item.position}`,
    category_id: `preview-category-${category.position}`,
    position: item.position,
    name: item.name,
    description: "description" in item ? item.description : {},
    price: item.price,
    allergen_codes: item.allergens,
  }))) as MenuItem[];
  return <DigitalMenu sourceLanguage="it" categories={categories} items={items} preview />;
}

export default async function MenuPage() {
  if (process.env.NODE_ENV === "development") return localPreview();
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Configurazione Supabase mancante.");
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const [catalogResult, categoryResult, itemResult] = await Promise.all([
    client.from("menu_catalog").select("source_language").eq("id", true).maybeSingle(),
    client.from("menu_categories").select("id,position,name").order("position"),
    client.from("menu_items").select("id,category_id,position,name,description,price,allergen_codes")
      .order("position").limit(500),
  ]);
  const error = catalogResult.error ?? categoryResult.error ?? itemResult.error;
  if (error?.code === "PGRST205") {
    return <DigitalMenu sourceLanguage="it" categories={[]} items={[]} />;
  }
  if (error) throw new Error(`Lettura menù fallita: ${error.message}`);
  const sourceLanguage = catalogResult.data?.source_language as MenuLanguage;
  return <DigitalMenu
    sourceLanguage={MENU_LANGUAGES.includes(sourceLanguage) ? sourceLanguage : "it"}
    categories={(categoryResult.data ?? []) as MenuCategory[]}
    items={(itemResult.data ?? []) as MenuItem[]}
  />;
}
