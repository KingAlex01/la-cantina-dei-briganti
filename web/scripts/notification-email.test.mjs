import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "test:server-only", shortCircuit: true };
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
  load(url, context, nextLoad) {
    if (url === "test:server-only") return { format: "module", source: "", shortCircuit: true };
    return nextLoad(url, context);
  },
});

const { sendStaffNewRequestEmail, sendBookingConfirmationEmail } = await import("../lib/notifications/email.ts");
const primary = "prenotazioni@lacantinadeibriganti.com";
const gmail = "la.cantina.dei.briganti23@gmail.com";
const booking = {
  code: "TEST123", name: "Giulia Bianchi", date: "2026-10-20",
  service: "cena", arrival_time: "20:30:00", party_size: 2, table_name: "T1",
};

function scenario(context, configuredEmail, providerOk = true) {
  const originalEnv = { ...process.env };
  context.after(() => { process.env = originalEnv; });
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM_EMAIL = "Cantina <test@example.com>";
  if (configuredEmail === undefined) delete process.env.RESEND_STAFF_EMAIL;
  else process.env.RESEND_STAFF_EMAIL = configuredEmail;

  const state = { requests: [], notifications: [], updates: [] };
  context.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    state.requests.push(JSON.parse(options.body));
    return Response.json(providerOk ? { id: "email-test" } : { name: "validation_error" }, {
      status: providerOk ? 200 : 422,
    });
  });
  state.client = {
    from(table) {
      if (table === "reservations") return {
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: "reservation-test" } }) }) }),
      };
      if (table === "message_templates") return {
        select: () => ({ in: async () => ({ data: [] }) }),
      };
      assert.equal(table, "notifications");
      return {
        insert(row) {
          state.notifications.push(row);
          return { select: () => ({ single: async () => ({ data: { id: "notification-test" } }) }) };
        },
        update(row) {
          state.updates.push(row);
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  };
  return state;
}

for (const [label, configuredEmail] of [
  ["senza configurazione", undefined],
  ["con la precedente configurazione a un destinatario", primary],
  ["con entrambi già configurati, spazi e duplicati", ` ${primary}, ${gmail.toUpperCase()}, ${primary}, `],
  ["con configurazione vuota", " , "],
]) {
  test(`l'avviso staff raggiunge entrambe le caselle una sola volta ${label}`, async (context) => {
    const state = scenario(context, configuredEmail);
    assert.equal(await sendStaffNewRequestEmail(state.client, booking, "+39 333 123 4567"), "inviata");
    assert.equal(state.requests.length, 1);
    assert.deepEqual(state.requests[0].to, [primary, gmail]);
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0].recipient, `${primary}, ${gmail}`);
    assert.equal(state.notifications[0].kind, "richiesta");
    assert.equal(state.updates[0].status, "inviata");
  });
}

test("un rifiuto del provider registra il fallimento per entrambi i destinatari", async (context) => {
  context.mock.method(console, "error", () => {});
  const state = scenario(context, primary, false);
  assert.equal(await sendStaffNewRequestEmail(state.client, booking, "+39 333 123 4567"), "fallita");
  assert.deepEqual(state.requests[0].to, [primary, gmail]);
  assert.equal(state.updates[0].status, "fallita");
});

test("la conferma cliente continua a essere inviata soltanto al cliente", async (context) => {
  const state = scenario(context, primary);
  assert.equal(await sendBookingConfirmationEmail(state.client, booking, "cliente@example.com"), "inviata");
  assert.deepEqual(state.requests[0].to, ["cliente@example.com"]);
  assert.equal(state.notifications[0].recipient, "cliente@example.com");
  assert.equal(state.notifications[0].kind, "conferma");
});
