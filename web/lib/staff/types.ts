export type Service = "pranzo" | "cena";
export type ReservationStatus = "confermata" | "arrivato" | "no-show" | "annullata";
export type TableShape = "round" | "square" | "rect";

export type DiningTable = {
  id: string;
  name: string;
  capacity: number;
  area: string;
  shape: TableShape;
  pos_x: number;
  pos_y: number;
  archived_at: string | null;
};

export type Reservation = {
  id: string;
  date: string;
  service: Service;
  arrival_time: string;
  party_size: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string;
  reminder_opt_in: boolean;
  table_id: string;
  customer_id: string | null;
  status: ReservationStatus;
  source: "online" | "staff";
  code: string;
  created_at: string;
};

export type Customer = {
  id: string;
  phone_key: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string;
  tags: string[];
  created_at: string;
};

export type CustomerStats = {
  customer_id: string;
  visits: number;
  covers: number;
  no_shows: number;
  last_visit: string | null;
  next_date: string | null;
};

export const SERVICE_TIMES: Record<Service, string[]> = {
  pranzo: ["12:30", "13:00", "13:30", "14:00"],
  cena: ["19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"],
};

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  confermata: "Confermata",
  arrivato: "Arrivati",
  "no-show": "No-show",
  annullata: "Annullata",
};

export const CUSTOMER_TAGS = ["VIP", "Habitué", "Allergie", "Vegetariano", "Attenzione"];

export function todayInRome() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (part: string) => parts.find((item) => item.type === part)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function defaultServiceInRome(): Service {
  const today = todayInRome();
  if (new Date(`${today}T12:00:00Z`).getUTCDay() === 1) return "cena";
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", hour: "2-digit", hour12: false,
  }).format(new Date()));
  return hour < 15 ? "pranzo" : "cena";
}

export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome",
  }).format(new Date(`${date}T12:00:00+02:00`));
}

export function timeLabel(time: string) {
  return time.slice(0, 5);
}

export function readableError(message: string) {
  if (message.includes("reservations_one_active_table_per_service")) return "Il tavolo è stato appena occupato. Ricarica e scegli un altro tavolo.";
  if (message.includes("tables_name_key")) return "Esiste già un tavolo con questo nome.";
  if (message.includes("tables_prevent_archiving_booked")) return "Sposta le prenotazioni future prima di eliminare il tavolo.";
  return message;
}
