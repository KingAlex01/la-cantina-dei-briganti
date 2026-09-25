import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";
import { sendBookingConfirmationEmail } from "../../../../../lib/notifications/email";
import type { BookingConfirmation } from "../../../../../lib/public-booking";
import { readJsonObject } from "../../../../../lib/read-json-object";

const allowedOrigins = new Set([
  "https://lacantinadeibriganti.com",
  "https://www.lacantinadeibriganti.com",
  "https://lacantinadeibriganti.netlify.app",
]);

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(requestUrl.hostname);
  if (request.headers.get("sec-fetch-site") === "cross-site" || !origin ||
      (!allowedOrigins.has(origin) && !(local && origin === requestUrl.origin))) {
    return Response.json({ error: "Richiesta non consentita." }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Formato non valido." }, { status: 415 });
  }
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return Response.json({ error: "Accedi all'area staff." }, { status: 401 });

  let reservationId: string;
  let action: "accept" | "reject";
  try {
    const parsed = await readJsonObject(request, 200);
    if (typeof parsed.reservationId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.reservationId) ||
        (parsed.action !== "accept" && parsed.action !== "reject")) throw new Error("invalid");
    reservationId = parsed.reservationId;
    action = parsed.action;
  } catch {
    return Response.json({ error: "Decisione non valida." }, { status: 400 });
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
    if (staffError) {
      console.error("Decisione staff: verifica staff_users fallita.", {
        code: staffError.code, message: staffError.message,
      });
      throw staffError;
    }
    if (!staff) return Response.json({ error: "Accesso riservato allo staff." }, { status: 403 });

    // Il filtro sullo stato consente una sola decisione anche con due operatori contemporanei.
    const status = action === "accept" ? "confermata" : "annullata";
    const { data: reservation, error: updateError } = await client.from("reservations")
      .update(action === "accept" ? { status, approved_at: new Date().toISOString() } : { status })
      .eq("id", reservationId).eq("source", "online")
      .eq("status", "in_attesa")
      .select("id,date,service,arrival_time,party_size,name,email,code")
      .maybeSingle();
    if (updateError) {
      console.error("Decisione staff: aggiornamento Supabase fallito.", {
        action, reservationId, code: updateError.code,
        message: updateError.message, details: updateError.details, hint: updateError.hint,
      });
      if (updateError.code === "23505") {
        return Response.json({ error: "Il tavolo non è più disponibile. Assegna un altro tavolo prima di accettare." }, { status: 409 });
      }
      if (updateError.code === "42703" || updateError.code === "PGRST204") {
        return Response.json({ error: "Il database non è aggiornato per l'approvazione. Applica la migrazione 20260925000100." }, { status: 503 });
      }
      throw updateError;
    }
    if (!reservation) return Response.json({ error: "Richiesta già gestita o non trovata. Aggiorna la Sala." }, { status: 409 });
    if (action === "reject") return Response.json({ status: "annullata" }, { headers: { "Cache-Control": "no-store" } });

    if (!reservation.email) {
      return Response.json({ status: "confermata", email_status: "non_richiesta" },
        { headers: { "Cache-Control": "no-store" } });
    }
    const booking: BookingConfirmation = {
      date: reservation.date, service: reservation.service,
      arrival_time: reservation.arrival_time, party_size: reservation.party_size,
      name: reservation.name, table_name: "", code: reservation.code,
    };
    let emailStatus: "inviata" | "non_configurata" | "fallita";
    try {
      const result = await sendBookingConfirmationEmail(client, booking, reservation.email);
      emailStatus = result === "non_richiesta" ? "fallita" : result;
    } catch (emailError) {
      console.error("Conferma email fallita dopo l'approvazione:", emailError);
      emailStatus = "fallita";
    }
    return Response.json({ status: "confermata", email_status: emailStatus },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Decisione sulla prenotazione fallita:", error);
    return Response.json({ error: "Non riesco a gestire la richiesta. Aggiorna la Sala per verificarne lo stato." }, { status: 503 });
  }
}
