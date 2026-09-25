import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingConfirmation } from "../public-booking";
import { MESSAGE_TEMPLATES, renderMessageTemplate } from "./templates";

export type ConfirmationEmailStatus = "non_richiesta" | "inviata" | "non_configurata" | "fallita";

export async function sendStaffNewRequestEmail(
  client: SupabaseClient,
  booking: BookingConfirmation,
  phone: string,
): Promise<"inviata" | "non_configurata" | "fallita"> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const recipient = process.env.RESEND_STAFF_EMAIL || "prenotazioni@lacantinadeibriganti.com";
  if (!apiKey || !from) {
    console.error("Avviso staff: configurazione Resend incompleta.", {
      missingApiKey: !apiKey, missingFrom: !from,
    });
    return "non_configurata";
  }

  const { data: reservation, error: reservationError } = await client.from("reservations")
    .select("id").eq("code", booking.code).single();
  if (reservationError || !reservation) {
    console.error("Avviso staff: prenotazione non trovata dopo il salvataggio.", {
      code: reservationError?.code, message: reservationError?.message,
    });
    return "fallita";
  }

  const subject = `Nuova richiesta di prenotazione · ${booking.code}`;
  const body = [
    "È arrivata una nuova richiesta di prenotazione da approvare nella Sala Staff.",
    `Codice: ${booking.code}`,
    `Cliente: ${booking.name}`,
    `Telefono: ${phone}`,
    `Data: ${booking.date} · ${booking.service} · ${booking.arrival_time.slice(0, 5)}`,
    `Persone: ${booking.party_size}`,
    "Apri l'area staff per accettare o rifiutare la richiesta.",
  ].join("\n");
  const { data: notification, error: logError } = await client.from("notifications")
    .insert({ reservation_id: reservation.id, channel: "email", kind: "richiesta",
      recipient, subject, body, status: "in_attesa" }).select("id").single();
  if (logError || !notification) {
    console.error("Avviso staff: impossibile registrare il tentativo.", {
      code: logError?.code, message: logError?.message,
    });
    return "fallita";
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `richiesta-${reservation.id}`,
      },
      body: JSON.stringify({ from, to: [recipient], subject, text: body }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => null);
    const providerId = result && typeof result.id === "string" ? result.id : null;
    const status = response.ok && providerId ? "inviata" : "fallita";
    const { error: updateError } = await client.from("notifications")
      .update({ status, provider_id: providerId }).eq("id", notification.id);
    if (updateError) console.error("Avviso staff: impossibile aggiornare il registro.", {
      code: updateError.code, message: updateError.message,
    });
    if (status === "fallita") console.error("Avviso staff: Resend ha rifiutato l'invio.", {
      httpStatus: response.status,
      providerError: typeof result?.name === "string" ? result.name : undefined,
      providerMessage: typeof result?.message === "string" ? result.message.slice(0, 300) : undefined,
    });
    return status;
  } catch (sendError) {
    console.error("Avviso staff: chiamata a Resend fallita.", sendError);
    const { error: updateError } = await client.from("notifications")
      .update({ status: "fallita" }).eq("id", notification.id);
    if (updateError) console.error("Avviso staff: impossibile registrare il fallimento.", {
      code: updateError.code, message: updateError.message,
    });
    return "fallita";
  }
}

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

  const { data: templates, error: templatesError } = await client.from("message_templates")
    .select("key,content").in("key", ["confirmEmailSubject", "confirmEmailBody"]);
  if (templatesError) console.error("Email conferma: modelli non disponibili, uso quelli predefiniti.");
  const saved = new Map((templates ?? []).map((item) => [item.key, item.content]));
  const subject = renderMessageTemplate(saved.get("confirmEmailSubject") || MESSAGE_TEMPLATES.confirmEmailSubject, booking)
    .replace(/[\r\n]+/g, " ").slice(0, 200);
  const body = renderMessageTemplate(saved.get("confirmEmailBody") || MESSAGE_TEMPLATES.confirmEmailBody, booking)
    .slice(0, 5000);
  const { data: notification, error: logError } = await client.from("notifications")
    .insert({
      reservation_id: reservation.id, channel: "email", kind: "conferma",
      recipient, subject, body, status: "in_attesa",
    }).select("id").single();
  if (logError || !notification) {
    console.error("Email conferma: impossibile registrare l'invio.", {
      code: logError?.code, message: logError?.message,
    });
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
    if (updateError) console.error("Email conferma: impossibile aggiornare il registro.", {
      code: updateError.code, message: updateError.message,
    });
    if (status === "fallita") console.error("Email conferma: Resend ha rifiutato l'invio.", {
      httpStatus: response.status,
      providerError: typeof result?.name === "string" ? result.name : undefined,
      providerMessage: typeof result?.message === "string" ? result.message.slice(0, 300) : undefined,
    });
    return status;
  } catch (sendError) {
    console.error("Email conferma: chiamata a Resend fallita.", sendError);
    const { error: updateError } = await client.from("notifications")
      .update({ status: "fallita" }).eq("id", notification.id);
    if (updateError) console.error("Email conferma: impossibile registrare il fallimento.", {
      code: updateError.code, message: updateError.message,
    });
    return "fallita";
  }
}
