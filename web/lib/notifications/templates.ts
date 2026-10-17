import type { BookingConfirmation } from "../public-booking";
import { dateLabel } from "../public-booking";
import { RESTAURANT } from "../restaurant";

export const BOOKING_MANAGEMENT_URL = `${RESTAURANT.url}/prenota/gestisci`;
const codeConfidentiality = "Custodisci il codice: chi lo conosce può gestire la prenotazione.";
const managementInstruction = `Per modificare, cancellare o aggiungere note, inserisci il codice su ${BOOKING_MANAGEMENT_URL}`;

export function withBookingManagementDetails(message: string, code?: string, manageOnline = true) {
  if (!manageOnline) {
    const content = message.replaceAll(managementInstruction, "").replaceAll(codeConfidentiality, "")
      .replace(/\n{3,}/g, "\n\n").trim();
    return [content,
      ...(code && !content.includes(code) ? [`Codice prenotazione: ${code}`] : []),
      ...(!content.includes("Per modificare o cancellare contatta il ristorante.") ? ["Per modificare o cancellare contatta il ristorante."] : []),
    ].join("\n\n");
  }
  const additions: string[] = [];
  if (code && !message.includes(code)) additions.push(`Codice prenotazione: ${code}`);
  if (!message.includes(BOOKING_MANAGEMENT_URL)) {
    additions.push(managementInstruction);
  }
  if (!message.includes(codeConfidentiality)) additions.push(codeConfidentiality);
  return [message, ...additions].join("\n\n");
}

export const MESSAGE_TEMPLATES = {
  confirmEmailSubject: "Prenotazione confermata — {ristorante}",
  confirmEmailBody: `Ciao {nome},\n\nti confermiamo il tavolo per {persone} persone, {data} alle {ora}. Il tavolo è tuo per tutto il servizio.\n\nCodice prenotazione: {codice}\n\nPer modificare, cancellare o aggiungere note, inserisci il codice su ${BOOKING_MANAGEMENT_URL}\n\n${codeConfidentiality}\n\nA presto,\n{ristorante}`,
  reminderText: "Ciao {nome}, ti aspettiamo oggi alle {ora} per {persone} persone. Se non riesci a venire avvisaci. {ristorante}",
} as const;

export type MessageTemplateKey = keyof typeof MESSAGE_TEMPLATES;

export function renderMessageTemplate(template: string, booking: Pick<BookingConfirmation, "name" | "date" | "arrival_time" | "party_size" | "code">) {
  const values: Record<string, string> = {
    nome: booking.name.trim().replace(/\s+/g, " "),
    data: dateLabel(booking.date),
    ora: booking.arrival_time.slice(0, 5),
    persone: String(booking.party_size),
    codice: booking.code,
    ristorante: "La cantina dei briganti",
  };
  return template.replace(/\{(nome|data|ora|persone|codice|ristorante)\}/g, (_, key: string) => values[key]);
}
