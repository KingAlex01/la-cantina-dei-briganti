import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";
import { readJsonObject } from "../../../../../lib/read-json-object";
import { SERVICE_TIMES, validDate, validPartySize } from "../../../../../lib/public-booking";
import { sendStaffBookingManagementEmail } from "../../../../../lib/notifications/email";

const allowedOrigins = new Set([
  "https://lacantinadeibriganti.com", "https://www.lacantinadeibriganti.com",
  "https://lacantinadeibriganti.netlify.app",
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const codePattern = /^(?:[a-z0-9]{6}|[0-9a-f]{16})$/i;

function reply(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

// Only these fields may leave the server. Contact details and staff/table data
// remain private even if the database response gains additional fields later.
function publicBooking(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid booking response");
  const b = value as Record<string, unknown>;
  if (typeof b.code !== "string" || !codePattern.test(b.code) || typeof b.version !== "string" || !uuid.test(b.version) ||
      typeof b.name !== "string" || typeof b.date !== "string" || typeof b.arrival_time !== "string" ||
      typeof b.party_size !== "number" || typeof b.notes !== "string" ||
      !["in_attesa", "confermata", "annullata", "arrivato", "no-show"].includes(String(b.status)) ||
      (b.service !== "pranzo" && b.service !== "cena")) throw new Error("Invalid booking response");
  return {
    code: b.code, version: b.version, name: b.name, date: b.date, service: b.service,
    arrival_time: b.arrival_time, party_size: b.party_size, notes: b.notes, status: b.status,
  };
}

function managementError(error: { code?: string; message: string }) {
  if (error.code === "P0002") return reply({ error: "not_found" }, 404);
  if (error.code === "40001" || error.code === "40P01") return reply({ error: "conflict" }, 409);
  const message = error.message.toLowerCase();
  if (message.includes("consenso")) return reply({ error: "notes_consent" }, 400);
  if (message.includes("nessuna modifica")) return reply({ error: "no_changes" }, 400);
  if (message.includes("sospese")) return reply({ error: "paused" }, 409);
  if (message.includes("chiuso")) return reply({ error: "closed" }, 409);
  if (message.includes("nessun tavolo") || error.code === "23505") return reply({ error: "unavailable" }, 409);
  if (message.includes("trascor") || message.includes("passat") || message.includes("non modificabile") || message.includes("non è più modificabile")) return reply({ error: "past" }, 409);
  if (error.code === "22023") return reply({ error: "invalid" }, 400);
  // Neither a booking code nor an RPC input is written to diagnostics.
  console.error("Gestione pubblica: operazione database non disponibile.", { code: error.code });
  return reply({ error: "failed" }, 503);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || !origin ||
      (!allowedOrigins.has(origin) && !(local && origin === url.origin))) return reply({ error: "invalid" }, 403);
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return reply({ error: "invalid" }, 415);
  }
  let input: Record<string, unknown>;
  try { input = await readJsonObject(request, 6000); }
  catch { return reply({ error: "invalid" }, 400); }
  const code = typeof input.code === "string" && input.code.length <= 64
    ? input.code.replace(/[\s-]/g, "").toUpperCase() : "";
  const { action, version } = input;
  if (!codePattern.test(code) || !["lookup", "cancel", "notes", "replace"].includes(String(action)) || input.website) {
    return reply({ error: "invalid" }, 400);
  }
  if (action !== "lookup" && (typeof version !== "string" || !uuid.test(version))) return reply({ error: "invalid" }, 400);
  if (action === "notes" && (typeof input.notes !== "string" || input.notes.length > 1000 ||
      (input.notes.trim() !== "" && input.notesConsent !== true))) return reply({ error: "notes_consent" }, 400);
  if (action === "replace" && (!validDate(input.date) || !validPartySize(input.party) ||
      (input.service !== "pranzo" && input.service !== "cena") || typeof input.time !== "string" ||
      !SERVICE_TIMES[input.service].includes(input.time))) return reply({ error: "invalid" }, 400);

  try {
    // SITE_ID is available in Netlify Functions at runtime; NETLIFY is normally
    // a build variable. Netlify overwrites the connecting client's IP header.
    // Visitor-supplied forwarded headers must never define a rate limit identity.
    const netlifyRuntime = Boolean(process.env.SITE_ID) || process.env.NETLIFY === "true";
    const ip = netlifyRuntime ? request.headers.get("x-nf-client-connection-ip")?.trim() : local ? "127.0.0.1" : null;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!ip || !isIP(ip) || !secret) return reply({ error: "failed" }, 503);
    const key = createHmac("sha256", secret).update(`booking-management:${ip}`).digest("hex");
    const client = createServerSupabaseClient();
    const limit = await client.rpc("consume_public_management_attempt", { p_key: key });
    if (limit.error || typeof limit.data?.allowed !== "boolean") {
      console.error("Gestione pubblica: limite tentativi non disponibile.", { code: limit.error?.code });
      return reply({ error: "failed" }, 503);
    }
    if (!limit.data.allowed) {
      const retry = Math.max(1, Math.min(3600, Math.ceil(Number(limit.data.retry_after) || 60)));
      return reply({ error: "too_many" }, 429, { "Retry-After": String(retry) });
    }
    if (action === "lookup") {
      const { data, error } = await client.rpc("lookup_public_reservation", { p_code: code });
      if (error) return managementError(error);
      return data ? reply({ booking: publicBooking(data) }) : reply({ error: "not_found" }, 404);
    }
    const { data, error } = await client.rpc("manage_public_reservation", {
      p_code: code, p_version: version, p_action: action,
      ...(action === "notes" ? { p_notes: (input.notes as string).trim(), p_notes_consent: input.notesConsent === true } : {}),
      ...(action === "replace" ? { p_date: input.date, p_service: input.service, p_arrival_time: input.time, p_party_size: input.party } : {}),
    });
    if (error) return managementError(error);
    const booking = publicBooking(data?.booking);
    let notificationStatus: "inviata" | "non_configurata" | "fallita" | "non_richiesta" = "non_richiesta";
    // The event is persisted in the same transaction as the mutation, including
    // if sending fails. A retry with the old version cannot duplicate a change.
    if (typeof data.event_id === "string" && uuid.test(data.event_id)) {
      try { notificationStatus = await sendStaffBookingManagementEmail(client, data.event_id); }
      catch { notificationStatus = "fallita"; console.error("Avviso gestione prenotazione non inviato."); }
    }
    return reply({ booking, previous_code: typeof data.previous_code === "string" ? data.previous_code : null,
      notification_status: notificationStatus });
  } catch {
    console.error("Gestione pubblica: servizio non disponibile.");
    return reply({ error: "failed" }, 503);
  }
}
