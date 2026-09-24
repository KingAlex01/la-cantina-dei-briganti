import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { validDate, validPartySize } from "../../../../lib/public-booking";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const party = Number(params.get("party"));
  if (!validDate(date) || !validPartySize(party)) {
    return Response.json({ error: "Scegli una data e un numero di persone validi." }, { status: 400 });
  }
  try {
    const { data, error } = await createServerSupabaseClient().rpc("public_available_services", {
      p_date: date, p_party_size: party,
    });
    if (error) throw error;
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Controllo disponibilità fallito:", error);
    return Response.json({ error: "Non riusciamo a controllare i tavoli. Riprova tra poco." }, { status: 503 });
  }
}
