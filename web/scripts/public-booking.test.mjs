import assert from "node:assert/strict";
import test from "node:test";
import { availableArrivalTimes, bookableServices } from "../lib/public-booking.ts";

const freeTables = { pranzo: true, cena: true };

test("giovedì: nessun servizio o orario, anche se il database restituisce tavoli liberi", () => {
  assert.deepEqual(bookableServices("2026-10-01", freeTables, "2026-10-01", "10:00"), { pranzo: false, cena: false });
  assert.deepEqual(availableArrivalTimes("2026-10-08", "pranzo", "2026-10-01", "10:00"), []);
  assert.deepEqual(availableArrivalTimes("2026-10-08", "cena", "2026-10-01", "10:00"), []);
});

test("domenica: pranzo prenotabile, cena chiusa", () => {
  assert.deepEqual(bookableServices("2026-10-04", freeTables, "2026-10-01", "23:00"), { pranzo: true, cena: false });
  assert.deepEqual(availableArrivalTimes("2026-10-04", "cena", "2026-10-01", "23:00"), []);
});

test("orari trascorsi: si può scegliere solo un arrivo successivo all’ora attuale", () => {
  assert.deepEqual(availableArrivalTimes("2026-10-02", "pranzo", "2026-10-02", "13:00"), ["13:30", "14:00"]);
  assert.deepEqual(bookableServices("2026-10-02", freeTables, "2026-10-02", "14:00"), { pranzo: false, cena: true });
  assert.deepEqual(bookableServices("2026-10-02", freeTables, "2026-10-02", "22:00"), { pranzo: false, cena: false });
  assert.deepEqual(availableArrivalTimes("2026-10-02", "cena", "2026-10-02", "22:01"), []);
});

test("le date future aperte restano prenotabili anche quando oggi è chiuso", () => {
  assert.deepEqual(bookableServices("2026-10-02", freeTables, "2026-10-01", "23:59"), freeTables);
  assert.equal(availableArrivalTimes("2026-10-02", "cena", "2026-10-01", "23:59")[0], "19:30");
});

test("la cena parte dalle 19:30, anche quando si prenota prima dell’apertura", () => {
  const times = availableArrivalTimes("2026-10-02", "cena", "2026-10-02", "18:00");
  assert.equal(times[0], "19:30");
  assert.ok(!times.includes("19:00"));
  assert.equal(availableArrivalTimes("2026-10-02", "cena", "2026-10-02", "19:00")[0], "19:30");
  assert.equal(availableArrivalTimes("2026-10-02", "cena", "2026-10-02", "19:30")[0], "20:00");
});

test("il controllo degli orari non rende disponibili servizi pieni o date passate", () => {
  assert.deepEqual(bookableServices("2026-10-02", { pranzo: false, cena: false }, "2026-10-01", "10:00"), { pranzo: false, cena: false });
  assert.deepEqual(bookableServices("2026-10-02", freeTables, "2026-10-03", "10:00"), { pranzo: false, cena: false });
});
