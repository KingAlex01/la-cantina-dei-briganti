import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "test:server-only", shortCircuit: true };
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
  load(url, context, nextLoad) {
    if (url === "test:server-only") return { format: "module", source: "", shortCircuit: true };
    return nextLoad(url, context);
  },
});

const { sendStaffBookingManagementEmail, sendBookingConfirmationEmail } = await import("../lib/notifications/email.ts");
const { BOOKING_MANAGEMENT_URL, withBookingManagementDetails } = await import("../lib/notifications/templates.ts");
const primary = "prenotazioni@lacantinadeibriganti.com";
const gmail = "la.cantina.dei.briganti23@gmail.com";
const original = {
  id: "previous-booking", code: "OLD123", name: "Giulia Bianchi", phone: "+39 333 123 4567", email: "cliente@example.com",
  date: "2026-10-20", service: "cena", arrival_time: "20:30:00", party_size: 2, notes: "Seggiolone", status: "confermata",
};

function scenario(context, { kind = "modifica", configured = true, provider = "ok", missingEvent = false, customTemplate } = {}) {
  const savedEnv = { ...process.env };
  context.after(() => { process.env = savedEnv; });
  if (configured) { process.env.RESEND_API_KEY = "test-key"; process.env.RESEND_FROM_EMAIL = "Cantina <test@example.com>"; }
  else { delete process.env.RESEND_API_KEY; delete process.env.RESEND_FROM_EMAIL; }
  process.env.RESEND_STAFF_EMAIL = ` ${primary},${gmail.toUpperCase()},${primary} `;
  context.mock.method(console, "error", () => {});
  const after = kind === "modifica" ? {
    ...original, id: "new-booking", code: "0123456789ABCDEF", date: "2026-10-23", arrival_time: "21:00:00",
    party_size: 4, notes: "Allergia alla frutta a guscio", status: "in_attesa",
  } : { ...original, notes: kind === "note" ? "Allergia alla frutta a guscio" : original.notes, status: kind === "annullamento" ? "annullata" : original.status };
  const state = {
    event: { id: "customer-event", reservation_id: after.id, kind, snapshot: { before: { ...original }, after } },
    requests: [], notifications: [], updates: [], eventReads: 0,
  };
  context.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    state.requests.push({ ...JSON.parse(options.body), headers: options.headers });
    if (provider === "throw") throw new Error("Simulated network failure");
    return Response.json(provider === "ok" ? { id: "email-test" } : { name: "validation_error" }, { status: provider === "ok" ? 200 : 422 });
  });
  state.client = {
    from(table) {
      if (table === "reservation_customer_events") return { select: () => ({ eq: () => ({ single: async () => {
        state.eventReads += 1;
        return { data: missingEvent ? null : structuredClone(state.event) };
      } }) }) };
      if (table === "reservations") return { select: () => ({ eq: () => ({ single: async () => ({ data: original }) }) }) };
      if (table === "message_templates") return { select: () => ({ in: async () => ({ data: customTemplate ? [{ key: "confirmEmailBody", content: customTemplate }] : [] }) }) };
      assert.equal(table, "notifications");
      return {
        insert(row) {
          return { select: () => ({ single: async () => {
            if (row.customer_event_id && state.notifications.some((item) => item.customer_event_id === row.customer_event_id)) return { error: { code: "23505" } };
            const stored = { ...row, id: `notification-${state.notifications.length}` };
            state.notifications.push(stored);
            return { data: { id: stored.id } };
          } }) };
        },
        select() {
          let eventId;
          const query = {
            eq(key, value) { if (key === "customer_event_id") eventId = value; return query; },
            async maybeSingle() { return { data: state.notifications.find((item) => item.customer_event_id === eventId) }; },
          };
          return query;
        },
        update(row) {
          state.updates.push(row);
          return { eq: async (_key, id) => { Object.assign(state.notifications.find((item) => item.id === id), row); return { error: null }; } };
        },
      };
    },
  };
  return state;
}

test("la modifica invia un solo avviso staff con vecchi e nuovi dati e richiesta di riconferma", async (context) => {
  const state = scenario(context);
  assert.equal(await sendStaffBookingManagementEmail(state.client, "customer-event"), "inviata");
  assert.equal(state.eventReads, 1);
  assert.equal(state.requests.length, 1);
  const message = state.requests[0];
  assert.deepEqual(message.to, [primary, gmail]);
  for (const content of ["OLD123", "0123456789ABCDEF", "2026-10-20", "2026-10-23", "20:30", "21:00", "Persone: 2", "Persone: 4", "Seggiolone", "Allergia alla frutta a guscio", "PRECEDENTE · ANNULLATA", "NUOVA RICHIESTA · IN ATTESA", "nuova conferma"]) assert.ok(message.text.includes(content), content);
  assert.equal(message.headers["Idempotency-Key"], "gestione-customer-event");
  assert.match(message.text, /https:\/\/lacantinadeibriganti\.com\/staff(?:\n|$)/);
  assert.doesNotMatch(message.text, /\/staff\?/);
  assert.equal(state.notifications[0].reservation_id, "new-booking");
  assert.equal(state.notifications[0].customer_event_id, "customer-event");
  assert.equal(state.notifications[0].kind, "modifica");
  assert.equal(state.notifications[0].status, "inviata");
});

test("due richieste concorrenti per lo stesso evento non raddoppiano l'email", async (context) => {
  const state = scenario(context);
  await Promise.all([sendStaffBookingManagementEmail(state.client, "customer-event"), sendStaffBookingManagementEmail(state.client, "customer-event")]);
  assert.equal(state.requests.length, 1);
  assert.equal(state.notifications.length, 1);
  assert.equal(await sendStaffBookingManagementEmail(state.client, "customer-event"), "inviata");
  assert.equal(state.requests.length, 1);
});

test("la cancellazione avvisa lo staff che il tavolo è libero", async (context) => {
  const state = scenario(context, { kind: "annullamento" });
  assert.equal(await sendStaffBookingManagementEmail(state.client, "customer-event"), "inviata");
  assert.equal(state.notifications[0].kind, "annullamento");
  assert.match(state.requests[0].text, /tavolo è stato liberato/);
  assert.match(state.requests[0].text, /Stato: ANNULLATA/);
  assert.deepEqual(state.requests[0].to, [primary, gmail]);
});

test("l'aggiornamento note conserva prima e dopo senza richiedere riconferma", async (context) => {
  const state = scenario(context, { kind: "note" });
  assert.equal(await sendStaffBookingManagementEmail(state.client, "customer-event"), "inviata");
  assert.equal(state.notifications[0].kind, "note");
  assert.match(state.requests[0].text, /Note precedenti: Seggiolone/);
  assert.match(state.requests[0].text, /Note aggiornate: Allergia alla frutta a guscio/);
  assert.match(state.requests[0].text, /Non serve una nuova conferma/);
});

test("la configurazione mancante conserva un tentativo fallito leggibile senza invio", async (context) => {
  const state = scenario(context, { configured: false });
  assert.equal(await sendStaffBookingManagementEmail(state.client, "customer-event"), "non_configurata");
  assert.equal(state.requests.length, 0);
  assert.equal(state.notifications.length, 1);
  assert.equal(state.notifications[0].status, "fallita");
  assert.match(state.notifications[0].body, /Invio email non configurato/);
});

for (const provider of ["reject", "throw"]) test(`l'errore provider ${provider} resta nel registro senza duplicare il tentativo`, async (context) => {
  const state = scenario(context, { provider });
  assert.equal(await sendStaffBookingManagementEmail(state.client, "customer-event"), "fallita");
  assert.equal(state.notifications[0].status, "fallita");
  assert.equal(await sendStaffBookingManagementEmail(state.client, "customer-event"), "fallita");
  assert.equal(state.requests.length, 1);
});

test("un evento assente non produce un avviso inventato", async (context) => {
  const state = scenario(context, { missingEvent: true });
  assert.equal(await sendStaffBookingManagementEmail(state.client, "missing-event"), "fallita");
  assert.equal(state.requests.length, 0);
  assert.equal(state.notifications.length, 0);
});

test("anche i modelli conferma salvati ricevono link gestione e tutela del codice", async (context) => {
  const state = scenario(context, { customTemplate: "Confermata, {nome}. Codice {codice}." });
  assert.equal(await sendBookingConfirmationEmail(state.client, { ...original, table_name: "T1" }, "cliente@example.com"), "inviata");
  assert.deepEqual(state.requests[0].to, ["cliente@example.com"]);
  assert.match(state.requests[0].text, /Confermata, Giulia Bianchi\. Codice OLD123/);
  assert.ok(state.requests[0].text.includes(BOOKING_MANAGEMENT_URL));
  assert.match(state.requests[0].text, /Custodisci il codice/);
  assert.doesNotMatch(state.requests[0].text, /gestisci\?/);
  assert.equal(withBookingManagementDetails(state.requests[0].text), state.requests[0].text);
});

test("i modelli lunghi non tagliano le istruzioni obbligatorie di gestione", async (context) => {
  const state = scenario(context, { customTemplate: "A".repeat(5000) });
  assert.equal(await sendBookingConfirmationEmail(state.client, { ...original, table_name: "T1" }, "cliente@example.com"), "inviata");
  assert.ok(state.requests[0].text.includes(BOOKING_MANAGEMENT_URL));
  assert.match(state.requests[0].text, /Custodisci il codice/);
  assert.match(state.requests[0].text, /Codice prenotazione: OLD123/);
});

test("le conferme delle prenotazioni staff invitano al contatto diretto", async (context) => {
  const state = scenario(context);
  assert.equal(await sendBookingConfirmationEmail(state.client, { ...original, table_name: "T1" }, "cliente@example.com", false), "inviata");
  assert.doesNotMatch(state.requests[0].text, /\/prenota\/gestisci|Custodisci il codice|inserisci il codice su/);
  assert.match(state.requests[0].text, /Per modificare o cancellare contatta il ristorante/);
  assert.match(state.requests[0].text, /Codice prenotazione: OLD123/);
});

test("i modelli staff salvati conservano testo e codice senza istruzioni di gestione online", async (context) => {
  const state = scenario(context, { customTemplate: "Ciao {nome}, la tua prenotazione è confermata." });
  assert.equal(await sendBookingConfirmationEmail(state.client, { ...original, table_name: "T1" }, "cliente@example.com", false), "inviata");
  assert.match(state.requests[0].text, /Ciao Giulia Bianchi, la tua prenotazione è confermata/);
  assert.match(state.requests[0].text, /Codice prenotazione: OLD123/);
  assert.doesNotMatch(state.requests[0].text, /\/prenota\/gestisci|Custodisci il codice/);
});
