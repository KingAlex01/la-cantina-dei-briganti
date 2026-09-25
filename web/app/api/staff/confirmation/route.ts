import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { sendBookingConfirmationEmail } from "../../../../lib/notifications/email";
import type { BookingConfirmation } from "../../../../lib/public-booking";
import { readJsonObject } from "../../../../lib/read-json-object";

const allowedOrigins = new Set([
  "https://lacantinadeibriganti.com",
  "https://www.lacantinadeibriganti.com",
  "https://lacantinadeibriganti.netlify.app",
]);

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(requestUrl.hostname);
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      !origin || (!allowedOrigins.has(origin) && !(local && origin === requestUrl.origin))) {
    return Response.json({ error: "Richiesta non consentita." }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Formato non valido." }, { status: 415 });
  }
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return Response.json({ error: "Accedi all'area staff." }, { status: 401 });

  let reservationId: string;
  try {
    const parsed = await readJsonObject(request, 200);
    if (typeof parsed.reservationId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.reservationId)) throw new Error("invalid");
    reservationId = parsed.reservationId;
  } catch {
    return Response.json({ error: "Prenotazione non valida." }, { status: 400 });
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) throw new Error("Supabase non configurato");
    const authClient = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) return Response.json({ error: "Sessione scaduta." }, { status: 401 });

    const client = createServerSupabaseClient();
    const { data: staff, error: staffError } = await client.from("staff_users")
      .select("user_id").eq("user_id", userData.user.id).maybeSingle();
    if (staffError) throw staffError;
    if (!staff) return Response.json({ error: "Accesso riservato allo staff." }, { status: 403 });

    const { data: reservation, error: reservationError } = await client.from("reservations")
      .select("id,date,service,arrival_time,party_size,name,email,code,status,source")
      .eq("id", reservationId).maybeSingle();
    if (reservationError) throw reservationError;
    if (!reservation || reservation.source !== "staff" || reservation.status !== "confermata" || !reservation.email) {
      return Response.json({ error: "Prenotazione staff confermata con email non trovata." }, { status: 404 });
    }
    const { data: existing, error: existingError } = await client.from("notifications")
      .select("id").eq("reservation_id", reservation.id).eq("channel", "email")
      .eq("kind", "conferma").maybeSingle();
    if (existingError) throw existingError;
    if (existing) return Response.json({ error: "La conferma email è già stata tentata." }, { status: 409 });

    const booking: BookingConfirmation = {
      date: reservation.date, service: reservation.service,
      arrival_time: reservation.arrival_time, party_size: reservation.party_size,
      name: reservation.name, table_name: "", code: reservation.code,
    };
    const status = await sendBookingConfirmationEmail(client, booking, reservation.email);
    return Response.json({ status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Conferma email staff fallita:", error);
    return Response.json({ error: "Non riesco a inviare la conferma email. La prenotazione è salvata." }, { status: 503 });
  }
}
