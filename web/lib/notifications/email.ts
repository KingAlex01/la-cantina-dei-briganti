import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dateLabel } from "../public-booking";
import type { BookingConfirmation } from "../public-booking";

export type ConfirmationEmailStatus = "non_richiesta" | "inviata" | "non_configurata" | "fallita";

export async function sendBookingConfirmationEmail(
  client: SupabaseClient,
  booking: BookingConfirmation,
  recipient: string,
): Promise<ConfirmationEmailStatus> {
  if (!recipient) return "non_richiesta";

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return "non_configurata";

  const { data: reservation, error: reservationError } = await client.from("reservations")
    .select("id").eq("code", booking.code).single();
  if (reservationError || !reservation) {
    console.error("Email conferma: prenotazione non trovata.");
    return "fallita";
  }

  const firstName = booking.name.trim().split(/\s+/)[0];
  const subject = "Prenotazione confermata — La cantina dei briganti";
  const body = `Ciao ${firstName},\n\nti confermiamo il tavolo per ${booking.party_size} ${booking.party_size === 1 ? "persona" : "persone"}, ${dateLabel(booking.date)} alle ${booking.arrival_time.slice(0, 5)}. Il tavolo è tuo per tutto il servizio.\n\nCodice prenotazione: ${booking.code}\n\nPer modificare o annullare contatta il ristorante.\n\nA presto,\nLa cantina dei briganti`;
  const { data: notification, error: logError } = await client.from("notifications")
    .insert({
      reservation_id: reservation.id, channel: "email", kind: "conferma",
      recipient, subject, body, status: "in_attesa",
    }).select("id").single();
  if (logError || !notification) {
    console.error("Email conferma: impossibile registrare l'invio.");
    return "fallita";
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `conferma-${reservation.id}`,
      },
      body: JSON.stringify({ from, to: [recipient], subject, text: body }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => null);
    const providerId = result && typeof result.id === "string" ? result.id : null;
    const status = response.ok && providerId ? "inviata" : "fallita";
    const { error: updateError } = await client.from("notifications")
      .update({ status, provider_id: providerId }).eq("id", notification.id);
    if (updateError) console.error("Email conferma: impossibile aggiornare il registro.");
    if (status === "fallita") console.error(`Email conferma: provider HTTP ${response.status}.`);
    return status;
  } catch {
    await client.from("notifications").update({ status: "fallita" }).eq("id", notification.id);
    console.error("Email conferma: invio non riuscito.");
    return "fallita";
  }
}
