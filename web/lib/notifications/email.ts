import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingConfirmation } from "../public-booking";
import { MESSAGE_TEMPLATES, renderMessageTemplate, withBookingManagementDetails } from "./templates";
import { RESTAURANT } from "../restaurant";

export type ConfirmationEmailStatus = "non_richiesta" | "inviata" | "non_configurata" | "fallita";

function staffRecipients() {
  const configured = (process.env.RESEND_STAFF_EMAIL ?? "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return [...new Set([
    ...(configured.length ? configured : ["prenotazioni@lacantinadeibriganti.com"]),
    "la.cantina.dei.briganti23@gmail.com",
  ])];
}

type ManagementSnapshot = {
  code: string; name: string; phone: string | null; email: string | null;
  date: string; service: string; arrival_time: string; party_size: number;
  status: string; notes: string;
};

type CustomerBookingEvent = {
  id: string; reservation_id: string; kind: "annullamento" | "modifica" | "note";
  snapshot: { before: ManagementSnapshot; after: ManagementSnapshot };
};

function snapshotDetails(booking: ManagementSnapshot) {
  return [
    `Codice: ${booking.code}`,
    `Cliente: ${booking.name}`,
    `Telefono: ${booking.phone || "Non indicato"}`,
    `Data: ${booking.date} · ${booking.service} · ${booking.arrival_time.slice(0, 5)}`,
    `Persone: ${booking.party_size}`,
    `Note: ${booking.notes || "Nessuna nota"}`,
  ].join("\n");
}

// Il contenuto proviene dall'evento salvato nella stessa transazione della modifica:
// un aggiornamento successivo della prenotazione non cambia il messaggio da inviare.
export async function sendStaffBookingManagementEmail(
  client: SupabaseClient,
  eventId: string,
): Promise<"inviata" | "non_configurata" | "fallita"> {
  const { data, error: eventError } = await client.from("reservation_customer_events")
    .select("id,reservation_id,kind,snapshot").eq("id", eventId).single();
  const event = data as CustomerBookingEvent | null;
  if (eventError || !event?.snapshot?.before || !event.snapshot.after ||
      !["annullamento", "modifica", "note"].includes(event.kind)) {
    console.error("Avviso gestione prenotazione: evento non disponibile.", { eventId, code: eventError?.code });
    return "fallita";
  }
  const { before, after } = event.snapshot;
  const labels = {
    annullamento: "Prenotazione cancellata dal cliente",
    modifica: "Modifica prenotazione · nuova approvazione richiesta",
    note: "Note prenotazione aggiornate dal cliente",
  };
  const subject = `${labels[event.kind]} · ${after.code}`;
  const details = event.kind === "modifica" ? [
    "Il cliente ha modificato la prenotazione. La precedente è stata annullata.",
    "La nuova richiesta è IN ATTESA: occorre accettarla e inviare una nuova conferma al cliente.",
    "\nPRENOTAZIONE PRECEDENTE · ANNULLATA",
    snapshotDetails(before),
    "\nNUOVA RICHIESTA · IN ATTESA",
    snapshotDetails(after),
  ] : event.kind === "annullamento" ? [
    "Il cliente ha cancellato la prenotazione. Il tavolo è stato liberato.",
    "Stato: ANNULLATA",
    snapshotDetails(after),
  ] : [
    "Il cliente ha aggiornato le note. Data, orario, persone e stato della prenotazione restano invariati.",
    snapshotDetails(after),
    `\nNote precedenti: ${before.notes || "Nessuna nota"}`,
    `Note aggiornate: ${after.notes || "Nessuna nota"}`,
    "Non serve una nuova conferma. Leggi le note e contatta il cliente se necessario.",
  ];
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const configured = Boolean(apiKey && from);
  const body = [...details, `\nApri la Sala Staff: ${RESTAURANT.url}/staff`,
    ...(!configured ? ["\nInvio email non configurato: avviso conservato nel registro. Controlla la configurazione Resend."] : []),
  ].join("\n");
  const recipients = staffRecipients();
  const { data: notification, error: logError } = await client.from("notifications")
    .insert({
      reservation_id: event.reservation_id, customer_event_id: event.id,
      channel: "email", kind: event.kind, recipient: recipients.join(", "),
      subject, body, status: configured ? "in_attesa" : "fallita",
    }).select("id").single();
  if (logError?.code === "23505") {
    // L'indice univoco sull'evento evita due invii anche con richieste concorrenti.
    const { data: previous } = await client.from("notifications")
      .select("status").eq("customer_event_id", event.id).eq("channel", "email").maybeSingle();
    return previous?.status === "inviata" ? "inviata" : "fallita";
  }
  if (logError || !notification) {
    console.error("Avviso gestione prenotazione: impossibile registrare il tentativo.", {
      eventId, code: logError?.code,
    });
    return "fallita";
  }
  if (!configured) {
    console.error("Avviso gestione prenotazione: configurazione Resend incompleta.", {
      eventId, missingApiKey: !apiKey, missingFrom: !from,
    });
    return "non_configurata";
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json",
        "Idempotency-Key": `gestione-${event.id}`,
      },
      body: JSON.stringify({ from, to: recipients, subject, text: body }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => null);
    const providerId = result && typeof result.id === "string" ? result.id : null;
    const status = response.ok && providerId ? "inviata" : "fallita";
    const { error: updateError } = await client.from("notifications")
      .update({ status, provider_id: providerId }).eq("id", notification.id);
    if (updateError) console.error("Avviso gestione prenotazione: registro non aggiornato.", { eventId, code: updateError.code });
    if (status === "fallita") console.error("Avviso gestione prenotazione: invio rifiutato.", { eventId, httpStatus: response.status });
    return status;
  } catch {
    console.error("Avviso gestione prenotazione: chiamata a Resend fallita.", { eventId });
    const { error: updateError } = await client.from("notifications")
      .update({ status: "fallita" }).eq("id", notification.id);
    if (updateError) console.error("Avviso gestione prenotazione: fallimento non registrato.", { eventId, code: updateError.code });
    return "fallita";
  }
}

export async function sendStaffNewRequestEmail(
  client: SupabaseClient,
  booking: BookingConfirmation,
  phone: string,
): Promise<"inviata" | "non_configurata" | "fallita"> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  // Mantiene la copia Gmail anche con la configurazione server precedente.
  const recipients = staffRecipients();
  const recipient = recipients.join(", ");
  if (!apiKey || !from) {
    console.error("Avviso staff: configurazione Resend incompleta.", {
      missingApiKey: !apiKey, missingFrom: !from,
    });
    return "non_configurata";
  }

  const { data: reservation, error: reservationError } = await client.from("reservations")
    .select("id,notes").eq("code", booking.code).single();
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
    ...(reservation.notes ? [`Note: ${reservation.notes}`] : []),
    `Apri l'area staff per accettare o rifiutare la richiesta: ${RESTAURANT.url}/staff`,
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
      body: JSON.stringify({ from, to: recipients, subject, text: body }),
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
  manageOnline = true,
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
  const body = withBookingManagementDetails(renderMessageTemplate(
    saved.get("confirmEmailBody") || MESSAGE_TEMPLATES.confirmEmailBody, booking,
  ).slice(0, 5000), booking.code, manageOnline);
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
