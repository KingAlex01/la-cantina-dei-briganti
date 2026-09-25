export const MENU_LANGUAGES = ["it", "en", "es", "fr", "de"] as const;
export type MenuLanguage = (typeof MENU_LANGUAGES)[number];
export type LocalizedText = Partial<Record<MenuLanguage, string>>;

export type MenuCategory = {
  id: string;
  position: number;
  name: LocalizedText;
};

export type MenuItem = {
  id: string;
  category_id: string;
  position: number;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  allergen_codes: number[];
};

export const ALLERGENS: Record<MenuLanguage, Record<number, string>> = {
  it: { 1: "Glutine", 2: "Lattosio", 3: "Crostacei", 4: "Frutta a guscio", 5: "Uova", 6: "Molluschi" },
  en: { 1: "Gluten", 2: "Lactose", 3: "Crustaceans", 4: "Tree nuts", 5: "Eggs", 6: "Molluscs" },
  es: { 1: "Gluten", 2: "Lactosa", 3: "Crustáceos", 4: "Frutos secos", 5: "Huevos", 6: "Moluscos" },
  fr: { 1: "Gluten", 2: "Lactose", 3: "Crustacés", 4: "Fruits à coque", 5: "Œufs", 6: "Mollusques" },
  de: { 1: "Gluten", 2: "Laktose", 3: "Krebstiere", 4: "Schalenfrüchte", 5: "Eier", 6: "Weichtiere" },
};
