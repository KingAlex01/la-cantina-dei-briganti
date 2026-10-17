// Verifica PostgreSQL isolata in memoria. Non legge .env e non accede al remoto.
// Richiede PGlite disponibile come modulo locale oppure PGLITE_MODULE_PATH
// impostato sul percorso assoluto del suo dist/index.js; nessuna dipendenza app.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const modulePath = process.env.PGLITE_MODULE_PATH;
const { PGlite } = await import(modulePath ? pathToFileURL(modulePath).href : "@electric-sql/pglite");
const db = new PGlite();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let checks = 0;
async function check(name, fn) {
  await fn();
  checks += 1;
  console.log(`OK ${checks}: ${name}`);
}
async function one(sql, parameters = []) {
  const result = await db.query(sql, parameters);
  return result.rows[0];
}
async function lookup(code) {
  return (await one("select public.lookup_public_reservation($1) as booking", [code])).booking;
}
async function manage(booking, action, fields = {}) {
  return (await one(`select public.manage_public_reservation(
    $1,$2::uuid,$3,$4::date,$5,$6::time,$7::smallint,$8,$9::boolean) as result`,
  [booking.code, booking.version, action, fields.date ?? null, fields.service ?? null,
    fields.arrival_time ?? null, fields.party_size ?? null, fields.notes ?? null,
    fields.notes_consent ?? false])).result;
}
async function create(date, service = "pranzo", notes = "") {
  const result = (await one(`select public.create_public_reservation_with_notes_consent(
    $1::date,$2,$3::time,2::smallint,'Mario Test','3331234567','mario@example.test',$4,false,true) as result`,
  [date, service, service === "pranzo" ? "13:00" : "20:00", notes])).result;
  return lookup(result.code);
}
async function rejects(operation, code, fragment) {
  await assert.rejects(operation, (error) => {
    assert.equal(error.code, code);
    if (fragment) assert.ok(error.message.includes(fragment), error.message);
    return true;
  });
}

try {
  // Il solo adattamento rispetto a Supabase è lo stub auth e del scheduler
  // pg_cron, non disponibile in WASM. Tutte le migrazioni SQL vengono eseguite.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;
    create function auth.role() returns text language sql stable as
      $$ select current_setting('request.jwt.claims',true)::jsonb->>'role' $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;
    create schema cron;
    create function cron.schedule(text,text,text) returns bigint language sql as $$ select 1::bigint $$;
    create publication supabase_realtime;
  `);
  const migrations = (await readdir(path.join(root, "supabase/migrations"))).filter((name) => name.endsWith(".sql")).sort();
  for (const migration of migrations) {
    const sql = (await readFile(path.join(root, "supabase/migrations", migration), "utf8"))
      .replace(/create extension if not exists pg_cron with schema pg_catalog;/i, "");
    try { await db.exec(sql); } catch (error) { throw new Error(`Migration ${migration}: ${error.message}`, { cause: error }); }
  }
  console.log(`${migrations.length} migrazioni applicate al database isolato.`);
  const dates = await one(`select min(d)::text as date, (min(d)+1)::text as next_date
    from (select (now() at time zone 'Europe/Rome')::date+n as d from generate_series(1,7) n) dates
    where extract(isodow from d)=2`);
  await db.exec("update public.tables set archived_at=now()");
  await db.exec(`insert into public.tables(name,capacity,shape,pos_x,pos_y) values ('Verifica cliente',8,'square',50,50)`);

  await check("RPC SECURITY INVOKER, esecuzione riservata a service_role", async () => {
    const result = await db.query(`select proname,prosecdef,
      has_function_privilege('anon',p.oid,'EXECUTE') as anon,
      has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated,
      has_function_privilege('service_role',p.oid,'EXECUTE') as server
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and proname in ('lookup_public_reservation','manage_public_reservation','consume_public_management_attempt')`);
    assert.equal(result.rows.length, 3);
    for (const row of result.rows) assert.deepEqual([row.prosecdef,row.anon,row.authenticated,row.server],[false,false,false,true]);
  });
  await db.exec("set role service_role");
  let booking = await create(dates.date, "pranzo", "Seggiolone");
  await check("nuovi codici di 16 cifre hex e payload privo di contatti/tavolo/id", async () => {
    assert.match(booking.code, /^[A-F0-9]{16}$/);
    assert.deepEqual(Object.keys(booking).sort(), ["code","name","date","service","arrival_time","party_size","status","notes","version"].sort());
    assert.deepEqual(await lookup(booking.code.toLowerCase().match(/.{4}/g).join(" - ")), booking);
    assert.equal(await lookup("ZZZZZZ"), null);
  });
  await check("codici storici di sei caratteri continuano a funzionare", async () => {
    await db.query("update public.reservations set code='ABC123' where code=$1", [booking.code]);
    booking = await lookup("abc-123");
    assert.equal(booking.code, "ABC123");
  });
  await check("consenso richiesto per nuove note e nessun evento dopo errore", async () => {
    await rejects(() => manage(booking,"notes",{notes:"Allergia"}), "22023", "Consenso");
    assert.deepEqual(await lookup(booking.code), booking);
    assert.equal((await one("select count(*)::integer as count from public.reservation_customer_events")).count, 0);
  });
  await check("note mantengono la conferma e registrano evento/versione/consenso", async () => {
    await db.query("update public.reservations set status='confermata',approved_at=now() where code=$1", [booking.code]);
    const stale = booking;
    booking = await lookup(booking.code);
    assert.notEqual(booking.version, stale.version);
    await rejects(() => manage(stale,"cancel"), "40001", "cambiata");
    const result = await manage(booking,"notes",{notes:"Allergia",notes_consent:true});
    assert.equal(result.booking.status, "confermata");
    assert.notEqual(result.booking.version, booking.version);
    const event = await one("select * from public.reservation_customer_events where id=$1", [result.event_id]);
    assert.equal(event.kind, "note");
    assert.equal(event.snapshot.before.notes,"Seggiolone");
    assert.equal(event.snapshot.after.notes,"Allergia");
    assert.equal(event.snapshot.after.phone,"3331234567");
    assert.ok(event.snapshot.after.notes_consent_at);
    booking = result.booking;
  });
  await check("note identiche senza nuovo consenso sono idempotenti", async () => {
    const result = await manage(booking,"notes",{notes:booking.notes});
    assert.equal(result.event_id, null);
    assert.deepEqual(result.booking, booking);
  });
  await check("nessun cambio di dettagli richiede nuova approvazione", async () => {
    await rejects(() => manage(booking,"replace",booking), "22023", "Nessuna modifica");
    assert.deepEqual(await lookup(booking.code), booking);
  });
  await check("sostituzione atomica riusa l'ultimo tavolo e richiede approvazione", async () => {
    const previous = booking;
    const result = await manage(booking,"replace",{...booking,arrival_time:"13:30"});
    assert.equal(result.previous_code,previous.code);
    assert.equal(result.booking.status,"in_attesa");
    assert.equal(result.booking.notes,"Allergia");
    assert.match(result.booking.code,/^[A-F0-9]{16}$/);
    const row = await one("select * from public.reservations where code=$1",[result.booking.code]);
    const old = await one("select * from public.reservations where code=$1",[previous.code]);
    assert.equal(old.status,"annullata");
    assert.equal(old.cancellation_reason,"modifica_cliente");
    assert.equal(old.replaced_by_id,row.id);
    assert.equal(row.replaces_id,old.id);
    assert.equal(row.approved_at,null);
    assert.equal(row.phone,old.phone);
    assert.equal(row.email,old.email);
    assert.deepEqual(row.notes_consent_at,old.notes_consent_at);
    assert.equal(row.table_id,old.table_id);
    const event = await one("select * from public.reservation_customer_events where id=$1",[result.event_id]);
    assert.equal(event.reservation_id,row.id);
    assert.equal(event.previous_reservation_id,old.id);
    assert.equal(event.kind,"modifica");
    assert.deepEqual(await lookup(previous.code),result.booking);
    await rejects(() => manage(previous,"cancel"),"40001","cambiata");
    booking = result.booking;
  });
  await check("destinazione occupata conserva prenotazione/versione/eventi originali", async () => {
    const occupied = await create(dates.next_date);
    const before = await one("select count(*)::integer as count from public.reservation_customer_events");
    await rejects(() => manage(booking,"replace",{...booking,date:dates.next_date}),"P0001","Nessun tavolo");
    assert.deepEqual(await lookup(booking.code),booking);
    assert.equal((await one("select count(*)::integer as count from public.reservation_customer_events")).count,before.count);
    await manage(occupied,"cancel");
  });
  await check("vecchi codici recuperano la più recente sostituzione dopo risposte perse", async () => {
    const oldestCode = "ABC123";
    const middleCode = booking.code;
    const result = await manage(booking,"replace",{...booking,arrival_time:"14:00"});
    assert.deepEqual(await lookup(oldestCode),result.booking);
    assert.deepEqual(await lookup(middleCode),result.booking);
    const middle = await one("select code,management_version as version from public.reservations where code=$1",[middleCode]);
    await rejects(() => manage(middle,"cancel"),"22023","non è più modificabile");
    booking = result.booking;
  });
  await check("servizio sospeso o orario non valido effettuano rollback completo", async () => {
    await db.exec("reset role");
    await db.query("insert into public.booking_blocks(date,service) values($1,'cena')",[dates.date]);
    await db.exec("set role service_role");
    await rejects(() => manage(booking,"replace",{...booking,service:"cena",arrival_time:"20:00"}),"P0001","sospese");
    assert.deepEqual(await lookup(booking.code),booking);
    await rejects(() => manage(booking,"replace",{...booking,arrival_time:"11:00"}),"P0001","orario");
    assert.deepEqual(await lookup(booking.code),booking);
  });
  await check("cancellazione persistente, evento e successiva sola lettura", async () => {
    const result = await manage(booking,"cancel");
    assert.equal(result.booking.status,"annullata");
    assert.equal((await one("select cancellation_reason from public.reservations where code=$1",[booking.code])).cancellation_reason,"cliente");
    assert.equal((await one("select kind from public.reservation_customer_events where id=$1",[result.event_id])).kind,"annullamento");
    assert.deepEqual(await lookup(booking.code),result.booking);
    await rejects(() => manage(result.booking,"notes",{notes:"",notes_consent:false}),"22023","non è più modificabile");
    booking = result.booking;
  });
  await check("database impedisce il ripristino di cancellazioni cliente e sostituzioni", async () => {
    await rejects(() => db.query("update public.reservations set status='in_attesa' where code=$1",[booking.code]),"P0001","non può essere ripristinata");
    await rejects(() => db.query("update public.reservations set status='in_attesa',cancellation_reason=null where code='ABC123'"),"P0001","non può essere ripristinata");
  });
  await check("rimozione delle note cancella il consenso ma conserva stato", async () => {
    let other = await create(dates.date,"pranzo","Seggiolone");
    const result = await manage(other,"notes",{notes:""});
    assert.equal(result.booking.notes,"");
    assert.equal(result.booking.status,other.status);
    assert.equal((await one("select notes_consent_at from public.reservations where code=$1",[other.code])).notes_consent_at,null);
    await manage(result.booking,"cancel");
  });
  await check("note storiche invariate sono copiate senza inventare consenso", async () => {
    let legacy = await create(dates.date);
    const originalNotes = "  Nota storica raccolta prima del consenso  ";
    await db.query("update public.reservations set notes=$1,notes_consent_at=null where code=$2",[originalNotes,legacy.code]);
    legacy = await lookup(legacy.code);
    await rejects(() => manage(legacy,"replace",{...legacy,arrival_time:"13:30",notes:"Nuova allergia"}),"22023","Consenso");
    const result = await manage(legacy,"replace",{...legacy,arrival_time:"13:30",notes:undefined});
    assert.equal(result.booking.notes,originalNotes);
    assert.equal((await one("select notes_consent_at from public.reservations where code=$1",[result.booking.code])).notes_consent_at,null);
    assert.equal(result.booking.status,"in_attesa");
    await manage(result.booking,"cancel");
  });
  await check("prenotazioni staff nascoste e non gestibili", async () => {
    const row = await one(`insert into public.reservations(date,service,arrival_time,party_size,name,table_id,status,source)
      select $1::date,'pranzo','13:00',2,'Test Staff',id,'confermata','staff'
      from public.tables where name='Verifica cliente' returning *`,[dates.date]);
    assert.equal(await lookup(row.code),null);
    await rejects(() => manage({code:row.code,version:row.management_version},"cancel"),"P0002","non trovata");
  });
  await check("arrivo trascorso impedisce modifiche anche in stato attivo", async () => {
    await db.exec("reset role");
    const row = await one(`insert into public.reservations(date,service,arrival_time,party_size,name,phone,table_id,status,source)
      select $1::date-7,'pranzo','13:00',2,'Test Passato','3337654321',id,'in_attesa','online'
      from public.tables where name='Verifica cliente' returning code,management_version as version`,[dates.date]);
    await db.exec("set role service_role");
    assert.equal(await lookup(row.code),null);
    await rejects(() => manage(row,"cancel"),"22023","trascorso");
  });
  await check("rate limit mobile condiviso: cinque ammissioni poi blocco", async () => {
    const key = "a".repeat(64);
    for (let i=0;i<5;i++) assert.equal((await one("select public.consume_public_management_attempt($1) as result",[key])).result.allowed,true);
    const blocked = (await one("select public.consume_public_management_attempt($1) as result",[key])).result;
    assert.equal(blocked.allowed,false);
    assert.ok(blocked.retry_after >= 1 && blocked.retry_after <= 60);
    assert.equal((await one("select cardinality(attempts) as count from private.public_management_attempts where key=$1",[key])).count,5);
  });
  await check("limite ora, finestre scadute, pulizia e chiavi invalide", async () => {
    const key = "b".repeat(64);
    await db.query(`insert into private.public_management_attempts(key,attempts,expires_at)
      select $1,array_agg(clock_timestamp()-interval '2 minutes'-n*interval '1 minute'),clock_timestamp()+interval '1 hour'
      from generate_series(1,20) n`,[key]);
    const blocked = (await one("select public.consume_public_management_attempt($1) as result",[key])).result;
    assert.equal(blocked.allowed,false);
    assert.ok(blocked.retry_after > 60);
    await db.query("update private.public_management_attempts set expires_at=clock_timestamp()-interval '1 second' where key=$1",[key]);
    assert.equal((await one("select public.consume_public_management_attempt($1) as result",[key])).result.allowed,true);
    await rejects(() => one("select public.consume_public_management_attempt('raw-ip')"),"22023","Chiave");
  });
  await check("registro persistente RLS: staff legge, estranei non leggono", async () => {
    await db.exec("reset role");
    await db.exec("set role anon");
    await rejects(() => db.query("select * from public.reservation_customer_events"),"42501");
    await rejects(() => lookup(booking.code),"42501");
    await db.exec("reset role");
    await db.exec("set role authenticated");
    assert.equal((await one("select count(*)::integer as count from public.reservation_customer_events")).count,0);
    await rejects(() => db.query("select * from private.public_management_attempts"),"42501");
    await db.exec("reset role");
    const staff = await one("insert into auth.users(id) values(gen_random_uuid()) returning id");
    await db.query("insert into public.staff_users(user_id) values($1)",[staff.id]);
    await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:staff.id,role:"authenticated"})]);
    await db.exec("set role authenticated");
    assert.ok((await one("select count(*)::integer as count from public.reservation_customer_events")).count>0);
    await rejects(() => db.query("delete from public.reservation_customer_events"),"42501");
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:"service_role"})]);
  });
  await check("un solo tentativo email per evento e cancellazione storico in cascata", async () => {
    const event = await one("select * from public.reservation_customer_events where kind='modifica' limit 1");
    const values = [event.reservation_id,event.id];
    const sql = `insert into public.notifications(reservation_id,customer_event_id,channel,kind,recipient,body,status)
      values($1,$2,'email','modifica','staff@example.test','Test','in_attesa')`;
    await db.query(sql,values);
    await rejects(() => db.query(sql,values),"23505");
    await db.query("delete from public.notifications where customer_event_id=$1",[event.id]);
    await db.query("delete from public.reservations where id=$1",[event.reservation_id]);
    assert.equal((await one("select count(*)::integer as count from public.reservation_customer_events where id=$1",[event.id])).count,0);
  });
  console.log(`${checks} gruppi di verifiche PostgreSQL completati. Nessun dato remoto o email.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.close();
}
