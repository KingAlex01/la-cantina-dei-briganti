import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "test:server-only", shortCircuit: true };
    if (specifier === "@supabase/supabase-js") return { url: "test:staff-auth", shortCircuit: true };
    if (specifier.endsWith("/lib/supabase/server")) return { url: "test:staff-server", shortCircuit: true };
    if (specifier.endsWith("/lib/notifications/email")) return { url: "test:staff-email", shortCircuit: true };
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
  load(url, context, nextLoad) {
    const sources = {
      "test:server-only": "",
      "test:staff-auth": "export function createClient() { return { auth: { async getUser(token) { const s = globalThis.staffDecisionTest; s.authTokens.push(token); return { data: { user: s.authenticated ? { id: 'staff-user' } : null } }; } } }; }",
      "test:staff-server": "export function createServerSupabaseClient() { return globalThis.staffDecisionTest.client; }",
      "test:staff-email": "export async function sendBookingConfirmationEmail(client, booking, recipient) { const s = globalThis.staffDecisionTest; s.emails.push({ booking, recipient, savedStatus: s.reservation.status }); return 'inviata'; }",
    };
    if (Object.hasOwn(sources, url)) return { format: "module", source: sources[url], shortCircuit: true };
    return nextLoad(url, context);
  },
});

const { POST } = await import("../app/api/staff/reservations/decision/route.ts");
const reservationId = "12345678-1234-4234-8234-123456789abc";
const version = "22345678-1234-4234-8234-123456789abc";
const currentVersion = "32345678-1234-4234-8234-123456789abc";

function scenario(context, options = {}) {
  const savedEnv = { ...process.env };
  context.after(() => { process.env = savedEnv; delete globalThis.staffDecisionTest; });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  const state = {
    authenticated: true, staff: true, authTokens: [], tableReads: [], updates: [], emails: [],
    reservation: {
      id: reservationId, management_version: version, source: "online", status: "in_attesa",
      date: "2026-10-23", service: "cena", arrival_time: "20:30:00", party_size: 4,
      name: "Giulia Bianchi", email: "cliente@example.com", code: "0123456789ABCDEF",
    },
    ...options,
  };
  state.client = { from(table) {
    state.tableReads.push(table);
    if (table === "staff_users") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.staff ? { user_id: "staff-user" } : null }) }) }) };
    assert.equal(table, "reservations");
    return { update(patch) {
      const filters = [];
      state.updates.push({ patch, filters, applied: false });
      const attempt = state.updates.at(-1);
      const query = {
        eq(key, value) { filters.push([key, value]); return query; },
        select() { return query; },
        async maybeSingle() {
          if (!filters.every(([key, value]) => state.reservation[key] === value)) return { data: null };
          Object.assign(state.reservation, patch);
          attempt.applied = true;
          return { data: { ...state.reservation } };
        },
      };
      return query;
    } };
  } };
  globalThis.staffDecisionTest = state;
  return state;
}

function request(body = {}) {
  return new Request("http://localhost/api/staff/reservations/decision", {
    method: "POST", headers: { "content-type": "application/json", origin: "http://localhost", authorization: "Bearer staff-token" },
    body: JSON.stringify({ reservationId, action: "accept", version, ...body }),
  });
}

test("una versione mancante o non valida è rifiutata prima di autenticazione e scritture", async (context) => {
  const state = scenario(context);
  for (const invalid of [undefined, "", "old-version", 12]) {
    const response = await POST(request({ version: invalid }));
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Decisione non valida/);
  }
  assert.equal(state.authTokens.length, 0);
  assert.equal(state.tableReads.length, 0);
  assert.equal(state.updates.length, 0);
  assert.equal(state.emails.length, 0);
});

test("un utente autenticato fuori dallo staff non può decidere né inviare email", async (context) => {
  const state = scenario(context, { staff: false });
  assert.equal((await POST(request())).status, 403);
  assert.deepEqual(state.authTokens, ["staff-token"]);
  assert.deepEqual(state.tableReads, ["staff_users"]);
  assert.equal(state.updates.length, 0);
  assert.equal(state.emails.length, 0);
});

test("la versione superata produce conflitto senza sovrascrivere la prenotazione o inviare conferme", async (context) => {
  const state = scenario(context);
  state.reservation.management_version = currentVersion;
  state.reservation.party_size = 6;
  const before = structuredClone(state.reservation);
  const response = await POST(request());
  assert.equal(response.status, 409);
  assert.ok(state.updates[0].filters.some(([key, value]) => key === "management_version" && value === version));
  assert.equal(state.updates[0].applied, false);
  assert.deepEqual(state.reservation, before);
  assert.equal(state.emails.length, 0);
});

test("l'accettazione aggiornata conferma prima dell'email e una seconda decisione non duplica l'invio", async (context) => {
  const state = scenario(context);
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "confermata", email_status: "inviata" });
  assert.deepEqual(state.updates[0].filters, [["id", reservationId], ["source", "online"], ["status", "in_attesa"], ["management_version", version]]);
  assert.equal(state.reservation.status, "confermata");
  assert.ok(Number.isFinite(Date.parse(state.reservation.approved_at)));
  assert.equal(state.emails.length, 1);
  assert.equal(state.emails[0].savedStatus, "confermata");
  assert.equal(state.emails[0].recipient, "cliente@example.com");
  assert.equal(state.emails[0].booking.code, "0123456789ABCDEF");
  assert.equal(state.emails[0].booking.party_size, 4);
  assert.equal((await POST(request())).status, 409);
  assert.equal(state.emails.length, 1);
});

test("il rifiuto aggiornato cancella la richiesta senza inviare un'email automatica", async (context) => {
  const state = scenario(context);
  const response = await POST(request({ action: "reject" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "annullata" });
  assert.equal(state.reservation.status, "annullata");
  assert.deepEqual(state.updates[0].patch, { status: "annullata" });
  assert.equal(state.emails.length, 0);
});

test("un token scaduto non accede al database riservato e non modifica la richiesta", async (context) => {
  const state = scenario(context, { authenticated: false });
  assert.equal((await POST(request())).status, 401);
  assert.equal(state.tableReads.length, 0);
  assert.equal(state.updates.length, 0);
  assert.equal(state.emails.length, 0);
});
