import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { addDays, todayInRome } from "../lib/public-booking.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "test:server-only", shortCircuit: true };
    if (specifier.endsWith("/lib/supabase/server")) return { url: "test:manage-server", shortCircuit: true };
    if (specifier.endsWith("/lib/notifications/email")) return { url: "test:manage-email", shortCircuit: true };
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
  load(url, context, nextLoad) {
    if (url === "test:server-only") return { format: "module", source: "", shortCircuit: true };
    if (url === "test:manage-server") return { format: "module", shortCircuit: true,
      source: "export function createServerSupabaseClient() { return globalThis.managementTest.client; }" };
    if (url === "test:manage-email") return { format: "module", shortCircuit: true,
      source: "export async function sendStaffBookingManagementEmail(client, eventId) { const s = globalThis.managementTest; s.emails.push(eventId); if (s.emailThrows) throw Error('offline'); return s.emailStatus; }" };
    return nextLoad(url, context);
  },
});
const { POST } = await import("../app/api/public/reservations/manage/route.ts");
const date = addDays(todayInRome(), 2);
const version = "12345678-1234-4234-8234-123456789abc";
const eventId = "22345678-1234-4234-8234-123456789abc";
const booking = { code: "ABC123", name: "Giulia Bianchi", date, service: "cena", arrival_time: "20:00:00",
  party_size: 2, status: "confermata", notes: "", version };

function scenario(context, options = {}) {
  const env = { ...process.env };
  context.after(() => { process.env = env; });
  process.env.SUPABASE_SECRET_KEY = "test-server-only-secret";
  delete process.env.NETLIFY;
  context.mock.method(console, "error", () => {});
  const state = { calls: [], emails: [], allowed: true, limitError: null, error: null, data: booking,
    emailStatus: "inviata", ...options };
  state.client = { async rpc(name, args) {
    state.calls.push({ name, args });
    if (name === "consume_public_management_attempt") return {
      data: { allowed: state.allowed, retry_after: 3600 }, error: state.limitError,
    };
    if (name === "lookup_public_reservation") return { data: state.data, error: state.error };
    assert.equal(name, "manage_public_reservation");
    return { data: state.result ?? { booking: { ...booking, status: "annullata" }, previous_code: null, event_id: eventId }, error: state.error };
  } };
  globalThis.managementTest = state;
  return state;
}

function request(body = {}, headers = {}, url = "http://localhost/api/public/reservations/manage") {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost", ...headers },
    body: JSON.stringify({ action: "lookup", code: "ABC123", ...body }) });
}

test("lookup accetta il vecchio codice, normalizza e non espone contatti o tavoli", async (context) => {
  const state = scenario(context, { data: { ...booking, phone: "private", email: "private", id: "private", table_id: "private" } });
  const response = await POST(request({ code: " ab-c1 23 " }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { booking });
  assert.deepEqual(state.calls[1], { name: "lookup_public_reservation", args: { p_code: "ABC123" } });
  assert.match(state.calls[0].args.p_key, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(state.calls).includes("127.0.0.1"), false);
  assert.equal(state.emails.length, 0);
});

test("lookup accetta il nuovo codice lungo e non rivela prenotazioni inesistenti", async (context) => {
  const state = scenario(context, { data: { ...booking, code: "ABC123DEF456ABCD" } });
  assert.equal((await POST(request({ code: "ABC1-23DE-F456-ABCD" }))).status, 200);
  state.data = null;
  const missing = await POST(request());
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "not_found" });
});

test("origine, contenuto, codice e versione non validi vengono rifiutati prima del database", async (context) => {
  const state = scenario(context);
  for (const req of [
    request({}, { origin: "https://evil.example" }), request({}, { "sec-fetch-site": "cross-site" }),
    request({}, { origin: "" }), request({}, { "content-type": "text/plain" }),
    request({ code: "' OR true" }), request({ action: "cancel", version: "wrong" }),
    request({ action: "notes", version, notes: "Allergia", notesConsent: false }),
    request({ action: "notes", version, notes: "x".repeat(1001), notesConsent: true }),
    request({ action: "replace", version, date, service: "cena", time: "03:00", party: 2 }),
  ]) assert.ok((await POST(req)).status >= 400);
  assert.equal(state.calls.length, 0);
});

test("limite persistente e indisponibilità del controllo bloccano ogni accesso ai dati", async (context) => {
  const state = scenario(context, { allowed: false });
  const denied = await POST(request());
  assert.equal(denied.status, 429);
  assert.equal(denied.headers.get("retry-after"), "3600");
  state.limitError = { code: "42P01" };
  assert.equal((await POST(request())).status, 503);
  assert.ok(state.calls.every((call) => call.name === "consume_public_management_attempt"));
});

test("in produzione l’identità usa solo l’IP Netlify e ignora X-Forwarded-For", async (context) => {
  const state = scenario(context);
  process.env.NETLIFY = "true";
  const url = "https://lacantinadeibriganti.com/api/public/reservations/manage";
  const headers = { origin: "https://lacantinadeibriganti.com", "x-forwarded-for": "1.2.3.4" };
  assert.equal((await POST(request({}, headers, url))).status, 503);
  assert.equal(state.calls.length, 0);
  headers["x-nf-client-connection-ip"] = "203.0.113.12";
  assert.equal((await POST(request({}, headers, url))).status, 200);
  const first = state.calls[0].args.p_key;
  headers["x-forwarded-for"] = "8.8.8.8";
  await POST(request({}, headers, url));
  assert.equal(state.calls[2].args.p_key, first);
  headers["x-nf-client-connection-ip"] = "203.0.113.13";
  await POST(request({}, headers, url));
  assert.notEqual(state.calls[4].args.p_key, first);
});

test("cancellazione salvata invia un unico avviso staff legato all’evento", async (context) => {
  const state = scenario(context);
  const response = await POST(request({ action: "cancel", version }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).booking.status, "annullata");
  assert.deepEqual(state.emails, [eventId]);
  assert.deepEqual(state.calls[1].args, { p_code: "ABC123", p_version: version, p_action: "cancel" });
});

test("note conservano lo stato e non possono cambiare dati di contatto o approvazione", async (context) => {
  const state = scenario(context, { result: { booking: { ...booking, notes: "Seggiolone" }, event_id: eventId } });
  const response = await POST(request({ action: "notes", version, notes: " Seggiolone ", notesConsent: true,
    email: "attacker@example.com", status: "confermata", phone: "1111111" }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).booking.status, "confermata");
  assert.deepEqual(state.calls[1].args, { p_code: "ABC123", p_version: version, p_action: "notes",
    p_notes: "Seggiolone", p_notes_consent: true });
});

test("modifica passa alla RPC atomica e restituisce il nuovo codice in attesa", async (context) => {
  const replacement = { ...booking, code: "1234ABCD1234ABCD", status: "in_attesa", party_size: 4 };
  const state = scenario(context, { result: { booking: replacement, previous_code: "ABC123", event_id: eventId } });
  const response = await POST(request({ action: "replace", version, date, service: "cena", time: "20:30", party: 4 }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.booking.code, replacement.code);
  assert.equal(body.booking.status, "in_attesa");
  assert.equal(body.previous_code, "ABC123");
  assert.deepEqual(state.calls[1].args, { p_code: "ABC123", p_version: version, p_action: "replace",
    p_date: date, p_service: "cena", p_arrival_time: "20:30", p_party_size: 4 });
  assert.deepEqual(state.emails, [eventId]);
});

test("conflitto o mancanza disponibilità non inviano notifiche", async (context) => {
  const state = scenario(context);
  for (const [error, expected] of [
    [{ code: "40001", message: "stale" }, "conflict"],
    [{ code: "P0001", message: "Nessun tavolo disponibile per questo servizio" }, "unavailable"],
    [{ code: "P0001", message: "Prenotazioni online sospese per questo servizio" }, "paused"],
    [{ code: "P0001", message: "Il ristorante è chiuso per questo servizio" }, "closed"],
  ]) {
    state.error = error;
    const response = await POST(request({ action: "cancel", version }));
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error, expected);
  }
  assert.equal(state.emails.length, 0);
});

test("fallimento email non trasforma una cancellazione riuscita in errore da ripetere", async (context) => {
  scenario(context, { emailThrows: true });
  const response = await POST(request({ action: "cancel", version }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).notification_status, "fallita");
});

test("nessun avviso per note identiche senza nuovo evento", async (context) => {
  const state = scenario(context, { result: { booking, event_id: null } });
  assert.equal((await POST(request({ action: "notes", version, notes: "", notesConsent: false }))).status, 200);
  assert.equal(state.emails.length, 0);
});
