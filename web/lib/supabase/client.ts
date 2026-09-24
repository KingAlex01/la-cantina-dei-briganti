import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function createSupabaseClient() {
  if (typeof window !== "undefined" && browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Configurazione Supabase mancante in .env.local");
  }

  const client = createClient(url, publishableKey);
  if (typeof window !== "undefined") browserClient = client;
  return client;
}
