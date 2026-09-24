import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.PHASE2_TEST_URL;
const secret = process.env.PHASE2_TEST_SECRET;
const publishable = process.env.PHASE2_TEST_PUBLIC;
if (!url || !secret || !publishable) throw new Error("Variabili di test mancanti");

const authOptions = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(url, secret, authOptions);
const guest = createClient(url, publishable, authOptions);
const email = `codex-check-${Date.now()}@example.com`;
const password = randomBytes(24).toString("hex");
let userId;
let reservationId;
let customerId;
let testTableId;
let failure;
let staffClient;
let realtimeChannel;

function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  })]).finally(() => clearTimeout(timer));
}

try {
  const anonymous = await guest.from("tables").select("id");
  if (anonymous.error && anonymous.error.code !== "42501") throw anonymous.error;
  if (!anonymous.error && anonymous.data.length !== 0) throw new Error("Il pubblico legge i tavoli");
  console.log("Accesso pubblico ai tavoli: negato.");

  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("Utente di test non creato");
  userId = created.data.user.id;
  const grant = await admin.from("staff_users").insert({ user_id: userId });
  if (grant.error) throw grant.error;

  const staff = createClient(url, publishable, authOptions);
  staffClient = staff;
  const login = await staff.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  staff.realtime.setAuth(login.data.session.access_token);
  const access = await staff.rpc("is_staff_user");
  if (access.error || access.data !== true) throw access.error ?? new Error("Ruolo staff non riconosciuto");
  const tables = await staff.from("tables").select("id,name,capacity").is("archived_at", null);
  if (tables.error || tables.data.length < 10) throw tables.error ?? new Error("Tavoli staff non leggibili");
  console.log("Login staff e lettura sala: riusciti.");

  testTableId = randomUUID();
  let eventReceived;
  const realtimeEvent = new Promise((resolve) => { eventReceived = resolve; });
  const channel = staff.channel(`phase2-check-${testTableId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "tables" },
      (payload) => { if (payload.new.id === testTableId) eventReceived(); });
  realtimeChannel = channel;
  const subscribed = new Promise((resolve, reject) => channel.subscribe((status) => {
    if (status === "SUBSCRIBED") resolve();
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(`Realtime: ${status}`));
  }));
  await withTimeout(subscribed, 12000, "Connessione Realtime non riuscita");
  const newTable = { id: testTableId, name: `TEST-${Date.now()}`, capacity: 2,
    area: "Sala", shape: "round", pos_x: 50, pos_y: 50 };
  const floorAdded = await staff.rpc("save_staff_floor", { p_tables: [newTable], p_known_ids: [] });
  if (floorAdded.error) throw floorAdded.error;
  await withTimeout(realtimeEvent, 12000, "Aggiornamento Realtime non ricevuto");
  await staff.removeChannel(channel);
  realtimeChannel = undefined;
  console.log("Aggiornamento Realtime tavoli: ricevuto.");
  const floorArchived = await staff.rpc("save_staff_floor", { p_tables: [], p_known_ids: [testTableId] });
  if (floorArchived.error) throw floorArchived.error;
  const archived = await staff.from("tables").select("archived_at").eq("id", testTableId).single();
  if (archived.error || !archived.data.archived_at) throw archived.error ?? new Error("Archiviazione tavolo fallita");
  console.log("Aggiunta e archiviazione tavolo: riuscite.");

  const table = tables.data.find((item) => item.name === "T1");
  if (!table) throw new Error("T1 mancante");
  const booking = {
    p_date: "2099-01-05", p_service: "cena", p_arrival_time: "19:00",
    p_party_size: 2, p_name: "Verifica automatica", p_table_id: table.id,
    p_phone: `888${String(Date.now()).slice(-9)}`,
  };
  const first = await staff.rpc("create_staff_reservation", booking);
  if (first.error || !first.data?.id) throw first.error ?? new Error("Prenotazione non creata");
  reservationId = first.data.id;
  customerId = first.data.customer_id;
  if (!customerId) throw new Error("Scheda cliente non creata");
  const duplicate = await staff.rpc("create_staff_reservation", booking);
  if (!duplicate.error) throw new Error("Doppia prenotazione accettata");
  console.log("Doppia prenotazione: rifiutata.");

  const cancelled = await staff.from("reservations").update({ status: "annullata" })
    .eq("id", reservationId).select("status").single();
  if (cancelled.error || cancelled.data.status !== "annullata") throw cancelled.error ?? new Error("Annullamento fallito");
  const restored = await staff.from("reservations").update({ status: "confermata" })
    .eq("id", reservationId).select("status").single();
  if (restored.error || restored.data.status !== "confermata") throw restored.error ?? new Error("Ripristino fallito");
  console.log("Annullamento e ripristino: riusciti.");
  const arrived = await staff.from("reservations").update({ status: "arrivato" })
    .eq("id", reservationId).select("status").single();
  if (arrived.error || arrived.data.status !== "arrivato") throw arrived.error ?? new Error("Arrivo fallito");
  const stats = await staff.from("customer_stats").select("visits,covers").eq("customer_id", customerId).single();
  if (stats.error || stats.data.visits !== 1 || stats.data.covers !== 2) throw stats.error ?? new Error("Statistiche cliente errate");
  console.log("Scheda cliente e statistiche: riuscite.");
  await staff.auth.signOut();
} catch (error) {
  failure = error;
} finally {
  const cleanupErrors = [];
  if (staffClient && realtimeChannel) await staffClient.removeChannel(realtimeChannel);
  staffClient?.realtime.disconnect();
  if (reservationId) {
    const result = await admin.from("reservations").delete().eq("id", reservationId);
    if (result.error) cleanupErrors.push(result.error.message);
  }
  if (customerId) {
    const result = await admin.from("customers").delete().eq("id", customerId);
    if (result.error) cleanupErrors.push(result.error.message);
  }
  if (testTableId) {
    const result = await admin.from("tables").delete().eq("id", testTableId);
    if (result.error) cleanupErrors.push(result.error.message);
  }
  if (userId) {
    const role = await admin.from("staff_users").delete().eq("user_id", userId);
    if (role.error) cleanupErrors.push(role.error.message);
    const user = await admin.auth.admin.deleteUser(userId);
    if (user.error) cleanupErrors.push(user.error.message);
  }
  if (cleanupErrors.length) {
    console.error("Pulizia incompleta:", cleanupErrors.join("; "));
    process.exitCode = 1;
  } else console.log("Dati di prova rimossi.");
}

if (failure) {
  console.error("Verifica fase 2 fallita:", failure.message);
  process.exitCode = 1;
}
