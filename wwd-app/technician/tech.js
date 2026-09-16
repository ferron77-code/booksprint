/* Technician phone view — Worldwide Distributors
   ------------------------------------------------------------------
   The rule this file is built around: nothing the technician taps
   waits on the network. Every action is written to a local queue
   first and the screen updates immediately. Sending happens after,
   whenever there is signal. If the phone dies on a job site the queue
   is still on disk when it comes back.

   Live build. Reads and writes go to Supabase with the ANON key and
   the man's own session. Row level security decides what he can see
   and touch; this file never tries to be the gate. In particular no
   price exists anywhere in what it asks for, and the database would
   refuse it if it did.

   Layout of this file:
     config + client        what we talk to
     device + durable queue what survives a dead battery
     sending                the queue draining into real tables
     loading                pulling his jobs and shaping them for paint
     auth                   sign-in, sign-out, session
     language               EN / ES strings
     paint                  the screens
     actions                tap in/out, notes, voice, photos, closeout
*/

/* ---------------- config + client ---------------- */
const CFG = window.WWD || {};
const BUCKET = CFG.BUCKET || 'wwd';
const LIVE_STAGES = ['scheduled', 'in_progress', 'waiting_on_product'];

const CFG_OK = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY &&
                  !/PASTE|YOUR_|_HERE/i.test(CFG.SUPABASE_ANON_KEY));

// The anon key ships in the client on purpose. RLS is the gate.
const SB = CFG_OK && window.supabase
  ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true,
              detectSessionInUrl: false, storageKey: 'wwd.auth' }
    })
  : null;

/* ---------------- device identity ---------------- */
const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    }));
const iso = () => new Date().toISOString();

const DEV_KEY = 'wwd.device_id';
let DEVICE_ID = localStorage.getItem(DEV_KEY);
if (!DEVICE_ID) { DEVICE_ID = uuid(); localStorage.setItem(DEV_KEY, DEVICE_ID); }

/* ---------------- durable queue ----------------
   Append-only. Rows leave only once the server has acknowledged them.
   Keys are made on the phone, so a retried insert is recognised by
   the server as a duplicate (23505) and treated here as delivered,
   never applied twice.

   IndexedDB is the durable store, with an in-memory mirror in front
   of it so the render paths can read synchronously. The mirror is a
   cache, never the source of truth: on boot it is rebuilt from disk.
   If IndexedDB is unavailable the app falls back to localStorage for
   rows and holds binaries in memory -- degraded, not broken.        */
const Q_KEY = 'wwd.queue', S_KEY = 'wwd.seq', SNAP_KEY = 'wwd.snapshot';
const DB_NAME = 'wwd', DB_VER = 1;
const ST_CHANGES = 'changes', ST_BLOBS = 'blobs', ST_META = 'meta';

let DB = null;
let MIRROR = [];
let STORE_READY = false;

function idbOpen() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('no indexeddb')); return; }
    const rq = indexedDB.open(DB_NAME, DB_VER);
    rq.onupgradeneeded = ev => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(ST_CHANGES)) {
        const os = db.createObjectStore(ST_CHANGES, { keyPath: 'id' });
        os.createIndex('by_seq', 'client_seq');
      }
      if (!db.objectStoreNames.contains(ST_BLOBS)) db.createObjectStore(ST_BLOBS);
      if (!db.objectStoreNames.contains(ST_META))  db.createObjectStore(ST_META);
    };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror   = () => reject(rq.error);
  });
}
function tx(stores, mode) { return DB.transaction(Array.isArray(stores) ? stores : [stores], mode); }
function idbPut(store, value, key) {
  return new Promise((resolve, reject) => {
    const t = tx(store, 'readwrite');
    const rq = key === undefined ? t.objectStore(store).put(value) : t.objectStore(store).put(value, key);
    rq.onsuccess = () => resolve(); rq.onerror = () => reject(rq.error);
  });
}
function idbAll(store) {
  return new Promise((resolve, reject) => {
    const rq = tx(store, 'readonly').objectStore(store).getAll();
    rq.onsuccess = () => resolve(rq.result || []); rq.onerror = () => reject(rq.error);
  });
}
function idbGet(store, key) {
  return new Promise((resolve, reject) => {
    const rq = tx(store, 'readonly').objectStore(store).get(key);
    rq.onsuccess = () => resolve(rq.result); rq.onerror = () => reject(rq.error);
  });
}
function idbDel(store, key) {
  return new Promise((resolve, reject) => {
    const rq = tx(store, 'readwrite').objectStore(store).delete(key);
    rq.onsuccess = () => resolve(); rq.onerror = () => reject(rq.error);
  });
}

let SEQ = parseInt(localStorage.getItem(S_KEY) || '0', 10);
const BLOBS = new Map();   // change id -> Blob, fallback path only

async function storeInit() {
  try {
    DB = await idbOpen();
    MIRROR = await idbAll(ST_CHANGES);
    MIRROR.sort((a, b) => a.client_seq - b.client_seq);
    const legacy = localStorage.getItem(Q_KEY);
    if (legacy) {
      try {
        for (const r of JSON.parse(legacy)) {
          if (!MIRROR.some(m => m.id === r.id)) { await idbPut(ST_CHANGES, r); MIRROR.push(r); }
        }
        localStorage.removeItem(Q_KEY);
        MIRROR.sort((a, b) => a.client_seq - b.client_seq);
      } catch (e) {}
    }
    const seq = await idbGet(ST_META, 'seq');
    // Never go backwards: client_seq must stay monotonic.
    SEQ = Math.max(seq || 0, SEQ, MIRROR.reduce((m, c) => Math.max(m, c.client_seq || 0), 0));
    STORE_READY = true;
  } catch (e) {
    STORE_READY = false;
    MIRROR = readQueueLS();
  }
}

function readQueue() { return MIRROR; }
function readQueueLS() {
  try { return JSON.parse(localStorage.getItem(Q_KEY) || '[]'); } catch (e) { return []; }
}
function writeQueueLS(rows) {
  try { localStorage.setItem(Q_KEY, JSON.stringify(rows)); } catch (e) {}
}
async function persist(change) {
  if (STORE_READY) { try { await idbPut(ST_CHANGES, change); } catch (e) {} }
  else writeQueueLS(MIRROR);
}
async function queuedBlob(changeId) {
  if (STORE_READY) { try { return await idbGet(ST_BLOBS, changeId); } catch (e) { return null; } }
  return BLOBS.get(changeId) || null;
}
async function dropChange(c) {
  if (STORE_READY) {
    try { await idbDel(ST_CHANGES, c.id); if (c.has_blob) await idbDel(ST_BLOBS, c.id); }
    catch (e) {}
  } else if (c.has_blob) BLOBS.delete(c.id);
  const k = MIRROR.indexOf(c);
  if (k >= 0) MIRROR.splice(k, 1);
  if (!STORE_READY) writeQueueLS(MIRROR);
}

function pending()     { return MIRROR.filter(c => !c.failed); }
function failedList()  { return MIRROR.filter(c => c.failed); }

/* One queued change. `wo` is the job it belongs to (for the list badge
   and the overlay after a refresh). `payload` holds exactly the columns
   the server will receive. A binary rides beside it, keyed by change id,
   and goes to Storage at `blob_path` after the row has landed.        */
function queue(spec) {
  const now = iso();

  // Ticking a box on and off again should not send two updates; the
  // last state wins, in place.
  if (spec.table === 'scope_item' && spec.op === 'update') {
    const prev = MIRROR.find(m => !m.failed && !m.row_done &&
      m.table_name === 'scope_item' && m.row_id === spec.row_id);
    if (prev) {
      prev.payload = spec.payload; prev.client_created_at = now;
      persist(prev); paintNet(); flush();
      return prev;
    }
  }

  SEQ += 1;
  const change = {
    id: uuid(),
    device_id: DEVICE_ID,
    client_seq: SEQ,
    table_name: spec.table,
    row_id: spec.row_id,
    op: spec.op,
    wo: spec.wo,
    actor_id: ME ? ME.id : null,
    payload: spec.payload,
    client_created_at: now,
    has_blob: !!spec.blob,
    blob_path: spec.blob_path || null,
    blob_type: spec.blob ? (spec.blob_type || spec.blob.type) : null,
    row_done: false,
    blob_done: false,
    attempts: 0,
    error: null,
    failed: false
  };
  MIRROR.push(change);

  if (STORE_READY) {
    const work = spec.blob
      ? idbPut(ST_BLOBS, spec.blob, change.id).then(() => idbPut(ST_CHANGES, change))
      : idbPut(ST_CHANGES, change);
    work.then(() => idbPut(ST_META, SEQ, 'seq')).catch(() => {});
  } else {
    if (spec.blob) { BLOBS.set(change.id, spec.blob); change.volatile_blob = true; }
    localStorage.setItem(S_KEY, String(SEQ));
    writeQueueLS(MIRROR);
  }

  saveSnapshot();
  paintNet();
  flush();
  return change;
}

/* ---------------- sending ----------------
   Drains the queue in order. A row that the server refuses for a
   reason that will not change (policy, constraint, bad input) is
   marked failed and stepped over so it cannot block a day's work
   behind it; the man sees a count and can discard. Anything that
   might be the network is retried with backoff.                  */
let flushing = false, retryTimer = null;

function offline() {
  return !navigator.onLine || document.body.classList.contains('offline');
}

async function flush() {
  if (flushing || !SB || !ME || offline()) return;
  const batch = pending();
  if (!batch.length) return;
  flushing = true;
  let sent = 0, stop = false, needAuth = false;
  try {
    for (const c of batch) {
      if (stop) break;
      if (c.actor_id && c.actor_id !== ME.id) {
        // Queued by whoever was signed in before. The server would
        // refuse it under this man's name; say so rather than retry.
        c.failed = true; c.error = 'queued by a different sign-in'; await persist(c);
        continue;
      }
      const r = await send(c);
      if (r.ok) { await dropChange(c); sent++; continue; }
      c.attempts = (c.attempts || 0) + 1;
      c.error = r.error;
      if (r.permanent || c.attempts >= 8) c.failed = true;
      await persist(c);
      if (c.failed) { toast(t('send_refused')); continue; }
      if (r.auth) { needAuth = true; stop = true; }
      else if (!r.blobOnly) stop = true;        // keep order: nothing after a stuck row
    }
  } finally { flushing = false; }

  paintNet(); paintList();
  const left = pending();
  const fresh = left.some(c => !batch.includes(c));   // queued while this pass ran
  if (needAuth) { if (await reauth()) scheduleRetry(); }
  else if (fresh && !stop) flush();                    // new work goes now
  else if (left.length) scheduleRetry();               // stuck work waits, with backoff
  if (sent) pullJobs();
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  const worst = pending().reduce((m, c) => Math.max(m, c.attempts || 0), 0);
  retryTimer = setTimeout(flush, Math.min(60000, 3000 * Math.pow(2, Math.max(0, worst - 1))));   // 3s, 6s, 12s … 60s
}

async function send(c) {
  try {
    if (!c.row_done) {
      await writeRow(c);
      c.row_done = true; await persist(c);
    }
    if (c.has_blob && !c.blob_done) {
      const blob = await queuedBlob(c.id);
      if (blob) {
        const { error } = await SB.storage.from(BUCKET)
          .upload(c.blob_path, blob, { contentType: c.blob_type || blob.type, upsert: true });
        if (error) throw Object.assign(error, { _storage: true });
        if (c.table_name === 'attachment') {
          const { error: e2 } = await SB.from('attachment')
            .update({ upload_status: 'uploaded', uploaded_at: iso() }).eq('id', c.row_id);
          if (e2) throw e2;
        }
      } else if (c.table_name === 'attachment') {
        // The bytes were lost (fallback storage, tab killed). The row
        // stays, marked honestly, so the office knows a photo is missing.
        await SB.from('attachment').update({ upload_status: 'failed' }).eq('id', c.row_id);
      }
      c.blob_done = true;
    }
    return { ok: true };
  } catch (err) {
    const r = classify(err);
    if (c.table_name === 'attachment' && c.row_done && !r.permanent && !r.auth) {
      // Row landed, file did not. Count the attempt where the office can see it.
      try { await SB.from('attachment').update({ upload_attempts: (c.attempts || 0) + 1 }).eq('id', c.row_id); } catch (e) {}
    }
    return { ok: false, error: r.error, permanent: r.permanent, auth: r.auth,
             blobOnly: c.row_done && c.has_blob && !c.blob_done };
  }
}

async function ins(table, row) {
  const { error } = await SB.from(table).insert(row);
  if (error && error.code !== '23505') throw error;   // 23505: already there, from a retry
}
async function upd(table, id, patch) {
  const { error } = await SB.from(table).update(patch).eq('id', id);
  if (error) throw error;
}
async function rpc(fn, args) {
  const { error } = await SB.rpc(fn, args);
  if (error) throw error;
}

async function writeRow(c) {
  const p = c.payload;
  switch (c.table_name) {
    case 'note':        return ins('note', Object.assign({ id: c.row_id }, p));
    case 'attachment':  return ins('attachment', Object.assign({ id: c.row_id }, p));
    case 'scope_item':  return upd('scope_item', c.row_id, p);
    case 'job_visit':   return c.op === 'insert'
                          ? ins('job_visit', Object.assign({ id: c.row_id }, p))
                          : upd('job_visit', c.row_id, p);
    // Forward-only on the server: a stale phone can never drag an
    // invoiced job back onto the board.
    case 'work_order':  return rpc('apply_synced_stage',
                          { wo: c.row_id, incoming: p.stage, client_at: p.client_at });
    // A real signature always beats a reason-for-none, whichever lands first.
    case 'work_order_signoff': return rpc('apply_synced_signoff', {
                          wo: c.row_id,
                          in_signed_at: p.signed_at || null,
                          in_signer:    p.signer_name || null,
                          in_path:      p.signature_path || null,
                          in_channel:   p.channel || null,
                          in_reason:    p.no_signature || null,
                          in_client_at: c.client_created_at,
                          in_actor:     ME.id });
    default: throw Object.assign(new Error('unknown table ' + c.table_name), { code: 'LOCAL' });
  }
}

/* Decide whether an error is worth retrying. Postgres codes and HTTP
   statuses that will come back identical tomorrow are permanent.     */
function classify(err) {
  const msg = String((err && (err.message || err.error)) || err || 'error');
  const code = String((err && err.code) || '');
  const status = String((err && (err.statusCode || err.status)) || '');
  if (/jwt|expired|not authenticated/i.test(msg) || status === '401' || code === 'PGRST301')
    return { error: msg, auth: true };
  if (/failed to fetch|networkerror|load failed|network request failed|timeout|aborted/i.test(msg))
    return { error: msg, permanent: false };
  const permCodes = ['42501', '23514', '23503', '23502', '22P02', '22007', '22008', '42883', '42P01', '42703', 'LOCAL'];
  if (permCodes.includes(code) || /^PGRST(1|2)/.test(code))
    return { error: msg, permanent: true };
  if (['400', '403', '404', '413', '415', '422'].includes(status))
    return { error: msg, permanent: true };
  return { error: msg, permanent: false };
}

/* ---------------- loading ----------------
   One query, filtered by RLS on every table it touches. A technician
   receives only jobs he is currently on, in the three live stages,
   with only his own visits. Nobody else's hours, nobody's money.    */
const SELECT = [
  'id, number, division, stage, summary, summary_es',
  'waiting_reason, waiting_reason_es, expected_date, high_priority, opened_on, updated_at',
  'customer ( name )',
  'site ( label, address_line, city )',
  'scope_item ( id, position, body, body_es, done )',
  'work_order_assignment ( technician_id, unassigned_at )',
  'note ( id, author_id, source, original_lang, original_body, translated_body, translation_edited, translate_state, transcribe_state, audio_path, created_at, client_created_at )',
  'attachment ( id, kind, caption, storage_path, upload_status, created_at, client_created_at )',
  'job_visit ( id, technician_id, arrived_at, departed_at )'
].join(', ');

let ROSTER = {};             // app_user id -> { full_name, short_name, role }
let pulling = false;

async function pullJobs() {
  if (!SB || !ME || pulling || offline()) return false;
  pulling = true;
  try {
    const [roster, jobs] = await Promise.all([
      SB.from('app_user').select('id, full_name, short_name, role'),
      SB.from('work_order').select(SELECT).in('stage', LIVE_STAGES)
        .order('high_priority', { ascending: false }).order('opened_on', { ascending: true })
    ]);
    if (roster.error) throw roster.error;
    if (jobs.error) throw jobs.error;

    ROSTER = {};
    for (const u of roster.data || []) ROSTER[u.id] = u;
    DATA.jobs = overlayPending((jobs.data || []).map(shapeJob));
    DATA.pulled_at = iso();
    saveSnapshot();

    if (OPEN) {
      const again = DATA.jobs.find(j => j.id === OPEN.id);
      if (again) { OPEN = again; if (!VOICE.active) paintDetail(); }
      else { closeSheet(); toast(t('not_yours')); }
    }
    paintList(); paintHeader();
    return true;
  } catch (err) {
    const r = classify(err);
    if (r.auth) await reauth();
    return false;
  } finally { pulling = false; }
}

const who = id => (ROSTER[id] && (ROSTER[id].full_name)) || (ME && id === ME.id ? ME.full_name : '—');
const short = id => (ROSTER[id] && (ROSTER[id].short_name || ROSTER[id].full_name)) || '—';

function shapeJob(r) {
  const site = r.site || {};
  const addr = [site.address_line, site.city].filter(Boolean).join(', ');
  const visits = (r.job_visit || []).filter(v => v.technician_id === ME.id)
    .sort((a, b) => String(a.arrived_at).localeCompare(String(b.arrived_at)));
  const open = visits.find(v => !v.departed_at);
  return {
    id: r.id, number: r.number, division: r.division, stage: r.stage,
    priority: !!r.high_priority,
    customer: (r.customer && r.customer.name) || '',
    site: site.label ? addr + ' — ' + site.label : addr,
    summary: r.summary, summary_es: r.summary_es,
    waiting_for: r.waiting_reason, waiting_for_es: r.waiting_reason_es,
    expected_date: r.expected_date,
    items: (r.scope_item || []).slice().sort((a, b) => a.position - b.position)
      .map(s => ({ id: s.id, body: s.body, body_es: s.body_es, done: !!s.done })),
    crew: (r.work_order_assignment || []).filter(a => !a.unassigned_at)
      .map(a => ({ id: a.technician_id, name: who(a.technician_id), short: short(a.technician_id) })),
    onsite: !!open,
    my_visit: open ? open.id : null,
    notes: (r.note || []).map(n => ({
      id: n.id, author_id: n.author_id, who: who(n.author_id),
      at: n.client_created_at || n.created_at,
      lang: n.original_lang, original: n.original_body, translated: n.translated_body,
      edited: !!n.translation_edited,
      awaiting_text: !n.original_body && n.transcribe_state !== 'done',
      audio: !!n.audio_path
    })).sort((a, b) => String(a.at).localeCompare(String(b.at))),
    attachments: (r.attachment || []).map(a => ({
      id: a.id, kind: a.kind, caption: a.caption,
      at: a.client_created_at || a.created_at, state: a.upload_status
    })).sort((a, b) => String(a.at).localeCompare(String(b.at)))
  };
}

/* A fresh pull must not erase what he did a minute ago and has not
   sent yet. Replay the unsent queue over the server's copy.        */
function overlayPending(jobs) {
  const byId = {}; jobs.forEach(j => { byId[j.id] = j; });
  const gone = new Set();
  for (const c of pending()) {
    const j = byId[c.wo]; if (!j) continue;
    const p = c.payload;
    switch (c.table_name) {
      case 'note':
        if (!j.notes.some(n => n.id === c.row_id))
          j.notes.push({ id: c.row_id, author_id: ME.id, who: ME.full_name, at: c.client_created_at,
            lang: p.original_lang, original: p.original_body, translated: null,
            awaiting_text: p.transcribe_state !== 'done' && !p.original_body, audio: !!p.audio_path, local: true });
        break;
      case 'scope_item': { const it = j.items.find(i => i.id === c.row_id); if (it) it.done = !!p.done; break; }
      case 'job_visit':
        if (c.op === 'insert') { j.onsite = true; j.my_visit = c.row_id; }
        else if (j.my_visit === c.row_id) { j.onsite = false; j.my_visit = null; }
        break;
      case 'work_order':
        j.stage = p.stage;
        if (!LIVE_STAGES.includes(p.stage)) gone.add(j.id);
        break;
      case 'attachment':
        if (!j.attachments.some(a => a.id === c.row_id))
          j.attachments.push({ id: c.row_id, kind: p.kind, caption: p.caption || null,
            at: c.client_created_at, state: 'pending', local: true });
        break;
    }
  }
  return jobs.filter(j => !gone.has(j.id));
}

/* Last good copy, so the app opens with his jobs in a basement. */
let snapTimer = null;
function saveSnapshot() {
  clearTimeout(snapTimer);
  snapTimer = setTimeout(async () => {
    if (!ME) return;
    const snap = { v: 1, me: ME, jobs: DATA.jobs, pulled_at: DATA.pulled_at || null };
    if (STORE_READY) { try { await idbPut(ST_META, snap, 'snapshot'); return; } catch (e) {} }
    try { localStorage.setItem(SNAP_KEY, JSON.stringify(snap)); } catch (e) {}
  }, 150);
}
async function loadSnapshot() {
  if (STORE_READY) { try { const s = await idbGet(ST_META, 'snapshot'); if (s) return s; } catch (e) {} }
  try { return JSON.parse(localStorage.getItem(SNAP_KEY) || 'null'); } catch (e) { return null; }
}
async function clearSnapshot() {
  if (STORE_READY) { try { await idbDel(ST_META, 'snapshot'); } catch (e) {} }
  try { localStorage.removeItem(SNAP_KEY); } catch (e) {}
}

/* ---------------- auth ---------------- */
let ME = null;               // his app_user row
let SNAP = null;
let timers = [];

function showSignin(msg) {
  const s = document.getElementById('signin');
  s.hidden = false;
  const e = document.getElementById('s_err');
  if (msg) { e.textContent = msg; e.hidden = false; } else e.hidden = true;
  document.getElementById('s_go').disabled = false;
  document.getElementById('s_go').textContent = t('signin_btn');
}
function hideSignin() { document.getElementById('signin').hidden = true; }

async function authInit() {
  if (!SB) { showSignin(window.supabase ? t('err_cfg') : t('err_lib')); return; }
  SB.auth.onAuthStateChange((ev) => {
    if (ev === 'SIGNED_OUT' && ME) { ME = null; stopTimers(); showSignin(); }
  });
  let session = null;
  try { session = (await SB.auth.getSession()).data.session; } catch (e) {}
  if (session) await afterSignIn(session); else showSignin();
}

async function afterSignIn(session) {
  const uid = session.user.id;
  const cached = SNAP && SNAP.me && SNAP.me.auth_id === uid ? SNAP.me : null;

  if (!offline()) {
    const { data, error } = await SB.from('app_user')
      .select('id, auth_id, full_name, short_name, role, preferred_lang').eq('auth_id', uid).maybeSingle();
    if (error) {
      const r = classify(error);
      if (r.auth) { await SB.auth.signOut(); showSignin(t('err_expired')); return; }
      if (!cached) { showSignin(t('err_net')); return; }
      ME = cached;
    } else if (!data) {
      // An auth account with no roster row cannot do anything useful.
      await SB.auth.signOut();
      showSignin(t('err_roster'));
      return;
    } else ME = data;
  } else if (cached) ME = cached;
  else { showSignin(t('err_net')); return; }

  if (!localStorage.getItem('wwd.lang') && ME.preferred_lang) { LANG = ME.preferred_lang; localStorage.setItem('wwd.lang', LANG); }

  hideSignin();
  if (SNAP && SNAP.me && SNAP.me.id === ME.id) {
    DATA.jobs = overlayPending(SNAP.jobs || []);
    DATA.pulled_at = SNAP.pulled_at;
  } else { DATA.jobs = []; DATA.pulled_at = null; }
  paintLang();
  await pullJobs();
  flush();
  startTimers();
}

async function signIn(email, password) {
  const btn = document.getElementById('s_go');
  btn.disabled = true; btn.textContent = t('signing');
  document.getElementById('s_err').hidden = true;
  if (offline()) { showSignin(t('err_net')); return; }
  const { data, error } = await SB.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    const r = classify(error);
    showSignin(r.permanent === false && /fetch|network/i.test(r.error) ? t('err_net') : t('err_creds'));
    return;
  }
  await afterSignIn(data.session);
}

async function reauth() {
  try {
    const { data, error } = await SB.auth.refreshSession();
    if (!error && data.session) return true;
  } catch (e) {}
  ME = null; stopTimers();
  showSignin(t('err_expired'));
  return false;
}

async function signOut() {
  const n = pending().length;
  if (n) { toast(t('signout_block').replace('%s', n)); return; }
  stopTimers();
  ME = null; DATA = { jobs: [], pulled_at: null }; OPEN = null;
  await clearSnapshot();
  for (const c of failedList()) await dropChange(c);
  try { await SB.auth.signOut(); } catch (e) {}
  paintList(); paintHeader(); paintNet();
  showSignin();
}

function startTimers() {
  stopTimers();
  timers.push(setInterval(() => {
    if (document.visibilityState === 'visible') { flush(); pullJobs(); }
  }, 90000));
}
function stopTimers() { timers.forEach(clearInterval); timers = []; clearTimeout(retryTimer); }

/* ---------------- language ---------------- */
const T = {
  en: { v_pending:'Voice note — text will appear when there is signal', v_listening:'Listening…', v_recording:'Recording…',
        v_release:'Release to save', v_left:'%s seconds left',
        v_nolive:'No signal — recording anyway, words come later',
        v_saved:'Voice note saved', v_saved_nowords:'Voice note saved — text will follow',
        v_nothing:'Nothing recorded', v_short:'Too short',
        v_denied:'Microphone blocked. Allow it in Settings.',
        v_nomic:'No microphone on this device',
        justnow:'Just now', today:'Today', yesterday:'Yesterday',
        offline:'Working offline', role:'Technician', role_office:'Office', crew:'On this job',
        scope:'Work to do', notes:'Notes', photos:'Photos and receipts',
        voice:'🎤 Voice note', addnote:'Add note', noteph:'Add a note…',
        photo:'📷 Add photo or receipt', cancel:'Cancel',
        cl_title:'Close this job', cl_sub:'Ask the customer to sign. If nobody is here, that is fine.',
        cl_hint:'Customer signs above', cl_sign:'Save signature and close',
        cl_nosig:'No one here to sign', rs_title:'Why no signature?',
        rs_sub:'The job still closes. This is just for the record.',
        rs_notpresent:'Customer not here', rs_declined:'Customer would not sign',
        rs_unattended:'Nobody at the property',
        signer:'Customer name', signer_ph:'Who is signing',
        myjobs:'My jobs', updated:'updated', in:'Tap in', out:'Tap out', close:'Finish job',
        onsite:'On site', notin:'Not tapped in', waiting:'Waiting on', you:'you',
        scheduled:'Scheduled', in_progress:'In progress',
        waiting_on_product:'Waiting on product', priority:'Priority',
        queued:'change waiting to send', queuedp:'changes waiting to send',
        failed1:'change could not be sent — tap to review', failedp:'changes could not be sent — tap to review',
        discard_failed:'%s change(s) were refused by the server and will not be sent. Discard them?',
        send_refused:'A change was refused by the server. See the red bar.',
        translated_from:'Translated from', lang_en:'English', lang_es:'Spanish',
        untranslated:'Original — translation not sent yet', corrected:'corrected by the office',
        audio:'Voice recording', done:'Job closed. Nice work.',
        nojobs:'No jobs assigned right now.', not_yours:'That job is no longer assigned to you.',
        kind_title:'What is this photo?', k_before:'Before', k_after:'After', k_receipt:'Receipt', k_other:'Other',
        a_sent:'sent', a_queued:'queued', a_failed:'not sent',
        signin_sub:'Use the sign-in on your card.', email:'Sign-in', password:'Password',
        signin_btn:'Sign in', signing:'Signing in…',
        err_creds:'Wrong sign-in or password.', err_net:'No signal. Connect to sign in the first time.',
        err_roster:'This sign-in is not on the roster. Tell Charlie.',
        err_expired:'Your session expired. Sign in again — nothing has been lost.',
        err_cfg:'App is not set up yet: the Supabase key is missing from config.js.',
        err_lib:'App files did not load fully. Reload with signal.',
        refresh:'Refresh', signout:'Sign out',
        signout_block:'%s change(s) still waiting to send. Sign out once they have gone.',
        account:'Account' },
  es: { v_pending:'Nota de voz — el texto aparecerá cuando haya señal', v_listening:'Escuchando…', v_recording:'Grabando…',
        v_release:'Suelta para guardar', v_left:'%s segundos restantes',
        v_nolive:'Sin señal — grabando igual, el texto llega después',
        v_saved:'Nota de voz guardada', v_saved_nowords:'Nota guardada — el texto llegará',
        v_nothing:'No se grabó nada', v_short:'Muy corto',
        v_denied:'Micrófono bloqueado. Permítelo en Ajustes.',
        v_nomic:'Este equipo no tiene micrófono',
        justnow:'Ahora mismo', today:'Hoy', yesterday:'Ayer',
        offline:'Sin conexión', role:'Técnico', role_office:'Oficina', crew:'En este trabajo',
        scope:'Trabajo por hacer', notes:'Notas', photos:'Fotos y recibos',
        voice:'🎤 Nota de voz', addnote:'Agregar nota', noteph:'Agregar una nota…',
        photo:'📷 Agregar foto o recibo', cancel:'Cancelar',
        cl_title:'Cerrar este trabajo', cl_sub:'Pida la firma del cliente. Si no hay nadie, está bien.',
        cl_hint:'El cliente firma arriba', cl_sign:'Guardar firma y cerrar',
        cl_nosig:'No hay quien firme', rs_title:'¿Por qué no hay firma?',
        rs_sub:'El trabajo se cierra igual. Esto es solo para el registro.',
        rs_notpresent:'El cliente no está', rs_declined:'El cliente no quiso firmar',
        rs_unattended:'No hay nadie en la propiedad',
        signer:'Nombre del cliente', signer_ph:'Quién firma',
        myjobs:'Mis trabajos', updated:'actualizado', in:'Marcar entrada', out:'Marcar salida', close:'Terminar trabajo',
        onsite:'En sitio', notin:'Sin marcar', waiting:'Esperando', you:'usted',
        scheduled:'Programado', in_progress:'En progreso',
        waiting_on_product:'Esperando producto', priority:'Prioridad',
        queued:'cambio por enviar', queuedp:'cambios por enviar',
        failed1:'cambio no se pudo enviar — toque para revisar', failedp:'cambios no se pudieron enviar — toque para revisar',
        discard_failed:'El servidor rechazó %s cambio(s) y no se enviarán. ¿Descartarlos?',
        send_refused:'El servidor rechazó un cambio. Vea la barra roja.',
        translated_from:'Traducido del', lang_en:'inglés', lang_es:'español',
        untranslated:'Original — traducción pendiente', corrected:'corregido por la oficina',
        audio:'Grabación de voz', done:'Trabajo cerrado. Buen trabajo.',
        nojobs:'No hay trabajos asignados ahora.', not_yours:'Ese trabajo ya no está asignado a usted.',
        kind_title:'¿Qué es esta foto?', k_before:'Antes', k_after:'Después', k_receipt:'Recibo', k_other:'Otro',
        a_sent:'enviado', a_queued:'en cola', a_failed:'no enviado',
        signin_sub:'Use el usuario de su tarjeta.', email:'Usuario', password:'Contraseña',
        signin_btn:'Iniciar sesión', signing:'Iniciando…',
        err_creds:'Usuario o contraseña incorrectos.', err_net:'Sin señal. Conéctese para iniciar sesión la primera vez.',
        err_roster:'Este usuario no está en la lista. Avise a Charlie.',
        err_expired:'Su sesión venció. Inicie sesión otra vez — no se perdió nada.',
        err_cfg:'La app no está configurada: falta la clave de Supabase en config.js.',
        err_lib:'La app no cargó completa. Recargue con señal.',
        refresh:'Actualizar', signout:'Salir',
        signout_block:'%s cambio(s) todavía por enviar. Salga cuando se hayan enviado.',
        account:'Cuenta' }
};
let LANG = localStorage.getItem('wwd.lang') || 'en';
const t = k => (T[LANG][k] || T.en[k] || k);
function setLang(l) { LANG = l; localStorage.setItem('wwd.lang', LANG); paintLang(); }

function paintLang() {
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-tp]').forEach(el => { el.placeholder = t(el.dataset.tp); });
  ['en', 's_en', 'l_en'].forEach(i => document.getElementById(i).setAttribute('aria-pressed', LANG === 'en'));
  ['es', 's_es', 'l_es'].forEach(i => document.getElementById(i).setAttribute('aria-pressed', LANG === 'es'));
  paintHeader();
  paintList();
  if (OPEN) paintDetail();
  paintNet();
}

/* ---------------- state ---------------- */
let DATA = { jobs: [], pulled_at: null };
let OPEN = null;

const initials = n => String(n || '').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const es = (en, esv) => (LANG === 'es' && esv) ? esv : en;

function fmtWhen(v) {
  if (!v) return '';
  const d = new Date(v); if (isNaN(d)) return String(v);
  const loc = LANG === 'es' ? 'es-US' : 'en-US';
  const now = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  const time = d.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' });
  if (now - d < 60000 && now - d >= 0) return t('justnow');
  if (same(d, now)) return t('today') + ' ' + time;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (same(d, y)) return t('yesterday') + ' ' + time;
  return d.toLocaleDateString(loc, { month: 'short', day: 'numeric' }) + ' ' + time;
}
function fmtTime(v) {
  const d = new Date(v); if (isNaN(d)) return '';
  return d.toLocaleTimeString(LANG === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit' });
}

/* ---------------- paint: header + list ---------------- */
function paintHeader() {
  document.getElementById('myname').textContent = ME ? ME.full_name : '…';
  document.getElementById('me').textContent = ME ? initials(ME.short_name || ME.full_name) : '–';
  document.getElementById('myrole').textContent = ME && ME.role !== 'technician' ? t('role_office') : t('role');
  document.getElementById('dayhdr').innerHTML = esc(t('myjobs')) +
    (DATA.pulled_at ? ' <small>· ' + esc(t('updated')) + ' ' + esc(fmtTime(DATA.pulled_at)) + '</small>' : '');
}

function paintList() {
  const host = document.getElementById('jobs');
  if (!DATA.jobs.length) {
    host.innerHTML = '<div class="job"><div class="addr">' + esc(t('nojobs')) + '</div></div>';
    return;
  }
  host.innerHTML = DATA.jobs.map((j, i) => {
    const mates = j.crew.filter(c => c.id !== ME.id).map(c => c.short);
    const stagePill = j.onsite
      ? '<span class="pill p-onsite">' + esc(t('onsite')) + '</span>'
      : '<span class="pill p-' + (j.stage === 'waiting_on_product' ? 'waiting' : esc(j.stage)) + '">' + esc(t(j.stage)) + '</span>';
    const unsent = pending().filter(c => c.wo === j.id).length;
    return '<button class="job' + (j.onsite ? ' active' : '') + '" data-i="' + i + '">' +
      '<div class="wo">' + esc(j.number) + '</div>' +
      '<div class="cust">' + esc(j.customer) + '</div>' +
      '<div class="addr">' + esc(j.site) + '</div>' +
      '<div class="scope">' + esc(es(j.summary, j.summary_es)) + '</div>' +
      '<div class="row">' + stagePill +
        (j.priority ? '<span class="pill priority">' + esc(t('priority')) + '</span>' : '') +
        (mates.length ? '<span class="mate">' + esc(t('crew')) + ': <b>' + esc(mates.join(', ')) + '</b></span>' : '') +
      '</div>' +
      (unsent ? '<div class="pend">↑ ' + unsent + ' ' + esc(unsent === 1 ? t('queued') : t('queuedp')) + '</div>' : '') +
    '</button>';
  }).join('');
  host.querySelectorAll('.job[data-i]').forEach(b => {
    b.onclick = () => openJob(DATA.jobs[+b.dataset.i]);
  });
}

/* ---------------- paint: detail ---------------- */
function openJob(j) {
  OPEN = j;
  paintDetail();
  const s = document.getElementById('sheet');
  s.classList.add('open'); s.setAttribute('aria-hidden', 'false');
}
function closeSheet() {
  const s = document.getElementById('sheet');
  s.classList.remove('open'); s.setAttribute('aria-hidden', 'true');
  OPEN = null; paintList();
}

function paintDetail() {
  const j = OPEN;
  document.getElementById('d_cust').textContent = j.customer;
  document.getElementById('d_wo').textContent = j.number;
  document.getElementById('d_addr').textContent = j.site;
  document.getElementById('d_scope').textContent = es(j.summary, j.summary_es);
  const wait = es(j.waiting_for, j.waiting_for_es);
  document.getElementById('d_wait').innerHTML = wait
    ? '<div class="row" style="margin-top:9px"><span class="pill p-waiting">' +
      esc(t('waiting')) + ': ' + esc(wait) + '</span></div>' : '';

  // Crew. Only his own tap-in state is known to him: another man's
  // visits are not readable, by policy, so no state is shown for them.
  document.getElementById('d_crew').innerHTML = j.crew.map(c => {
    const me = c.id === ME.id;
    return '<div class="man"><span class="av">' + esc(initials(c.name)) + '</span>' +
      '<span>' + esc(c.name) + (me ? ' (' + esc(t('you')) + ')' : '') + '</span>' +
      (me ? '<span class="st' + (j.onsite ? ' on' : '') + '">' + esc(j.onsite ? t('onsite') : t('notin')) + '</span>' : '') +
      '</div>';
  }).join('');

  document.getElementById('d_items').innerHTML = j.items.map((it, i) =>
    '<button class="chk" data-k="' + i + '" aria-pressed="' + (it.done ? 'true' : 'false') + '">' +
    '<span class="box"></span><span class="lbl">' + esc(es(it.body, it.body_es)) + '</span></button>').join('');
  document.querySelectorAll('#d_items .chk').forEach(b => {
    b.onclick = () => {
      const it = j.items[+b.dataset.k];
      it.done = !it.done;
      const now = iso();
      queue({ table: 'scope_item', row_id: it.id, op: 'update', wo: j.id,
              payload: { done: it.done, done_by: it.done ? ME.id : null, done_at: it.done ? now : null } });
      paintDetail();
    };
  });

  paintNotes();
  paintAtts();
  paintFoot();
}

function fmtSecs(s) {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function paintNotes() {
  const j = OPEN;
  document.getElementById('d_notes').innerHTML = j.notes.map(n => {
    const head = '<div class="who">' + esc(n.who) + ' · ' + esc(fmtWhen(n.at)) + '</div>';
    if (n.awaiting_text) {
      return '<div class="note pendingtext">' + head +
        '<div class="txt body">' + esc(t('v_pending')) + '</div>' +
        '<div class="aud">🎤 ' + esc(n.audio_secs ? fmtSecs(n.audio_secs) : t('audio')) + '</div></div>';
    }
    const native = (LANG === n.lang);
    const body = native ? n.original : (n.translated || n.original);
    const foot = native ? ''
      : (n.translated
          ? esc(t('translated_from')) + ' ' + esc(t('lang_' + n.lang)) +
            (n.edited ? ' (' + esc(t('corrected')) + ')' : '') + ': “' + esc(n.original) + '”'
          : esc(t('untranslated')));
    return '<div class="note">' + head +
      '<div class="txt">' + esc(body) + '</div>' +
      (n.audio ? '<div class="aud">🎤 ' + esc(n.audio_secs ? fmtSecs(n.audio_secs) : t('audio')) + '</div>' : '') +
      (foot ? '<div class="orig">' + foot + '</div>' : '') +
      '</div>';
  }).join('');
}

function paintAtts() {
  const j = OPEN;
  document.getElementById('d_atts').innerHTML = j.attachments.map(a => {
    const st = a.state === 'uploaded' ? '<span class="s">' + esc(t('a_sent')) + '</span>'
             : a.state === 'failed'   ? '<span class="s bad">' + esc(t('a_failed')) + '</span>'
             :                          '<span class="s pend">↑ ' + esc(t('a_queued')) + '</span>';
    const label = T.en['k_' + a.kind] ? t('k_' + a.kind) : a.kind;
    return '<div class="att"><span class="k">' + esc(label) + '</span>' +
      (a.caption ? '<span>' + esc(a.caption) + '</span>' : '') +
      '<span class="w">' + esc(fmtWhen(a.at)) + '</span>' + st + '</div>';
  }).join('');
}

function paintFoot() {
  const j = OPEN;
  const foot = document.getElementById('foot');
  if (!j.onsite) {
    foot.innerHTML = '<button class="act go" id="tapin">' + esc(t('in')) + '</button>';
    document.getElementById('tapin').onclick = () => tap('in');
  } else {
    foot.innerHTML = '<div class="two">' +
      '<button class="act ghost" id="tapout">' + esc(t('out')) + '</button>' +
      '<button class="act" id="finish">' + esc(t('close')) + '</button></div>';
    document.getElementById('tapout').onclick = () => tap('out');
    document.getElementById('finish').onclick = openClose;
  }
}

/* ---------------- actions: tap in / out ----------------
   Writes a job_visit row for THIS man only; the insert policy refuses
   any other technician_id. An open visit contributes zero hours until
   it is closed, so a forgotten tap-out can never inflate a job.     */
function tap(dir) {
  const j = OPEN;
  const now = iso();
  if (dir === 'in') {
    const vid = uuid();
    j.onsite = true; j.my_visit = vid;
    queue({ table: 'job_visit', row_id: vid, op: 'insert', wo: j.id,
            payload: { work_order_id: j.id, technician_id: ME.id, arrived_at: now, client_arrived_at: now } });
    if (j.stage === 'scheduled') {
      j.stage = 'in_progress';
      queue({ table: 'work_order', row_id: j.id, op: 'update', wo: j.id,
              payload: { stage: 'in_progress', client_at: now } });
    }
  } else if (j.my_visit) {
    queue({ table: 'job_visit', row_id: j.my_visit, op: 'update', wo: j.id,
            payload: { departed_at: now } });
    j.onsite = false; j.my_visit = null;
  }
  saveSnapshot();
  paintDetail();
}

/* ---------------- voice capture state ---------------- */
const VOICE = { rec: null, chunks: [], sr: null, heard: '', partial: '', started: 0, timer: null, active: false };
const VMAX = 120000;

function onReady(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}

onReady(() => {
  /* typed note */
  document.getElementById('addnote').onclick = () => {
    const box = document.getElementById('notebox');
    const text = box.value.trim();
    if (!text || !OPEN) return;
    const id = uuid(), now = iso();
    OPEN.notes.push({ id, author_id: ME.id, who: ME.full_name, at: now, lang: LANG,
                      original: text, translated: null, local: true });
    queue({ table: 'note', row_id: id, op: 'insert', wo: OPEN.id,
            payload: { work_order_id: OPEN.id, author_id: ME.id, source: 'typed',
                       original_lang: LANG, original_body: text, transcribe_state: 'done',
                       client_created_at: now } });
    box.value = '';
    paintNotes();
  };

  /* ---------------- voice capture ----------------
     Two things happen at once when he holds the button:
       1. MediaRecorder captures audio to a local blob. Always works.
       2. SpeechRecognition tries to transcribe live. Needs network.
     If (2) fails the note is still real: it carries audio and gets
     its text server-side when the phone next has signal.          */
  function vSupported() { return !!(navigator.mediaDevices && window.MediaRecorder); }
  function srCtor() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; }

  async function voiceStart() {
    if (!OPEN || VOICE.active || VOICE.arming) return;
    if (!vSupported()) { toast(t('v_nomic')); return; }
    VOICE.arming = true; VOICE.released = false;
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) {
      VOICE.arming = false;
      toast(e && e.name === 'NotAllowedError' ? t('v_denied') : t('v_nomic'));
      return;
    }
    VOICE.arming = false;
    VOICE.active = true; VOICE.chunks = []; VOICE.heard = ''; VOICE.partial = ''; VOICE.started = Date.now();
    try { VOICE.rec = new MediaRecorder(stream); }
    catch (e) { VOICE.rec = new MediaRecorder(stream, { mimeType: 'audio/webm' }); }
    VOICE.rec.ondataavailable = ev => { if (ev.data && ev.data.size) VOICE.chunks.push(ev.data); };
    VOICE.rec.onstop = () => { stream.getTracks().forEach(tr => tr.stop()); voiceFinish(); };
    VOICE.rec.start();

    const SR = srCtor();
    if (SR) {
      const sr = new SR();
      sr.lang = LANG === 'es' ? 'es-US' : 'en-US';
      sr.continuous = true; sr.interimResults = true;
      sr.onresult = ev => {
        let fin = '', part = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) fin += r[0].transcript; else part += r[0].transcript;
        }
        if (fin) VOICE.heard += fin;
        VOICE.partial = part;
        vPaint();
      };
      sr.onerror = () => { VOICE.sr = null; vPaint(); };
      sr.onend = () => { if (VOICE.active && VOICE.sr) { try { sr.start(); } catch (e) {} } };
      try { sr.start(); VOICE.sr = sr; } catch (e) { VOICE.sr = null; }
    }
    vOpen();
    if (VOICE.released) { voiceStop(); return; }
    VOICE.timer = setInterval(() => {
      if (Date.now() - VOICE.started > VMAX) { voiceStop(); return; }
      vPaint();
    }, 200);
  }

  function voiceStop() {
    if (VOICE.arming) { VOICE.released = true; return; }
    if (!VOICE.active) return;
    VOICE.active = false;
    clearInterval(VOICE.timer);
    if (VOICE.sr) { try { VOICE.sr.stop(); } catch (e) {} VOICE.sr = null; }
    if (VOICE.rec && VOICE.rec.state !== 'inactive') VOICE.rec.stop();
    else voiceFinish();
  }

  function voiceFinish() {
    const secs = Math.round((Date.now() - VOICE.started) / 1000);
    const text = (VOICE.heard + ' ' + VOICE.partial).trim();
    const blob = VOICE.chunks.length
      ? new Blob(VOICE.chunks, { type: (VOICE.rec && VOICE.rec.mimeType) || 'audio/webm' })
      : null;
    vClose();
    if (!blob && !text) { toast(t('v_nothing')); return; }
    if (secs < 1 && !text) { toast(t('v_short')); return; }
    if (!OPEN) return;

    const id = uuid(), now = iso();
    const pendingText = !text;
    // The audio's storage key is decided now, so the note row can
    // point at it before the bytes arrive. note_has_content is
    // satisfied either by words or by that path; never neither.
    const path = blob ? OPEN.id + '/audio/' + id + '.' + extFor(blob.type) : null;

    OPEN.notes.push({ id, author_id: ME.id, who: ME.full_name, at: now, lang: LANG,
      original: text || null, translated: null, audio_secs: secs, audio: !!blob,
      awaiting_text: pendingText, local: true });

    queue({ table: 'note', row_id: id, op: 'insert', wo: OPEN.id,
      payload: { work_order_id: OPEN.id, author_id: ME.id, source: 'voice',
                 original_lang: LANG, original_body: text || null,
                 transcribe_state: pendingText ? 'pending' : 'done',
                 audio_path: path, client_created_at: now },
      blob: blob, blob_path: path, blob_type: blob ? blob.type : null });

    paintNotes();
    toast(pendingText ? t('v_saved_nowords') : t('v_saved'));
  }

  const vb = document.getElementById('voice');
  vb.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { vb.setPointerCapture(e.pointerId); } catch (err) {}
    voiceStart();
  });
  vb.addEventListener('pointerup', e => {
    e.preventDefault();
    try { vb.releasePointerCapture(e.pointerId); } catch (err) {}
    voiceStop();
  });
  vb.addEventListener('pointercancel', () => voiceStop());

  /* ---------------- photos ----------------
     The file is shrunk on the phone to ~1600px before it is queued.
     Skipping this multiplies storage roughly tenfold. Row first, file
     after: the office sees a receipt exists while the bytes catch up. */
  const fileInput = document.getElementById('photofile');
  let PHOTO = null;
  document.getElementById('photo').onclick = () => {
    if (!OPEN) return;
    fileInput.value = '';
    fileInput.click();
  };
  fileInput.onchange = () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f || !OPEN) return;
    PHOTO = f;
    openModal('kindmodal');
  };
  document.querySelectorAll('#kindmodal .opt').forEach(b => {
    b.onclick = async () => {
      const kind = b.dataset.k;
      shutModal('kindmodal');
      const f = PHOTO; PHOTO = null;
      if (!f || !OPEN) return;
      const job = OPEN;
      const blob = await shrinkImage(f);
      const id = uuid(), now = iso();
      const path = job.id + '/' + kind + '/' + id + '.' + extFor(blob.type, f.name);
      job.attachments.push({ id, kind, caption: null, at: now, state: 'pending', local: true });
      queue({ table: 'attachment', row_id: id, op: 'insert', wo: job.id,
        payload: { work_order_id: job.id, kind: kind, storage_path: path, uploaded_by: ME.id,
                   upload_status: 'pending', client_created_at: now },
        blob: blob, blob_path: path, blob_type: blob.type });
      if (OPEN === job) paintAtts();
    };
  });
  document.getElementById('k_cancel').onclick = () => { PHOTO = null; shutModal('kindmodal'); };

  /* ---------------- sign-in / account ---------------- */
  document.getElementById('sform').onsubmit = e => {
    e.preventDefault();
    signIn(document.getElementById('s_email').value, document.getElementById('s_pass').value);
  };
  document.getElementById('l_en').onclick = () => setLang('en');
  document.getElementById('l_es').onclick = () => setLang('es');

  document.getElementById('who').onclick = () => {
    if (!ME) return;
    document.getElementById('a_name').textContent = ME.full_name;
    const n = pending().length;
    document.getElementById('a_sub').textContent = (n ? '↑ ' + n + ' ' + (n === 1 ? t('queued') : t('queuedp')) + ' · ' : '') +
      (DATA.pulled_at ? t('updated') + ' ' + fmtTime(DATA.pulled_at) : '');
    openModal('acctmodal');
  };
  document.getElementById('a_cancel').onclick = () => shutModal('acctmodal');
  document.getElementById('a_refresh').onclick = async () => {
    shutModal('acctmodal'); await flush(); await pullJobs(); paintHeader();
  };
  document.getElementById('a_signout').onclick = () => { shutModal('acctmodal'); signOut(); };

  document.getElementById('fail').onclick = async () => {
    const f = failedList();
    if (!f.length) return;
    const detail = f.slice(0, 3).map(c => c.table_name + ': ' + (c.error || '?')).join('\n');
    if (window.confirm(t('discard_failed').replace('%s', f.length) + '\n\n' + detail)) {
      for (const c of f) await dropChange(c);
      paintNet(); paintList();
    }
  };

  document.getElementById('back').onclick = closeSheet;
  document.getElementById('s_en').onclick = () => setLang('en');
  document.getElementById('s_es').onclick = () => setLang('es');
  document.getElementById('en').onclick = () => setLang('en');
  document.getElementById('es').onclick = () => setLang('es');

  wireClose();
  boot();
});

function extFor(mime, name) {
  const m = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
              'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg',
              'audio/wav': 'wav', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac' };
  const base = String(mime || '').split(';')[0].trim();
  if (m[base]) return m[base];
  const fromName = name && /\.([a-z0-9]{2,5})$/i.exec(name);
  return fromName ? fromName[1].toLowerCase() : 'bin';
}

async function shrinkImage(file, max = 1600, quality = 0.82) {
  try {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { bmp = await createImageBitmap(file); }
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const out = await new Promise(res => c.toBlob(res, 'image/jpeg', quality));
    return out || file;
  } catch (e) {
    return file;   // a format the phone cannot decode: send it as-is rather than lose it
  }
}

/* ---------------- modals ---------------- */
function openModal(id) { const m = document.getElementById(id); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); }
function shutModal(id) { const m = document.getElementById(id); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }

/* ---------------- closeout + signature ---------------- */
function openClose() {
  // The signoff row needs a signer name when signed. Start it with the
  // customer's name so one tap is enough; he can change it to the person.
  document.getElementById('signer').value = OPEN ? OPEN.customer : '';
  document.getElementById('pad').style.borderColor = '';
  openModal('closemodal');
  setupPad();
}

let padCtx = null, padDrawn = false;
function setupPad() {
  const c = document.getElementById('pad');
  const r = c.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.max(1, r.width * dpr);
  c.height = Math.max(1, r.height * dpr);
  padCtx = c.getContext('2d');
  padCtx.scale(dpr, dpr);
  padCtx.lineWidth = 2.4; padCtx.lineCap = 'round';
  padCtx.strokeStyle = '#0E151C';
  padDrawn = false;
  let drawing = false;
  const pt = e => {
    const b = c.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return [s.clientX - b.left, s.clientY - b.top];
  };
  const down = e => { drawing = true; padDrawn = true; const [x, y] = pt(e); padCtx.beginPath(); padCtx.moveTo(x, y); e.preventDefault(); };
  const move = e => { if (!drawing) return; const [x, y] = pt(e); padCtx.lineTo(x, y); padCtx.stroke(); e.preventDefault(); };
  const up = () => { drawing = false; };
  c.onmousedown = down; c.onmousemove = move; c.onmouseup = up; c.onmouseleave = up;
  c.ontouchstart = down; c.ontouchmove = move; c.ontouchend = up;
}

function wireClose() {
  document.getElementById('cl_cancel').onclick = () => shutModal('closemodal');
  document.getElementById('rs_cancel').onclick = () => shutModal('reasonmodal');

  document.getElementById('cl_sign').onclick = () => {
    if (!padDrawn) { document.getElementById('pad').style.borderColor = '#9B1C1C'; return; }
    const j = OPEN;
    const name = document.getElementById('signer').value.trim() || j.customer;
    const now = iso();
    const path = j.id + '/signature/' + uuid() + '.png';
    document.getElementById('pad').toBlob(blob => {
      queue({ table: 'work_order_signoff', row_id: j.id, op: 'upsert', wo: j.id,
        payload: { signed_at: now, signer_name: name, signature_path: path, channel: 'on_site' },
        blob: blob, blob_path: path, blob_type: 'image/png' });
      finishJob(j);
    }, 'image/png');
    shutModal('closemodal');
  };

  // The signature never gates closeout. The customer is often not home
  // and the man still has to leave the site with the job closed.
  document.getElementById('cl_nosig').onclick = () => { shutModal('closemodal'); openModal('reasonmodal'); };

  document.querySelectorAll('#reasonmodal .opt').forEach(b => {
    b.onclick = () => {
      const j = OPEN;
      queue({ table: 'work_order_signoff', row_id: j.id, op: 'upsert', wo: j.id,
              payload: { no_signature: b.dataset.r } });
      finishJob(j);
      shutModal('reasonmodal');
    };
  });
}

function finishJob(j) {
  const now = iso();
  if (j.onsite && j.my_visit) {
    queue({ table: 'job_visit', row_id: j.my_visit, op: 'update', wo: j.id, payload: { departed_at: now } });
    j.onsite = false; j.my_visit = null;
  }
  j.stage = 'completed_review';
  queue({ table: 'work_order', row_id: j.id, op: 'update', wo: j.id,
          payload: { stage: 'completed_review', client_at: now } });
  DATA.jobs = DATA.jobs.filter(x => x.id !== j.id);
  saveSnapshot();
  if (OPEN === j) closeSheet(); else paintList();
  toast(t('done'));
}

/* ---------------- toast ---------------- */
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('on'), 3200);
}

/* ---------------- network banner ---------------- */
function paintNet() {
  const n = pending().length, f = failedList().length;
  document.getElementById('queued').textContent =
    n ? ('— ' + n + ' ' + (n === 1 ? t('queued') : t('queuedp'))) : '';
  document.querySelector('#net span[data-t]').textContent = t('offline');
  const fb = document.getElementById('fail');
  fb.hidden = !f;
  fb.textContent = f ? ('✕ ' + f + ' ' + (f === 1 ? t('failed1') : t('failedp'))) : '';
}
window.addEventListener('online',  () => { document.body.classList.remove('offline'); paintNet(); flush(); pullJobs(); });
window.addEventListener('offline', () => { document.body.classList.add('offline'); paintNet(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ME) { flush(); pullJobs(); }
});

/* Demo control: long-press or double-tap the avatar to fake losing
   signal, so the queue can be shown without driving somewhere with
   no bars.                                                          */
function wireOfflineToggle() {
  const me = document.getElementById('me');
  let timer = null;
  const toggle = () => {
    document.body.classList.toggle('offline');
    if (!document.body.classList.contains('offline')) { flush(); pullJobs(); }
    paintNet(); paintList();
  };
  const start = () => { timer = setTimeout(toggle, 700); };
  const stop = () => clearTimeout(timer);
  me.onmousedown = start; me.onmouseup = stop; me.onmouseleave = stop;
  me.ontouchstart = start; me.ontouchend = stop;
  me.ondblclick = toggle;
}

/* ---------------- boot ---------------- */
async function boot() {
  await storeInit();
  SNAP = await loadSnapshot();
  if (!navigator.onLine) document.body.classList.add('offline');
  wireOfflineToggle();
  paintLang();
  await authInit();
}

/* ---------------- recording overlay ---------------- */
function vOpen() {
  let el = document.getElementById('vsheet');
  if (!el) {
    el = document.createElement('div');
    el.id = 'vsheet';
    el.innerHTML =
      '<div class="vbox">' +
        '<div class="vdot"></div>' +
        '<div class="vtime" id="vtime">0:00</div>' +
        '<div class="vnet" id="vnet"></div>' +
        '<div class="vtext" id="vtext"></div>' +
        '<div class="vhint" id="vhint"></div>' +
      '</div>';
    document.body.appendChild(el);
  }
  el.classList.add('on');
  vPaint();
}
function vClose() {
  const el = document.getElementById('vsheet');
  if (el) el.classList.remove('on');
}
function vPaint() {
  if (!VOICE.active) return;
  const secs = Math.floor((Date.now() - VOICE.started) / 1000);
  const left = Math.max(0, Math.round((VMAX / 1000) - secs));
  const tm = document.getElementById('vtime');
  if (tm) tm.textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
  const net = document.getElementById('vnet');
  if (net) {
    const live = !!VOICE.sr;
    net.textContent = live ? '' : t('v_nolive');
    net.className = 'vnet' + (live ? '' : ' warn');
  }
  const txt = document.getElementById('vtext');
  if (txt) {
    const shown = (VOICE.heard + ' ' + VOICE.partial).trim();
    txt.textContent = shown || (VOICE.sr ? t('v_listening') : t('v_recording'));
    txt.className = 'vtext' + (shown ? '' : ' dim');
  }
  const h = document.getElementById('vhint');
  if (h) h.textContent = left <= 15 ? t('v_left').replace('%s', left) : t('v_release');
}
