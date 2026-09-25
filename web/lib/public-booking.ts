export type Service = "pranzo" | "cena";

export const SERVICE_TIMES: Record<Service, string[]> = {
  pranzo: ["12:30", "13:00", "13:30", "14:00"],
  cena: ["19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"],
};

export type Availability = Record<Service, boolean>;
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

export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
