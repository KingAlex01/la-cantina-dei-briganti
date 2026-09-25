import type { BookingConfirmation } from "../public-booking";
import { dateLabel } from "../public-booking";

export const MESSAGE_TEMPLATES = {
  confirmEmailSubject: "Prenotazione confermata — {ristorante}",
  confirmEmailBody: "Ciao {nome},\n\nti confermiamo il tavolo per {persone} persone, {data} alle {ora}. Il tavolo è tuo per tutto il servizio.\n\nCodice prenotazione: {codice}\n\nPer modificare o annullare rispondi a questa email o contatta il ristorante.\n\nA presto,\n{ristorante}",
  reminderText: "Ciao {nome}, ti aspettiamo oggi alle {ora} per {persone} persone. Se non riesci a venire avvisaci. {ristorante}",
} as const;

export type MessageTemplateKey = keyof typeof MESSAGE_TEMPLATES;

export function renderMessageTemplate(template: string, booking: Pick<BookingConfirmation, "name" | "date" | "arrival_time" | "party_size" | "code">) {
  const values: Record<string, string> = {
    nome: booking.name.trim().split(/\s+/)[0] ?? "",
    data: dateLabel(booking.date),
    ora: booking.arrival_time.slice(0, 5),
    persone: String(booking.party_size),
    codice: booking.code,
    ristorante: "La cantina dei briganti",
  };
  return template.replace(/\{(nome|data|ora|persone|codice|ristorante)\}/g, (_, key: string) => values[key]);
}
