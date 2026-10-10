import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { addDays, isServiceOpenOnDate, todayInRome } from "../lib/public-booking.ts";

// Le API vengono eseguite realmente; solo Supabase e l’invio email sono sostituiti.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "test:server-only", shortCircuit: true };
    if (specifier.endsWith("/lib/supabase/server")) return { url: "test:booking-server", shortCircuit: true };
    if (specifier.endsWith("/lib/notifications/email")) return { url: "test:booking-email", shortCircuit: true };
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
  load(url, context, nextLoad) {
    if (url === "test:server-only") return { format: "module", source: "", shortCircuit: true };
    if (url === "test:booking-server") return {
      format: "module", shortCircuit: true,
      source: "export function createServerSupabaseClient() { return globalThis.publicBookingTest.client; }",
    };
    if (url === "test:booking-email") return {
      format: "module", shortCircuit: true,
      source: "export async function sendStaffNewRequestEmail() { globalThis.publicBookingTest.emails++; return 'inviata'; }",
    };
    return nextLoad(url, context);
  },
});

const { GET } = await import("../app/api/public/availability/route.ts");
const { POST } = await import("../app/api/public/reservations/route.ts");
const date = Array.from({ length: 7 }, (_, offset) => addDays(todayInRome(), offset + 1))
  .find((value) => isServiceOpenOnDate(value, "pranzo") && isServiceOpenOnDate(value, "cena"));

function scenario(options = {}) {
  const state = {
    availability: { pranzo: true, cena: true, blocked: { pranzo: false, cena: false } },
    availabilityError: null, schemaError: null, reservationError: null,
    reservationCalls: 0, availabilityCalls: 0, emails: 0, schemaTables: [], ...options,
  };
  state.client = {
    from(table) {
      state.schemaTables.push(table);
      return { select: () => ({ limit: async () => ({
        data: [], error: table === "booking_blocks" ? state.schemaError : null,
      }) }) };
    },
    async rpc(name, args) {
      if (name === "public_available_services") {
        state.availabilityCalls++;
        return { data: state.availability, error: state.availabilityError };
      }
      assert.equal(name, "create_public_reservation_with_notes_consent");
      state.reservationCalls++;
      return { data: {
        date: args.p_date, service: args.p_service, arrival_time: args.p_arrival_time,
        party_size: args.p_party_size, name: args.p_name, table_name: "T1", code: "ABC123",
      }, error: state.reservationError };
    },
  };
  globalThis.publicBookingTest = state;
  return state;
}

function availabilityRequest(selectedDate = date) {
  return new Request(`http://localhost/api/public/availability?date=${selectedDate}&party=2`);
}

function reservationRequest() {
  return new Request("http://localhost/api/public/reservations", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify({ date, service: "pranzo", time: "12:30", party: 2,
      name: "Giulia Bianchi", phone: "+39 333 123 4567", email: "", notes: "", notesConsent: false }),
  });
}

test("l’API conserva il blocco pranzo senza disabilitare la cena libera", async () => {
  scenario({ availability: { pranzo: true, cena: true, blocked: { pranzo: true, cena: false } } });
  const response = await GET(availabilityRequest());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { pranzo: false, cena: true, blocked: { pranzo: true, cena: false } });
});

test("uno schema vecchio o un errore Supabase non rendono prenotabili i servizi", async (context) => {
  context.mock.method(console, "error", () => {});
  for (const options of [
    { availability: { pranzo: true, cena: true } },
    { availabilityError: { code: "PGRST000", message: "Unavailable" } },
  ]) {
    scenario(options);
    const response = await GET(availabilityRequest());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Non riusciamo a controllare i tavoli. Riprova tra poco." });
  }
});

test("un giorno normalmente chiuso non richiede una lettura del database", async () => {
  const closedDate = Array.from({ length: 7 }, (_, offset) => addDays(todayInRome(), offset + 1))
    .find((value) => !isServiceOpenOnDate(value, "pranzo") && !isServiceOpenOnDate(value, "cena"));
  const state = scenario();
  const response = await GET(availabilityRequest(closedDate));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { pranzo: false, cena: false, blocked: { pranzo: false, cena: false } });
  assert.equal(state.availabilityCalls, 0);
});

test("una sospensione sopraggiunta durante la compilazione risponde 409 senza email", async (context) => {
  context.mock.method(console, "error", () => {});
  const state = scenario({ reservationError: { code: "P0001", message: "Prenotazioni online sospese per questo servizio" } });
  const response = await POST(reservationRequest());
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Le prenotazioni online per questo servizio sono sospese. Scegli un’altra opzione." });
  assert.equal(state.reservationCalls, 1);
  assert.equal(state.emails, 0);
  assert.deepEqual(state.schemaTables, ["reservations", "booking_blocks"]);
});

test("senza la migrazione dei blocchi non viene tentato alcun inserimento", async (context) => {
  context.mock.method(console, "error", () => {});
  const state = scenario({ schemaError: { code: "PGRST205", message: "Missing booking_blocks" } });
  const response = await POST(reservationRequest());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Le richieste online sono temporaneamente sospese. Riprova più tardi." });
  assert.equal(state.reservationCalls, 0);
  assert.equal(state.emails, 0);
});

test("con schema aggiornato una richiesta valida continua a essere salvata e notificata", async () => {
  const state = scenario();
  const response = await POST(reservationRequest());
  assert.equal(response.status, 201);
  assert.equal((await response.json()).code, "ABC123");
  assert.equal(state.reservationCalls, 1);
  assert.equal(state.emails, 1);
});
