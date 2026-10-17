// Quattro letture al giorno: il controllo deve raggiungere il database,
// perché una visita a una pagina statica non genera attività su Supabase.
export const config = { schedule: "17 */6 * * *" };

export default async function supabaseKeepalive() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Configurazione Supabase mancante per il controllo periodico.");

  // Usa soltanto la chiave pubblicabile e una tabella del menù già leggibile
  // dal pubblico. Non accede a clienti, prenotazioni o chiavi privilegiate.
  const endpoint = new URL("/rest/v1/menu_categories?select=id&limit=1", url);
  const response = await fetch(endpoint, {
    headers: { apikey: key },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Controllo Supabase fallito (HTTP ${response.status}).`);

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Risposta inattesa al controllo Supabase.");
  console.info("Controllo Supabase completato: database raggiungibile.");
}
