import assert from "node:assert/strict";
import test from "node:test";
import { availableArrivalTimes, bookableServices, parsePublicAvailability, serviceAvailabilityState } from "../lib/public-booking.ts";
import { bookingCopy, bookingErrorKey } from "../lib/i18n/booking.ts";

const freeTables = { pranzo: true, cena: true };

test("l’apertura straordinaria abilita solo il servizio scelto e conserva i metadati", () => {
  const availability = { ...freeTables, blocked: { pranzo: false, cena: false }, opened: { pranzo: true, cena: false } };
  const result = bookableServices("2026-10-08", availability, "2026-10-01", "10:00");
  assert.deepEqual(result, { ...availability, cena: false });
  assert.deepEqual(parsePublicAvailability(result), result);
  assert.equal(availableArrivalTimes("2026-10-08", "pranzo", "2026-10-01", "10:00", true).length, 4);
  assert.equal(serviceAvailabilityState("2026-10-08", "pranzo", result, false, "2026-10-01", "10:00"), "available");
  assert.equal(serviceAvailabilityState("2026-10-08", "cena", result, false, "2026-10-01", "10:00"), "closed");
  assert.equal(serviceAvailabilityState("2026-10-08", "pranzo", null, true, "2026-10-01", "10:00"), "checking");
});

test("apertura straordinaria: tavoli pieni, orari trascorsi e blocchi restano vincolanti", () => {
  const availability = { ...freeTables, blocked: { pranzo: false, cena: false }, opened: { pranzo: true, cena: true } };
  assert.deepEqual(bookableServices("2026-10-08", availability, "2026-10-08", "14:00"), { ...availability, pranzo: false });
  assert.equal(bookableServices("2026-10-08", { ...availability, pranzo: false }, "2026-10-01", "10:00").pranzo, false);
  assert.equal(bookableServices("2026-10-08", { ...availability, blocked: { pranzo: true, cena: false } }, "2026-10-01", "10:00").pranzo, false);
  assert.equal(bookableServices("2026-10-04", availability, "2026-10-01", "10:00").cena, true);
  assert.equal(serviceAvailabilityState("2026-10-08", "pranzo", { ...availability, pranzo: false }, false, "2026-10-01", "10:00"), "full");
  assert.equal(serviceAvailabilityState("2026-10-08", "pranzo", availability, false, "2026-10-08", "14:00"), "ended");
});

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

test("un blocco disabilita solo il servizio scelto e conserva i metadati per il cliente", () => {
  const availability = { ...freeTables, blocked: { pranzo: true, cena: false } };
  const result = bookableServices("2026-10-02", availability, "2026-10-01", "10:00");
  assert.deepEqual(result, { pranzo: false, cena: true, blocked: { pranzo: true, cena: false } });
  assert.deepEqual(bookableServices("2026-10-02", result, "2026-10-01", "10:00"), result);
  assert.deepEqual(availability, { ...freeTables, blocked: { pranzo: true, cena: false } });
});

test("bloccare entrambi i servizi impedisce le nuove richieste anche con tavoli liberi", () => {
  const availability = { ...freeTables, blocked: { pranzo: true, cena: true } };
  assert.deepEqual(bookableServices("2026-10-02", availability, "2026-10-01", "10:00"), {
    pranzo: false, cena: false, blocked: { pranzo: true, cena: true },
  });
});

test("la riapertura ripristina solo i servizi con tavoli liberi e orari ancora prenotabili", () => {
  const availability = { pranzo: false, cena: true, blocked: { pranzo: false, cena: false } };
  assert.deepEqual(bookableServices("2026-10-02", availability, "2026-10-02", "22:00"), {
    pranzo: false, cena: false, blocked: { pranzo: false, cena: false },
  });
  assert.deepEqual(bookableServices("2026-10-02", availability, "2026-10-01", "10:00"), availability);
});

test("la risposta di disponibilità richiede esplicitamente lo stato dei blocchi", () => {
  const availability = { pranzo: false, cena: true, blocked: { pranzo: true, cena: false } };
  assert.deepEqual(parsePublicAvailability(availability), availability);
  for (const response of [null, [], freeTables, { ...availability, pranzo: "true" },
    { ...availability, blocked: null }, { ...availability, blocked: { pranzo: true } },
    { ...availability, blocked: { pranzo: "false", cena: false } },
    { ...availability, opened: null }, { ...availability, opened: { pranzo: true } },
    { ...availability, opened: { pranzo: "true", cena: false } }]) {
    assert.equal(parsePublicAvailability(response), null);
  }
});

test("l’interfaccia distingue sospeso, completo, controllo in corso e controllo fallito", () => {
  const date = "2026-10-02";
  const today = "2026-10-01";
  const now = "10:00";
  const availability = { pranzo: false, cena: false, blocked: { pranzo: true, cena: false } };
  assert.equal(serviceAvailabilityState(date, "pranzo", availability, false, today, now), "paused");
  assert.equal(serviceAvailabilityState(date, "cena", availability, false, today, now), "full");
  assert.equal(serviceAvailabilityState(date, "pranzo", null, true, today, now), "checking");
  assert.equal(serviceAvailabilityState(date, "pranzo", null, false, today, now), "unavailable");
  assert.equal(serviceAvailabilityState(date, "cena", { ...availability, cena: true }, false, today, now), "available");
  assert.equal(serviceAvailabilityState("2026-10-08", "pranzo", availability, false, today, now), "closed");
  assert.equal(serviceAvailabilityState(date, "pranzo", availability, false, date, "14:00"), "ended");
});

test("un servizio sospeso durante la compilazione produce l’errore tradotto corretto nelle quattro lingue", () => {
  const message = "Le prenotazioni online per questo servizio sono sospese. Scegli un’altra opzione.";
  const key = bookingErrorKey(message, "bookingFailed");
  assert.equal(key, "servicePaused");
  const expected = {
    it: "Le prenotazioni online per questo servizio sono sospese. Scegli un’altra opzione.",
    en: "Online booking for this service is paused. Choose another option.",
    es: "Las reservas en línea para este servicio están suspendidas. Elige otra opción.",
    fr: "Les réservations en ligne pour ce service sont suspendues. Choisissez une autre option.",
  };
  for (const [language, copy] of Object.entries(bookingCopy)) {
    assert.equal(copy.errors[key], expected[language]);
    assert.notEqual(copy.errors[key], copy.errors.serviceFull);
    assert.notEqual(copy.paused, copy.full);
    assert.notEqual(copy.unavailable, copy.full);
  }
});
