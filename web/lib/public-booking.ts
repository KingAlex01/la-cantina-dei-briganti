export type Service = "pranzo" | "cena";

export const OPENING_HOURS: ReadonlyArray<{ day: string; hours: string; pranzo: boolean; cena: boolean }> = [
  { day: "Domenica", hours: "12:30–15:00", pranzo: true, cena: false },
  { day: "Lunedì", hours: "12:30–14:30 · 19:30–22:30", pranzo: true, cena: true },
  { day: "Martedì", hours: "12:30–14:30 · 19:30–22:30", pranzo: true, cena: true },
  { day: "Mercoledì", hours: "12:30–14:30 · 19:30–22:30", pranzo: true, cena: true },
  { day: "Giovedì", hours: "Chiuso", pranzo: false, cena: false },
  { day: "Venerdì", hours: "12:30–14:30 · 19:30–22:30", pranzo: true, cena: true },
  { day: "Sabato", hours: "12:30–14:30 · 19:30–22:30", pranzo: true, cena: true },
];

export const SERVICE_TIMES: Record<Service, string[]> = {
  pranzo: ["12:30", "13:00", "13:30", "14:00"],
  cena: ["19:30", "20:00", "20:30", "21:00", "21:30", "22:00"],
};

export type Availability = Record<Service, boolean>;
export type PublicAvailability = Availability & { blocked: Availability };

export function parsePublicAvailability(value: unknown): PublicAvailability | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  if (typeof result.pranzo !== "boolean" || typeof result.cena !== "boolean" ||
      !result.blocked || typeof result.blocked !== "object" || Array.isArray(result.blocked)) return null;
  const blocked = result.blocked as Record<string, unknown>;
  if (typeof blocked.pranzo !== "boolean" || typeof blocked.cena !== "boolean") return null;
  return { pranzo: result.pranzo, cena: result.cena, blocked: { pranzo: blocked.pranzo, cena: blocked.cena } };
}

export function isServiceOpenOnDate(date: string, service: Service) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return Number.isInteger(day) && (OPENING_HOURS[day]?.[service] ?? false);
}

export function availableArrivalTimes(date: string, service: Service, today = todayInRome(), now = currentTimeInRome()) {
  if (date < today || !isServiceOpenOnDate(date, service)) return [];
  return SERVICE_TIMES[service].filter((slot) => date !== today || slot > now);
}

export function bookableServices(date: string, availability: PublicAvailability, today?: string, now?: string): PublicAvailability;
export function bookableServices(date: string, availability: Availability, today?: string, now?: string): Availability;
export function bookableServices(date: string, availability: Availability & { blocked?: Availability }, today = todayInRome(), now = currentTimeInRome()) {
  const services = {
    pranzo: availability.pranzo === true && availability.blocked?.pranzo !== true && availableArrivalTimes(date, "pranzo", today, now).length > 0,
    cena: availability.cena === true && availability.blocked?.cena !== true && availableArrivalTimes(date, "cena", today, now).length > 0,
  };
  return availability.blocked ? { ...services, blocked: { ...availability.blocked } } : services;
}

export type ServiceAvailabilityState = "closed" | "ended" | "checking" | "unavailable" | "paused" | "available" | "full";

export function serviceAvailabilityState(date: string, service: Service, availability: PublicAvailability | null,
  checking: boolean, today = todayInRome(), now = currentTimeInRome()): ServiceAvailabilityState {
  if (!isServiceOpenOnDate(date, service)) return "closed";
  if (!availableArrivalTimes(date, service, today, now).length) return "ended";
  if (checking) return "checking";
  if (!availability) return "unavailable";
  if (availability.blocked[service]) return "paused";
  return availability[service] ? "available" : "full";
}
export type BookingConfirmation = {
  date: string;
  service: Service;
  arrival_time: string;
  party_size: number;
  name: string;
  table_name: string;
  code: string;
};

export function todayInRome() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function currentTimeInRome() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function validDate(date: unknown) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  const today = todayInRome();
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date &&
    date >= today && date <= addDays(today, 60);
}

export function validPartySize(size: unknown): size is number {
  return typeof size === "number" && Number.isInteger(size) && size >= 1 && size <= 8;
}

export function dateLabel(date: string, locale = "it-IT") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
