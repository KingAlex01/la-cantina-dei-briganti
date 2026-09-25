import { SERVICE_TIMES, validDate, validPartySize } from "../../../../lib/public-booking";
import type { Service } from "../../../../lib/public-booking";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { sendStaffNewRequestEmail } from "../../../../lib/notifications/email";
import type { BookingConfirmation } from "../../../../lib/public-booking";
import { readJsonObject } from "../../../../lib/read-json-object";

const bookingOrigins = new Set([
  "https://lacantinadeibriganti.com",
  "https://www.lacantinadeibriganti.com",
  "https://lacantinadeibriganti.netlify.app",
]);

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Richiesta non consentita." }, { status: 403 });
  }
  const requestUrl = new URL(request.url);
  const localRequest = ["localhost", "127.0.0.1", "[::1]"].includes(requestUrl.hostname);
  if (origin && !bookingOrigins.has(origin) && !(localRequest && origin === requestUrl.origin)) {
    return Response.json({ error: "Richiesta non consentita." }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Formato della richiesta non valido." }, { status: 415 });
  }
  if (Number(request.headers.get("content-length")) > 6000) {
    return Response.json({ error: "Dati della prenotazione troppo lunghi." }, { status: 413 });
  }

  let input: Record<string, unknown>;
  try {
    input = await readJsonObject(request, 6000);
  } catch {
    return Response.json({ error: "Dati della prenotazione non validi." }, { status: 400 });
  }
  if (input.website) return Response.json({ error: "Richiesta non consentita." }, { status: 400 });

  const { date, service, time, party, name, phone, email, notes, notesConsent } = input;
  const cleanedName = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  const cleanedPhone = typeof phone === "string" ? phone.trim() : "";
  const cleanedEmail = typeof email === "string" ? email.trim() : "";
  const cleanedNotes = typeof notes === "string" ? notes.trim() : "";
  const phoneKey = cleanedPhone.replace(/\D/g, "").replace(/^(?:0039|39)(?=\d{10,})/, "");
  if (!validDate(date) || !validPartySize(party) ||
      (service !== "pranzo" && service !== "cena") ||
      typeof time !== "string" || !SERVICE_TIMES[service as Service].includes(time) ||
      (service === "pranzo" && new Date(`${date}T12:00:00Z`).getUTCDay() === 1) ||
      !/^\S+\s+\S+/.test(cleanedName) || cleanedName.length > 120 ||
      cleanedPhone.length > 30 || !/^\d{6,15}$/.test(phoneKey) ||
      cleanedEmail.length > 254 || (cleanedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) ||
      cleanedNotes.length > 1000 || (cleanedNotes && notesConsent !== true)) {
    return Response.json({ error: "Controlla data, orario e dati di contatto." }, { status: 400 });
  }

  try {
    const client = createServerSupabaseClient();
    // Evita di creare una prenotazione già confermata se il codice è stato
    // pubblicato prima della migrazione che introduce l'approvazione manuale.
    const { error: schemaError } = await client.from("reservations")
      .select("approved_at").limit(1);
    if (schemaError) {
      console.error("Prenotazione pubblica: controllo dello schema fallito; verificare migrazione 20260925000100 e accesso Supabase:", {
        code: schemaError.code, message: schemaError.message,
      });
      return Response.json({ error: "Le richieste online sono temporaneamente sospese. Riprova più tardi." }, { status: 503 });
    }
    const { data, error } = await client.rpc("create_public_reservation_with_notes_consent", {
      p_date: date, p_service: service, p_arrival_time: time, p_party_size: party,
      p_name: cleanedName, p_phone: cleanedPhone, p_email: cleanedEmail || null,
      p_notes: cleanedNotes, p_reminder_opt_in: false, p_notes_consent: notesConsent === true,
    });
    if (error) {
      console.error("Prenotazione pubblica: RPC Supabase fallita:", {
        code: error.code, message: error.message, details: error.details,
      });
      if (error.message.includes("Nessun tavolo disponibile") || error.code === "23505") {
        return Response.json({ error: "Il servizio si è appena riempito. Scegli un'altra opzione." }, { status: 409 });
      }
      if (error.message.includes("Orario già trascorso")) {
        return Response.json({ error: "L’orario scelto è già passato. Scegline un altro." }, { status: 409 });
      }
      throw error;
    }
    try {
      const staffEmailStatus = await sendStaffNewRequestEmail(client, data as BookingConfirmation, cleanedPhone);
      if (staffEmailStatus !== "inviata") console.error(`Avviso staff non inviato: ${staffEmailStatus}.`);
    } catch (emailError) {
      console.error("Avviso staff non inviato dopo il salvataggio della richiesta:", emailError);
    }
    return Response.json(data, {
      status: 201, headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Prenotazione pubblica fallita:", error);
    return Response.json({ error: "Non siamo riusciti a salvare la prenotazione. Riprova tra poco." }, { status: 503 });
  }
}
