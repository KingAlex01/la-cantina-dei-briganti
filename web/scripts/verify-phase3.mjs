import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const appUrl = process.env.PHASE3_TEST_APP ?? "http://localhost:3000";
const url = process.env.PHASE3_TEST_URL;
const secret = process.env.PHASE3_TEST_SECRET;
const publishable = process.env.PHASE3_TEST_PUBLIC;
if (!url || !secret || !publishable) throw new Error("Variabili di test mancanti");

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const guest = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
const phone = `888${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`;
let reservationId;
let customerId;
let failure;
let attemptedBooking = false;
let stage = "avvio";

async function availability(date, party) {
  const response = await fetch(`${appUrl}/api/public/availability?date=${date}&party=${party}`);
  const data = await response.json();
  if (!response.ok) throw new Error(`Disponibilità: ${data.error}`);
  return data;
}

try {
  stage = "controllo accesso anonimo";
  const direct = await guest.rpc("public_available_services", { p_date: "2099-01-05", p_party_size: 8 });
  if (!direct.error) throw new Error("La funzione è accessibile direttamente al visitatore");
  console.log("Accesso diretto anonimo al database: negato.");

  stage = "validazione data";
  const invalid = await fetch(`${appUrl}/api/public/availability?date=2099-01-05&party=8`);
  if (invalid.status !== 400) throw new Error("La data fuori limite è stata accettata");
  console.log("Validazione data: riuscita.");

  const today = new Date();
  let date;
  stage = "ricerca data libera";
  for (let offset = 1; offset <= 60; offset++) {
    const candidate = new Date(today);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const candidateDate = candidate.toISOString().slice(0, 10);
    const state = await availability(candidateDate, 8);
    if (state.cena) { date = candidateDate; break; }
  }
  if (!date) throw new Error("Nessuna data di prova libera per 8 persone");

  const input = {
    date, service: "cena", time: "19:00", party: 8,
    name: "Verifica Automatica", phone, email: "", notes: "Test fase 3", reminder: false,
  };
  stage = "creazione prenotazione";
  attemptedBooking = true;
  const first = await fetch(`${appUrl}/api/public/reservations`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
  const confirmed = await first.json();
  if (first.status !== 201 || !confirmed.code || !confirmed.table_name) {
    throw new Error(`Prenotazione pubblica non creata: ${confirmed.error ?? first.status}`);
  }
  const stored = await admin.from("reservations").select("id,customer_id,status,source,table_id")
    .eq("code", confirmed.code).single();
  if (stored.error || stored.data.status !== "confermata" || stored.data.source !== "online") {
    throw stored.error ?? new Error("Prenotazione non salvata correttamente");
  }
  reservationId = stored.data.id;
  customerId = stored.data.customer_id;
  if (!customerId) throw new Error("Scheda cliente non creata");
  console.log("Prenotazione pubblica e scheda cliente: create.");

  stage = "controllo tavolo occupato";
  const full = await availability(date, 8);
  if (full.cena) throw new Error("Il servizio non risulta pieno dopo la prenotazione");
  const duplicate = await fetch(`${appUrl}/api/public/reservations`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
  if (duplicate.status !== 409) throw new Error("La seconda prenotazione per 8 persone non è stata rifiutata");
  console.log("Ultimo tavolo occupato: disponibilità aggiornata e seconda richiesta rifiutata.");
} catch (error) {
  failure = error;
} finally {
  const cleanupErrors = [];
  if (!reservationId && attemptedBooking) {
    const lookup = await admin.from("reservations").select("id,customer_id")
      .eq("phone", phone).eq("name", "Verifica Automatica");
    if (lookup.error) cleanupErrors.push(lookup.error.message);
    else if (lookup.data.length === 1) {
      reservationId = lookup.data[0].id;
      customerId = lookup.data[0].customer_id;
    }
  }
  if (reservationId) {
    const result = await admin.from("reservations").delete().eq("id", reservationId);
    if (result.error) cleanupErrors.push(result.error.message);
  }
  if (customerId) {
    const result = await admin.from("customers").delete().eq("id", customerId);
    if (result.error) cleanupErrors.push(result.error.message);
  }
  if (cleanupErrors.length) {
    console.error("Pulizia incompleta:", cleanupErrors.join("; "));
    process.exitCode = 1;
  } else console.log("Dati di prova rimossi.");
}

if (failure) {
  console.error(`Verifica fase 3 fallita (${stage}):`, failure.message);
  process.exitCode = 1;
}
