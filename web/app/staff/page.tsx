"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../../lib/supabase/client";
import {
  CUSTOMER_TAGS, SERVICE_TIMES, STATUS_LABEL, dateLabel, defaultServiceInRome, readableError,
  timeLabel, todayInRome,
} from "../../lib/staff/types";
import type {
  Customer, CustomerStats, DiningTable, Reservation, ReservationStatus, Service,
} from "../../lib/staff/types";
import styles from "./staff.module.css";

type Access = "loading" | "login" | "denied" | "granted";
type BookingSeed = { tableId?: string; customer?: Customer };
type FloorDraft = Pick<DiningTable, "id" | "name" | "capacity" | "area" | "shape" | "pos_x" | "pos_y">;

const field = styles.field;

export default function StaffPage() {
  const client = useMemo(() => createSupabaseClient(), []);
  const [access, setAccess] = useState<Access>("loading");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"sala" | "clienti">("sala");
  const [date, setDate] = useState(todayInRome);
  const [service, setService] = useState<Service>(defaultServiceInRome);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [recentOnline, setRecentOnline] = useState<Reservation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"plan" | "list">("plan");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FloorDraft[]>([]);
  const [knownIds, setKnownIds] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingSeed | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [customerFilter, setCustomerFilter] = useState<"all" | "regular" | "noshow">("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Reservation[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [notesDraft, setNotesDraft] = useState("");
  const dragId = useRef<string | null>(null);
  const loadSequence = useRef(0);
  const monday = new Date(`${date}T12:00:00Z`).getUTCDay() === 1;
  const customerId = selectedCustomer?.id;

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      const { data: userData } = await client.auth.getUser();
      if (!active) return;
      if (!userData.user) { setAccess("login"); return; }
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData.session) client.realtime.setAuth(sessionData.session.access_token);
      const { data, error: accessError } = await client.rpc("is_staff_user");
      if (!active) return;
      setAccess(!accessError && data === true ? "granted" : "denied");
    }
    void checkAccess();
    const { data: auth } = client.auth.onAuthStateChange(() => {
      window.setTimeout(() => { if (active) void checkAccess(); }, 0);
    });
    return () => { active = false; auth.subscription.unsubscribe(); };
  }, [client]);

  const loadData = useCallback(async (quiet = false) => {
    if (!client) return;
    const sequence = ++loadSequence.current;
    if (!quiet) setLoading(true);
    const [tableResult, reservationResult, customerResult, statsResult, onlineResult] = await Promise.all([
      client.from("tables").select("*").is("archived_at", null).order("name"),
      client.from("reservations").select("*").eq("date", date).eq("service", service).order("arrival_time"),
      fetchAllRows<Customer>(client, "customers"),
      fetchAllRows<CustomerStats>(client, "customer_stats"),
      client.from("reservations").select("*").eq("source", "online")
        .gte("date", todayInRome()).in("status", ["confermata", "arrivato"])
        .order("created_at", { ascending: false }).limit(3),
    ]);
    if (sequence !== loadSequence.current) return;
    const queryError = tableResult.error ?? reservationResult.error ?? customerResult.error ?? statsResult.error ?? onlineResult.error;
    if (queryError) setError(readableError(queryError.message));
    else {
      setTables((tableResult.data ?? []) as DiningTable[]);
      setReservations((reservationResult.data ?? []) as Reservation[]);
      setRecentOnline((onlineResult.data ?? []) as Reservation[]);
      setCustomers(customerResult.data);
      setStats(statsResult.data);
      setSelectedReservation((current) => current ? ((reservationResult.data ?? []) as Reservation[]).find((item) => item.id === current.id) ?? null : null);
      setSelectedCustomer((current) => current ? customerResult.data.find((item) => item.id === current.id) ?? null : null);
      setError("");
    }
    setLoading(false);
  }, [client, date, service]);

  useEffect(() => {
    if (access !== "granted") return;
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [access, loadData]);

  useEffect(() => {
    if (!client || access !== "granted") return;
    const channel = client.channel("staff-room")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => void loadData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => { setHistoryVersion((version) => version + 1); void loadData(true); })
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => void loadData(true))
      .subscribe((status) => setRealtimeReady(status === "SUBSCRIBED"));
    return () => { void client.removeChannel(channel); };
  }, [client, access, loadData]);

  useEffect(() => {
    if (!client || !customerId || access !== "granted") return;
    let active = true;
    void client.from("reservations").select("*")
      .eq("customer_id", customerId).order("date", { ascending: false })
      .range(0, historyCount + 19)
      .then(({ data, error: historyError }) => {
        if (!active) return;
        if (historyError) setError(historyError.message);
        else setCustomerHistory((data ?? []) as Reservation[]);
      });
    return () => { active = false; };
  }, [client, customerId, historyCount, historyVersion, access]);

  const occupied = useMemo(() => new Map(
    reservations.filter((r) => r.status === "confermata" || r.status === "arrivato")
      .map((r) => [r.table_id, r]),
  ), [reservations]);
  const activeReservations = useMemo(() => reservations.filter((r) => r.status === "confermata" || r.status === "arrivato"), [reservations]);
  const freeTables = tables.filter((table) => !occupied.has(table.id));
  const nextArrival = activeReservations.filter((r) => r.status === "confermata")
    .sort((a, b) => a.arrival_time.localeCompare(b.arrival_time))[0];
  const filteredReservations = reservations.filter((r) =>
    `${r.name} ${r.phone ?? ""} ${r.code}`.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const statsByCustomer = useMemo(() => new Map(stats.map((item) => [item.customer_id, item])), [stats]);
  const filteredCustomers = customers.filter((customer) => {
    const detail = statsByCustomer.get(customer.id);
    const matchesSearch = `${customer.name} ${customer.phone} ${customer.email ?? ""}`
      .toLowerCase().includes(customerSearch.toLowerCase().trim());
    return matchesSearch && (customerFilter === "all" ||
      (customerFilter === "regular" && (detail?.visits ?? 0) >= 2) ||
      (customerFilter === "noshow" && (detail?.no_shows ?? 0) > 0));
  });

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setBusy(true); setError("");
    const { error: authError } = await client.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (authError) setError("Email o password non corretti. Riprova.");
    setBusy(false);
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    setAccess("login");
    setTables([]); setReservations([]); setCustomers([]);
    setRecentOnline([]);
  }

  function beginEdit() {
    setDraft(tables.map(({ id, name, capacity, area, shape, pos_x, pos_y }) =>
      ({ id, name, capacity, area, shape, pos_x, pos_y })));
    setKnownIds(tables.map((table) => table.id));
    setSelectedTable(null); setEditing(true); setError("");
  }

  function patchDraft(id: string, patch: Partial<FloorDraft>) {
    setDraft((current) => current.map((table) => table.id === id ? { ...table, ...patch } : table));
  }

  function addTable() {
    const used = new Set([...tables, ...draft].map((table) => table.name.toLowerCase()));
    let n = 1;
    while (used.has(`t${n}`)) n++;
    const table: FloorDraft = {
      id: crypto.randomUUID(), name: `T${n}`, capacity: 2, area: "Sala",
      shape: "round", pos_x: 50, pos_y: 50,
    };
    setDraft((current) => [...current, table]);
    setSelectedTable(table.id);
  }

  async function saveFloor() {
    if (!client) return;
    const names = draft.map((table) => table.name.trim().toLowerCase());
    if (draft.some((table) => !table.name.trim() || !table.area.trim() || table.capacity < 1 || table.capacity > 20) ||
      new Set(names).size !== names.length) {
      setError("Controlla nomi unici, zone e posti da 1 a 20."); return;
    }
    setBusy(true); setError("");
    const { error: saveError } = await client.rpc("save_staff_floor", {
      p_tables: draft, p_known_ids: knownIds,
    });
    setBusy(false);
    if (saveError) { setError(readableError(saveError.message)); return; }
    setEditing(false); setSelectedTable(null); setNotice("Sala aggiornata.");
    await loadData(true);
  }

  function movePointer(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (!editing || dragId.current !== id) return;
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    patchDraft(id, {
      pos_x: Math.round(Math.max(6, Math.min(94, (event.clientX - rect.left) / rect.width * 100))),
      pos_y: Math.round(Math.max(9, Math.min(91, (event.clientY - rect.top) / rect.height * 100))),
    });
  }

  async function changeStatus(reservation: Reservation, status: ReservationStatus) {
    if (!client) return;
    setBusy(true); setError("");
    const { error: updateError } = await client.from("reservations").update({ status }).eq("id", reservation.id);
    setBusy(false);
    if (updateError) setError(readableError(updateError.message));
    else { setSelectedReservation(null); setNotice(`Prenotazione ${STATUS_LABEL[status].toLowerCase()}.`); await loadData(true); }
  }

  async function moveReservation(reservation: Reservation, tableId: string) {
    if (!client || !tableId || tableId === reservation.table_id) return;
    setBusy(true); setError("");
    const { error: moveError } = await client.from("reservations").update({ table_id: tableId }).eq("id", reservation.id);
    setBusy(false);
    if (moveError) setError(readableError(moveError.message));
    else { setSelectedReservation(null); setNotice("Tavolo cambiato."); await loadData(true); }
  }

  async function copyReminder(reservation: Reservation) {
    const firstName = reservation.name.trim().split(/\s+/)[0];
    const message = `Ciao ${firstName}, ti aspettiamo ${dateLabel(reservation.date)} alle ${timeLabel(reservation.arrival_time)} per ${reservation.party_size} ${reservation.party_size === 1 ? "persona" : "persone"}. Se non riesci a venire avvisaci. La cantina dei briganti`;
    try {
      await navigator.clipboard.writeText(message);
      setNotice("Testo del promemoria copiato. Nessun SMS è stato inviato.");
    } catch {
      setError("Non sono riuscito a copiare il testo del promemoria.");
    }
  }

  function whatsappConfirmationUrl(reservation: Reservation) {
    const digits = (reservation.phone ?? "").replace(/\D/g, "").replace(/^00/, "");
    const number = /^3\d{9}$/.test(digits) ? `39${digits}` : /^393\d{9}$/.test(digits) ? digits : "";
    if (!number) return null;
    const firstName = reservation.name.trim().split(/\s+/)[0];
    const people = `${reservation.party_size} ${reservation.party_size === 1 ? "persona" : "persone"}`;
    const message = `Ciao ${firstName}, la tua prenotazione da La cantina dei briganti è confermata per ${people} ${dateLabel(reservation.date)} alle ${timeLabel(reservation.arrival_time)}. Codice ${reservation.code}. Ti aspettiamo!`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  async function saveCustomer(patch: Partial<Pick<Customer, "notes" | "tags">>) {
    if (!client || !selectedCustomer) return;
    setBusy(true); setError("");
    const { data, error: customerError } = await client.from("customers").update(patch)
      .eq("id", selectedCustomer.id).select("*").single();
    setBusy(false);
    if (customerError) setError(customerError.message);
    else {
      setSelectedCustomer(data as Customer);
      setNotice("Scheda cliente aggiornata.");
      await loadData(true);
    }
  }

  if (access === "loading") return <div className={styles.authPage}><p>Caricamento area staff…</p></div>;

  if (access === "login" || access === "denied") return (
    <main className={styles.authPage}>
      <div className={styles.authCard}>
        <Link href="/" className={styles.backLink}>← Torna alla pagina iniziale</Link>
        <Image src="/logo-cantina.svg" alt="La cantina dei briganti" width={190} height={141} className={styles.authLogo} />
        <span className={styles.kicker}>Area riservata</span>
        <h1>Benvenuti in sala.</h1>
        {access === "denied" ? (
          <><p>Questo account non è ancora abilitato per lo staff. Chiedi al titolare di aggiungerlo.</p>
            <button className={styles.secondaryButton} onClick={signOut}>Esci e usa un altro account</button></>
        ) : (
          <form onSubmit={signIn} className={styles.authForm}>
            <label className={field}>Email<input type="email" required autoComplete="username" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} /></label>
            <label className={field}>Password<input type="password" required autoComplete="current-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /></label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button className={styles.primaryButton} disabled={busy} type="submit">{busy ? "Accesso in corso…" : "Accedi all’area staff"}</button>
          </form>
        )}
      </div>
    </main>
  );

  const selectedDraft = draft.find((table) => table.id === selectedTable);
  const selectedCustomerStats = selectedCustomer ? statsByCustomer.get(selectedCustomer.id) : undefined;

  return (
    <main className={styles.app}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>La cantina dei briganti <span>· Staff</span></Link>
        <div className={styles.topActions}><span className={`${styles.liveDot} ${realtimeReady ? "" : styles.liveOffline}`} title={realtimeReady ? "Aggiornamenti in tempo reale attivi" : "Connessione in corso"} /> <span className={styles.liveLabel}>{realtimeReady ? "Sala in tempo reale" : "Connessione…"}</span><button onClick={signOut} className={styles.textButton}>Esci</button></div>
      </header>
      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="Area staff">
          <button className={tab === "sala" ? styles.activeNav : ""} onClick={() => setTab("sala")}>Sala e prenotazioni</button>
          <button className={tab === "clienti" ? styles.activeNav : ""} onClick={() => setTab("clienti")}>Clienti</button>
        </nav>
        {error && <div className={styles.errorBanner} role="alert">{error}<button onClick={() => setError("")} aria-label="Chiudi errore">×</button></div>}
        {notice && <div className={styles.noticeBanner} role="status">{notice}<button onClick={() => setNotice("")} aria-label="Chiudi avviso">×</button></div>}

        {tab === "sala" ? <>
          <div className={styles.pageHead}>
            <div><span className={styles.kicker}>Gestione del servizio</span><h1>Sala</h1><p>{dateLabel(date)}</p></div>
            <div className={styles.controls}>
              <label className={styles.srOnly} htmlFor="staff-date">Data del servizio</label>
              <input id="staff-date" type="date" value={date} onChange={(e) => { if (!e.target.value) return; setDate(e.target.value); if (new Date(`${e.target.value}T12:00:00Z`).getUTCDay() === 1) setService("cena"); }} />
              <div className={styles.segmented} aria-label="Servizio">
                {(["pranzo", "cena"] as Service[]).map((item) => <button key={item} disabled={item === "pranzo" && monday} title={item === "pranzo" && monday ? "Il pranzo del lunedì è chiuso" : undefined} className={service === item ? styles.selected : ""} onClick={() => setService(item)}>{item === "pranzo" ? "Pranzo" : "Cena"}</button>)}
              </div>
              <button className={styles.primaryButton} onClick={() => setBooking({})}>+ Nuova prenotazione</button>
            </div>
          </div>

          {recentOnline.length > 0 && <section className={styles.onlinePanel} aria-label="Prenotazioni online recenti">
            <div className={styles.onlinePanelHead}><strong>Prenotazioni online recenti</strong><span>Seleziona una prenotazione per vedere il suo servizio in Sala.</span></div>
            <div className={styles.onlineItems}>{recentOnline.map((item) => <button key={item.id} type="button"
              className={date === item.date && service === item.service ? styles.onlineCurrent : ""}
              onClick={() => { setDate(item.date); setService(item.service); setSearch(""); setTab("sala"); }}>
              <strong>{item.name}</strong><span>{dateLabel(item.date)} · {item.service} {timeLabel(item.arrival_time)} · {item.party_size} {item.party_size === 1 ? "persona" : "persone"}</span>
              <span className={styles.onlineAction}>{date === item.date && service === item.service ? "Servizio mostrato" : "Apri servizio →"}</span>
            </button>)}</div>
          </section>}

          <p className={styles.serviceContext}>I dati qui sotto riguardano {service === "pranzo" ? "il pranzo" : "la cena"} di {dateLabel(date)}.</p>

          <div className={styles.statGrid}>
            <Stat label="Coperti" value={activeReservations.reduce((sum, r) => sum + r.party_size, 0)} />
            <Stat label="Prenotazioni" value={activeReservations.length} />
            <Stat label="Tavoli liberi" value={freeTables.length} />
            <Stat label="Prossimo arrivo" value={nextArrival ? `${timeLabel(nextArrival.arrival_time)} · ${nextArrival.name}` : "—"} small />
          </div>

          <div className={styles.mainGrid}>
            <section className={styles.panel} aria-labelledby="tables-title">
              <div className={styles.panelHead}>
                <h2 id="tables-title">Tavoli <span>{tables.length}</span></h2>
                <div className={styles.panelActions}>
                  <div className={styles.segmented} aria-label="Vista tavoli">
                    <button className={view === "plan" ? styles.selected : ""} onClick={() => setView("plan")}>Planimetria</button>
                    <button className={view === "list" ? styles.selected : ""} onClick={() => setView("list")}>Lista</button>
                  </div>
                  {!editing && <button className={styles.secondaryButton} onClick={beginEdit}>Modifica sala</button>}
                </div>
              </div>
              {editing && <div className={styles.editBar}><span>Modifiche in bozza. Trascina i tavoli o selezionali per modificarli.</span><div><button className={styles.secondaryButton} onClick={addTable}>+ Tavolo</button><button className={styles.textButton} onClick={() => { setEditing(false); setError(""); }}>Annulla</button><button className={styles.primaryButton} disabled={busy} onClick={saveFloor}>Salva sala</button></div></div>}

              {view === "plan" ? <div className={styles.floorScroll}><div className={`${styles.floor} ${editing ? styles.floorEditing : ""}`}>
                {(editing ? draft : tables).map((table) => {
                  const res = occupied.get(table.id);
                  const state = editing ? "editing" : !res ? "free" : res.status === "arrivato" ? "arrived" : "booked";
                  return <button key={table.id} type="button" className={`${styles.tableMarker} ${styles[table.shape]} ${styles[state]} ${selectedTable === table.id ? styles.chosen : ""}`}
                    style={{ left: `${table.pos_x}%`, top: `${table.pos_y}%` }}
                    onPointerDown={(e) => { if (editing) { dragId.current = table.id; e.currentTarget.setPointerCapture(e.pointerId); } }}
                    onPointerMove={(e) => movePointer(e, table.id)} onPointerUp={() => { dragId.current = null; }}
                    onPointerCancel={() => { dragId.current = null; }}
                    onClick={() => editing ? setSelectedTable(table.id) : res ? setSelectedReservation(res) : setBooking({ tableId: table.id })}
                    aria-label={`Tavolo ${table.name}, ${table.capacity} posti, ${state === "free" ? "libero" : state === "editing" ? "in modifica" : state === "arrived" ? "cliente arrivato" : "prenotato"}`}>
                    <strong>{table.name}</strong><small>{res && !editing ? timeLabel(res.arrival_time) : `${table.capacity} posti`}</small>
                  </button>;
                })}
              </div></div> : <div className={styles.tableList}>
                {(editing ? draft : tables).map((table) => {
                  const res = occupied.get(table.id);
                  return <div key={table.id} className={styles.tableRow}>
                    {editing ? <><input aria-label="Nome tavolo" value={table.name} onChange={(e) => patchDraft(table.id, { name: e.target.value })} /><input aria-label="Posti" type="number" min="1" max="20" value={table.capacity} onChange={(e) => patchDraft(table.id, { capacity: Number(e.target.value) })} /><input aria-label="Zona" value={table.area} onChange={(e) => patchDraft(table.id, { area: e.target.value })} /><select aria-label="Forma" value={table.shape} onChange={(e) => patchDraft(table.id, { shape: e.target.value as DiningTable["shape"] })}><option value="round">Rotondo</option><option value="square">Quadrato</option><option value="rect">Rettangolare</option></select><button className={styles.dangerText} onClick={() => setDraft((current) => current.filter((item) => item.id !== table.id))}>Elimina</button></> : <><strong>{table.name}</strong><span>{table.capacity} posti · {table.area}</span><span className={`${styles.status} ${res ? res.status === "arrivato" ? styles.arrivedStatus : styles.bookedStatus : styles.freeStatus}`}>{res ? STATUS_LABEL[res.status] : "Libero"}</span><button className={styles.textButton} onClick={() => res ? setSelectedReservation(res) : setBooking({ tableId: table.id })}>{res ? "Dettaglio" : "Assegna"}</button></>}
                  </div>;
                })}
              </div>}

              {editing && selectedDraft && view === "plan" && <div className={styles.inspector}>
                <h3>Modifica {selectedDraft.name}</h3>
                <div className={styles.inspectorFields}>
                  <label className={field}>Nome<input value={selectedDraft.name} onChange={(e) => patchDraft(selectedDraft.id, { name: e.target.value })} /></label>
                  <label className={field}>Posti<input type="number" min="1" max="20" value={selectedDraft.capacity} onChange={(e) => patchDraft(selectedDraft.id, { capacity: Number(e.target.value) })} /></label>
                  <label className={field}>Zona<input value={selectedDraft.area} onChange={(e) => patchDraft(selectedDraft.id, { area: e.target.value })} /></label>
                  <label className={field}>Forma<select value={selectedDraft.shape} onChange={(e) => patchDraft(selectedDraft.id, { shape: e.target.value as DiningTable["shape"] })}><option value="round">Rotondo</option><option value="square">Quadrato</option><option value="rect">Rettangolare</option></select></label>
                  <label className={field}>Posizione orizzontale (%)<input type="number" min="0" max="100" value={selectedDraft.pos_x} onChange={(e) => patchDraft(selectedDraft.id, { pos_x: Number(e.target.value) })} /></label>
                  <label className={field}>Posizione verticale (%)<input type="number" min="0" max="100" value={selectedDraft.pos_y} onChange={(e) => patchDraft(selectedDraft.id, { pos_y: Number(e.target.value) })} /></label>
                </div>
                <button className={styles.dangerText} onClick={() => { setDraft((current) => current.filter((item) => item.id !== selectedDraft.id)); setSelectedTable(null); }}>Elimina tavolo</button>
              </div>}
              {!editing && <div className={styles.legend}><span><i className={styles.freeKey} /> Libero</span><span><i className={styles.bookedKey} /> Prenotato</span><span><i className={styles.arrivedKey} /> Arrivato</span></div>}
            </section>

            <section className={styles.panel} aria-labelledby="reservations-title">
              <div className={styles.panelHead}><h2 id="reservations-title">Prenotazioni <span>{reservations.length}</span></h2></div>
              <input className={styles.search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca nome, telefono o codice" aria-label="Cerca prenotazioni" />
              {loading && <p className={styles.muted}>Aggiornamento…</p>}
              <div className={styles.reservationList}>
                {filteredReservations.length ? filteredReservations.map((res) => {
                  const table = tables.find((item) => item.id === res.table_id);
                  const customer = res.customer_id ? statsByCustomer.get(res.customer_id) : undefined;
                  return <article key={res.id} className={styles.reservationCard}>
                    <div className={styles.reservationTop}><strong>{timeLabel(res.arrival_time)} <span>· {table?.name ?? "Tavolo"}</span></strong><span className={`${styles.status} ${styles[`status_${res.status.replace("-", "_")}`]}`}>{STATUS_LABEL[res.status]}</span></div>
                    <button className={styles.reservationName} onClick={() => setSelectedReservation(res)}>{res.name}</button>
                    <p>{res.party_size} {res.party_size === 1 ? "persona" : "persone"}{res.source === "staff" ? " · staff" : ""}{customer ? ` · ${customer.visits ? `${customer.visits} visite` : "Prima volta"}` : ""}</p>
                    {res.notes && <p className={styles.reservationNote}>{res.notes}</p>}
                    <div className={styles.cardActions}>{res.status === "confermata" ? <><button onClick={() => changeStatus(res, "arrivato")}>Arrivati</button><button onClick={() => copyReminder(res)}>Copia promemoria</button><button onClick={() => changeStatus(res, "no-show")}>No-show</button><button onClick={() => changeStatus(res, "annullata")}>Annulla</button></> : <button onClick={() => changeStatus(res, "confermata")}>Riporta a confermata</button>}</div>
                  </article>;
                }) : <p className={styles.empty}>{search ? "Nessuna prenotazione trovata." : "Ancora nessuna prenotazione per questo servizio."}</p>}
              </div>
            </section>
          </div>
        </> : <>
          <div className={styles.pageHead}><div><span className={styles.kicker}>Relazioni che durano</span><h1>Clienti</h1><p>{customers.length} schede clienti</p></div></div>
          <div className={styles.crmGrid}>
            <section className={styles.panel} aria-label="Elenco clienti">
              <input className={styles.search} value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Cerca nome, telefono o email" aria-label="Cerca clienti" />
              <div className={styles.segmented} aria-label="Filtra clienti">{(["all", "regular", "noshow"] as const).map((key) => <button key={key} className={customerFilter === key ? styles.selected : ""} onClick={() => setCustomerFilter(key)}>{key === "all" ? "Tutti" : key === "regular" ? "Abituali" : "Con no-show"}</button>)}</div>
              <div className={styles.customerList}>{filteredCustomers.length ? filteredCustomers.map((customer) => {
                const s = statsByCustomer.get(customer.id);
                return <button key={customer.id} className={`${styles.customerRow} ${selectedCustomer?.id === customer.id ? styles.customerSelected : ""}`} onClick={() => { setSelectedCustomer(customer); setNotesDraft(customer.notes); setHistoryCount(0); setCustomerHistory([]); }}>
                  <strong>{customer.name}</strong><span>{customer.phone}</span><small>{s?.visits ?? 0} visite · {s?.no_shows ?? 0} no-show</small>
                </button>;
              }) : <p className={styles.empty}>Nessun cliente trovato.</p>}</div>
            </section>
            <section className={styles.panel} aria-label="Scheda cliente">
              {selectedCustomer ? <>
                <div className={styles.panelHead}><div><h2>{selectedCustomer.name}</h2><p className={styles.muted}>{selectedCustomer.phone}{selectedCustomer.email ? ` · ${selectedCustomer.email}` : ""}</p></div><button className={styles.secondaryButton} onClick={() => { setTab("sala"); setBooking({ customer: selectedCustomer }); }}>Nuova prenotazione</button></div>
                <div className={styles.miniStats}><Stat label="Visite" value={selectedCustomerStats?.visits ?? 0} /><Stat label="Coperti accolti" value={selectedCustomerStats?.covers ?? 0} /><Stat label="No-show" value={selectedCustomerStats?.no_shows ?? 0} /><Stat label="Prossima" value={selectedCustomerStats?.next_date ?? "—"} small /></div>
                <p className={styles.customerStatsHint}>Visite e coperti accolti si aggiornano dopo “Segna arrivati”.</p>
                <h3 className={styles.sectionTitle}>Etichette</h3>
                <div className={styles.tags}>{CUSTOMER_TAGS.map((tag) => <button key={tag} className={selectedCustomer.tags.includes(tag) ? styles.tagActive : ""} onClick={() => saveCustomer({ tags: selectedCustomer.tags.includes(tag) ? selectedCustomer.tags.filter((item) => item !== tag) : [...selectedCustomer.tags, tag] })}>{selectedCustomer.tags.includes(tag) ? "✓ " : "+ "}{tag}</button>)}</div>
                <h3 className={styles.sectionTitle}>Note interne</h3>
                <textarea className={styles.notes} rows={4} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Preferenze, allergie, tavolo preferito…" />
                <div className={styles.alignRight}><button className={styles.primaryButton} disabled={busy} onClick={() => saveCustomer({ notes: notesDraft })}>Salva note</button></div>
                <h3 className={styles.sectionTitle}>Storico prenotazioni</h3>
                {customerHistory.length ? <div className={styles.history}>{customerHistory.map((res) => <div key={res.id}><strong>{res.date}</strong><span>{res.service} · {timeLabel(res.arrival_time)} · {res.party_size} pers.</span><span>{STATUS_LABEL[res.status]}</span></div>)}</div> : <p className={styles.empty}>Nessuna prenotazione registrata.</p>}
                {customerHistory.length >= historyCount + 20 && <button className={styles.textButton} onClick={() => setHistoryCount((count) => count + 20)}>Mostra altre</button>}
              </> : <p className={styles.empty}>Seleziona un cliente per vedere storico, note e preferenze.</p>}
            </section>
          </div>
        </>}
      </div>

      {booking && client && <BookingModal client={client} date={date} service={service} tables={tables} occupied={occupied} customers={customers} seed={booking} onClose={() => setBooking(null)} onSaved={async () => { setBooking(null); setNotice("Prenotazione salvata."); await loadData(true); }} />}
      {selectedReservation && <div className={styles.modalBackdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedReservation(null); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-label="Dettaglio prenotazione">
        <div className={styles.modalHead}><div><span className={styles.kicker}>Codice {selectedReservation.code}</span><h2>{selectedReservation.name}</h2></div><button className={styles.close} onClick={() => setSelectedReservation(null)} aria-label="Chiudi">×</button></div>
        <p>{dateLabel(selectedReservation.date)} · {selectedReservation.service} ore {timeLabel(selectedReservation.arrival_time)} · {selectedReservation.party_size} persone</p>
        <p>{selectedReservation.phone || "Cellulare non indicato"}{selectedReservation.email ? ` · ${selectedReservation.email}` : ""}</p>
        {selectedReservation.notes && <p className={styles.detailNote}>{selectedReservation.notes}</p>}
        <label className={field}>Tavolo<select value={selectedReservation.table_id} onChange={(e) => moveReservation(selectedReservation, e.target.value)} disabled={busy}>{tables.map((table) => <option key={table.id} value={table.id} disabled={occupied.has(table.id) && table.id !== selectedReservation.table_id}>{table.name} · {table.capacity} posti{table.capacity < selectedReservation.party_size ? " (piccolo)" : ""}</option>)}</select></label>
        <p className={styles.muted}>Le modifiche non inviano ancora messaggi automatici al cliente.</p>
        <div className={styles.modalActions}>
          {selectedReservation.status === "confermata" && whatsappConfirmationUrl(selectedReservation) &&
            <a className={styles.secondaryButton} href={whatsappConfirmationUrl(selectedReservation)!} target="_blank" rel="noopener noreferrer">Apri conferma su WhatsApp ↗</a>}
          {selectedReservation.status === "confermata" ? <><button className={styles.primaryButton} disabled={busy} onClick={() => changeStatus(selectedReservation, "arrivato")}>Segna arrivati</button><button className={styles.secondaryButton} onClick={() => copyReminder(selectedReservation)}>Copia promemoria</button><button className={styles.secondaryButton} disabled={busy} onClick={() => changeStatus(selectedReservation, "no-show")}>No-show</button><button className={styles.dangerText} disabled={busy} onClick={() => changeStatus(selectedReservation, "annullata")}>Annulla prenotazione</button></> : <button className={styles.primaryButton} disabled={busy} onClick={() => changeStatus(selectedReservation, "confermata")}>Riporta a confermata</button>}
        </div>
        {selectedReservation.status === "confermata" && whatsappConfirmationUrl(selectedReservation) && <p className={styles.muted}>WhatsApp apre il messaggio già pronto. Controllalo e premi Invia nell’app.</p>}
      </section></div>}
    </main>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string | number; small?: boolean }) {
  return <div className={styles.stat}><span>{label}</span><strong className={small ? styles.statSmall : ""}>{value}</strong></div>;
}

async function fetchAllRows<T>(client: SupabaseClient, table: "customers" | "customer_stats") {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from(table).select("*").range(offset, offset + 999);
    if (error) return { data: [] as T[], error };
    rows.push(...((data ?? []) as T[]));
    if ((data?.length ?? 0) < 1000) break;
  }
  return { data: rows, error: null };
}

function BookingModal({ client, date, service, tables, occupied, customers, seed, onClose, onSaved }: {
  client: SupabaseClient; date: string; service: Service; tables: DiningTable[];
  occupied: Map<string, Reservation>; customers: Customer[]; seed: BookingSeed;
  onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(seed.customer?.name ?? "");
  const [phone, setPhone] = useState(seed.customer?.phone ?? "");
  const [email, setEmail] = useState(seed.customer?.email ?? "");
  const [notes, setNotes] = useState("");
  const [party, setParty] = useState(2);
  const [time, setTime] = useState(SERVICE_TIMES[service][0]);
  const [tableId, setTableId] = useState(seed.tableId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const eligible = tables.filter((table) => !occupied.has(table.id));
  const chosen = tables.find((table) => table.id === tableId);
  const matches = customers.filter((customer) => phone.replace(/\D/g, "").endsWith(customer.phone_key) && phone.length >= 6);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const { error: saveError } = await client.rpc("create_staff_reservation", {
      p_date: date, p_service: service, p_arrival_time: time,
      p_party_size: party, p_name: name.trim(), p_phone: phone.trim() || null,
      p_email: email.trim() || null, p_notes: notes.trim(), p_table_id: tableId || null,
      p_reminder_opt_in: false,
    });
    setBusy(false);
    if (saveError) setError(readableError(saveError.message));
    else await onSaved();
  }

  return <div className={styles.modalBackdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-label="Nuova prenotazione">
    <div className={styles.modalHead}><div><span className={styles.kicker}>Prenotazione da staff</span><h2>Un nuovo tavolo.</h2></div><button className={styles.close} onClick={onClose} aria-label="Chiudi">×</button></div>
    <p className={styles.muted}>{dateLabel(date)} · {service}</p>
    <form onSubmit={submit} className={styles.bookingForm}>
      <div className={styles.formGrid}>
        <label className={field}>Nome e cognome *<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className={field}>Persone *<input type="number" required min="1" max="20" value={party} onChange={(e) => setParty(Number(e.target.value))} /></label>
        <label className={field}>Cellulare<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <label className={field}>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className={field}>Orario di arrivo<select value={time} onChange={(e) => setTime(e.target.value)}>{SERVICE_TIMES[service].map((slot) => <option key={slot}>{slot}</option>)}</select></label>
        <label className={field}>Tavolo<select value={tableId} onChange={(e) => setTableId(e.target.value)}><option value="">Automatico · il più piccolo libero</option>{eligible.map((table) => <option key={table.id} value={table.id}>{table.name} · {table.capacity} posti · {table.area}{table.capacity < party ? " (piccolo)" : ""}</option>)}</select></label>
      </div>
      {chosen && chosen.capacity < party && <p className={styles.warning}>Questo tavolo ha meno posti delle persone indicate.</p>}
      {matches.length > 0 && <p className={styles.muted}>Cliente già presente: {matches[0].name}</p>}
      <label className={field}>Note della prenotazione<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergie, occasione speciale, seggiolone…" /></label>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Annulla</button><button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? "Salvataggio…" : "Salva prenotazione"}</button></div>
    </form>
  </section></div>;
}
