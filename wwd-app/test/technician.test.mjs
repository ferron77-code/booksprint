/* End-to-end check of the technician app against a MOCKED Supabase.

   Every request the app makes to the Supabase host is intercepted and
   answered here, and recorded. The assertions are about the wiring:
   the right endpoint, the right columns, the right headers, the right
   order, offline behaviour, retry and refusal handling. They say
   nothing about RLS — that is verified against the live project by
   signing in as Cheo (see WIRING.md).

   Run:  node test/technician.test.mjs
   Needs Playwright with Chromium (NODE_PATH may need to point at the
   global node_modules).                                              */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Playwright may be installed locally or globally (NODE_PATH); take either.
const req = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = req('playwright')); }
catch (e) { ({ chromium } = createRequire((process.env.NODE_PATH || '/usr/lib/node_modules') + '/')('playwright')); }

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(here, '..', 'technician');
const HOST = 'https://sdjheotlpvvkdovrccol.supabase.co';

/* ---- ids the mock and the assertions share ---- */
const CHEO = { id: '11111111-1111-4111-8111-111111111111', auth: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
               full_name: 'Jose Nodal', short_name: 'Cheo', role: 'technician', preferred_lang: 'es' };
const TONY = { id: '22222222-2222-4222-8222-222222222222', full_name: 'Tony Cabote', short_name: 'Tony', role: 'technician' };
const WO1 = '99920000-0000-0000-0000-000000000001';
const WO2 = '99920000-0000-0000-0000-000000000002';
const ITEM1 = '33333333-3333-4333-8333-333333333331';
const ITEM2 = '33333333-3333-4333-8333-333333333332';

const jobs = () => [
  { id: WO1, number: 'WO-9001', division: 'elighting', stage: 'scheduled',
    summary: 'Replace six pole heads at main entrance', summary_es: 'Reemplazar seis cabezales',
    waiting_reason: null, waiting_reason_es: null, expected_date: null, high_priority: true,
    opened_on: '2026-09-13', updated_at: '2026-09-16T10:00:00Z',
    customer: { name: 'TEST — Palms Ridge HOA' },
    site: { label: 'Main entrance', address_line: '1420 Palms Ridge Dr', city: 'Homestead' },
    scope_item: [
      { id: ITEM2, position: 2, body: 'Replace six pole heads', body_es: 'Reemplazar seis cabezales de poste', done: false },
      { id: ITEM1, position: 1, body: 'Confirm circuit is dead at the panel', body_es: null, done: false } ],
    work_order_assignment: [ { technician_id: CHEO.id, unassigned_at: null } ],
    note: [ { id: '44444444-4444-4444-8444-444444444441', author_id: CHEO.id, source: 'typed', original_lang: 'es',
              original_body: 'Dos de los seis postes tienen el cableado dañado.', translated_body: 'Two of the six poles have damaged wiring.',
              translation_edited: false, translate_state: 'done', transcribe_state: 'done', audio_path: null,
              created_at: '2026-09-16T09:40:00Z', client_created_at: null } ],
    attachment: [], job_visit: [] },
  { id: WO2, number: 'WO-9002', division: 'elighting', stage: 'waiting_on_product',
    summary: 'Pool deck fixtures — retrofit to LED', summary_es: null,
    waiting_reason: 'Waiting on 12 x 40W LED retrofit kits', waiting_reason_es: 'Esperando 12 kits LED',
    expected_date: '2026-09-21', high_priority: false, opened_on: '2026-09-02', updated_at: '2026-09-16T10:00:00Z',
    customer: { name: 'TEST — Palms Ridge HOA' },
    site: { label: 'Pool deck', address_line: '1420 Palms Ridge Dr', city: 'Homestead' },
    scope_item: [], work_order_assignment: [ { technician_id: CHEO.id, unassigned_at: null }, { technician_id: TONY.id, unassigned_at: null } ],
    note: [ { id: '44444444-4444-4444-8444-444444444442', author_id: TONY.id, source: 'voice', original_lang: 'es',
              original_body: null, translated_body: null, translation_edited: false, translate_state: 'pending',
              transcribe_state: 'pending', audio_path: WO2 + '/audio/x.webm', created_at: '2026-09-16T08:00:00Z', client_created_at: null } ],
    attachment: [ { id: '55555555-5555-4555-8555-555555555551', kind: 'receipt', caption: null, storage_path: WO2 + '/receipt/a.jpg',
                    upload_status: 'uploaded', created_at: '2026-09-15T12:00:00Z', client_created_at: null } ],
    job_visit: [] }
];

/* ---- a JWT-shaped token so supabase-js accepts the session ---- */
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = () => b64({ alg: 'HS256', typ: 'JWT' }) + '.' +
  b64({ sub: CHEO.auth, aud: 'authenticated', role: 'authenticated', email: 'cheo@wwdi.local',
        exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) }) + '.sig';

/* ---- static server for technician/ ---- */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
  const f = path.join(APP, p);
  if (!f.startsWith(APP) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://127.0.0.1:' + server.address().port;

/* ---- the mock ---- */
const log = [];                 // every request to the Supabase host
const scripted = [];            // one-shot overrides: { match(req) -> response | null }
let jobsNow = jobs();

function mockRoute(route) {
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  let body = null;
  try { body = req.postDataJSON(); } catch (e) { body = req.postData(); }
  const entry = { method, path: url.pathname + url.search, headers: req.headers(), body };
  log.push(entry);

  for (let i = 0; i < scripted.length; i++) {
    const r = scripted[i].match(entry);
    if (r) { scripted.splice(i, 1); return r === 'abort' ? route.abort('connectionfailed') : route.fulfill(r); }
  }

  const json = (status, obj) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(obj) });
  const empty = status => route.fulfill({ status, body: '' });
  const p = url.pathname;
  const idOf = () => (url.searchParams.get('id') || '').replace('eq.', '');
  const jobOf = id => jobsNow.find(j => j.id === id);
  const LIVE = ['scheduled', 'in_progress', 'waiting_on_product'];

  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (p === '/auth/v1/token') {
    if (body && body.password === 'test-pass-0000' && body.email === 'cheo@wwdi.local') {
      return json(200, { access_token: token(), token_type: 'bearer', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r1',
        user: { id: CHEO.auth, aud: 'authenticated', role: 'authenticated', email: 'cheo@wwdi.local',
                app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-09-16T00:00:00Z' } });
    }
    return json(400, { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials', msg: 'Invalid login credentials' });
  }
  if (p === '/auth/v1/user') return json(200, { id: CHEO.auth, aud: 'authenticated', role: 'authenticated', email: 'cheo@wwdi.local' });
  if (p === '/auth/v1/logout') return empty(204);
  if (p === '/rest/v1/app_user') {
    if (url.searchParams.get('auth_id')) return json(200, [Object.assign({ auth_id: CHEO.auth }, CHEO)]);
    return json(200, [CHEO, TONY]);
  }
  // The fake remembers what it is told, like the real thing, so a refresh
  // after a send shows the change rather than erasing it.
  if (p === '/rest/v1/work_order' && method === 'GET') return json(200, jobsNow.filter(j => LIVE.includes(j.stage)));
  if (p === '/rest/v1/note' && method === 'POST') {
    const j = jobOf(body.work_order_id);
    if (j) j.note.push(Object.assign({ translated_body: null, translation_edited: false, translate_state: 'pending',
                                       created_at: new Date().toISOString() }, body));
    return empty(201);
  }
  if (p === '/rest/v1/attachment' && method === 'POST') {
    const j = jobOf(body.work_order_id);
    if (j) j.attachment.push(Object.assign({ caption: null, created_at: new Date().toISOString() }, body));
    return empty(201);
  }
  if (p === '/rest/v1/attachment' && method === 'PATCH') {
    for (const j of jobsNow) for (const a of j.attachment) if (a.id === idOf()) Object.assign(a, body);
    return empty(204);
  }
  if (p === '/rest/v1/scope_item' && method === 'PATCH') {
    for (const j of jobsNow) for (const it of j.scope_item) if (it.id === idOf()) Object.assign(it, body);
    return empty(204);
  }
  if (p === '/rest/v1/job_visit' && method === 'POST') {
    const j = jobOf(body.work_order_id);
    if (j) j.job_visit.push(Object.assign({ departed_at: null }, body));
    return empty(201);
  }
  if (p === '/rest/v1/job_visit' && method === 'PATCH') {
    for (const j of jobsNow) for (const v of j.job_visit) if (v.id === idOf()) Object.assign(v, body);
    return empty(204);
  }
  if (p === '/rest/v1/rpc/apply_synced_stage') {
    const j = jobOf(body.wo); if (j) j.stage = body.incoming;
    return json(200, body.incoming);
  }
  if (p === '/rest/v1/rpc/apply_synced_signoff') return empty(204);
  if (p.startsWith('/storage/v1/object/wwd/')) return json(200, { Key: 'wwd/' + p.slice('/storage/v1/object/wwd/'.length), Id: 'x' });
  console.error('UNMOCKED', method, p);
  return json(404, { message: 'unmocked ' + method + ' ' + p });
}

/* ---- tiny test harness ---- */
let failures = 0, passes = 0;
function ok(cond, name, extra) {
  if (cond) { passes++; console.log('  ok   ' + name); }
  else { failures++; console.log('  FAIL ' + name + (extra !== undefined ? '  | ' + JSON.stringify(extra) : '')); }
}
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, { got: a, want: b });
const find = (method, prefix) => log.filter(e => e.method === method && e.path.startsWith(prefix));
const since = (n, method, prefix) => log.slice(n).filter(e => e.method === method && e.path.startsWith(prefix));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function settle(page, ms = 900) { await sleep(ms); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: false });
await ctx.route(HOST + '/**', mockRoute);
// Serve a filled-in config so the app talks to the mocked host.
await ctx.route('**/config.js', route => route.fulfill({ contentType: 'text/javascript',
  body: `window.WWD = { SUPABASE_URL: '${HOST}', SUPABASE_ANON_KEY: 'test-anon-key', BUCKET: 'wwd' };` }));
// The demo offline toggle is a body class, not persisted. To reload
// "in a basement" the test asks the page to start offline via a flag.
await ctx.addInitScript(() => {
  try {
    if (localStorage.getItem('test.offline') === '1')
      document.addEventListener('DOMContentLoaded', () => document.body.classList.add('offline'));
  } catch (e) {}
});
const page = await ctx.newPage();
page.on('pageerror', e => { console.log('  PAGE ERROR', e.message); failures++; });
page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts/.test(m.text())) console.log('  console.error: ' + m.text()); });
page.on('dialog', d => d.accept());

try {
  console.log('\n-- sign-in');
  await page.goto(ORIGIN + '/');
  await page.waitForSelector('#signin:not([hidden])');
  ok(true, 'sign-in screen shown before any session');
  await page.fill('#s_email', 'CHEO@wwdi.local ');
  await page.fill('#s_pass', 'wrong');
  await page.click('#s_go');
  await page.waitForSelector('#s_err:not([hidden])');
  ok((await page.textContent('#s_err')).includes('Wrong'), 'bad password gives a plain message');
  eq(find('POST', '/auth/v1/token')[0].body.email, 'cheo@wwdi.local', 'email is trimmed and lowercased');

  await page.fill('#s_pass', 'test-pass-0000');
  await page.click('#s_go');
  await page.waitForSelector('#signin[hidden]', { state: 'attached' });
  await page.waitForSelector('.job[data-i]');
  ok(true, 'signed in, job list painted');
  const rosterReq = find('GET', '/rest/v1/app_user?')[0];
  ok(!!rosterReq && /^Bearer /.test(rosterReq.headers.authorization), 'roster requested with the session');
  const woReq = find('GET', '/rest/v1/work_order')[0];
  ok(!!woReq, 'work orders requested');
  ok(/^Bearer /.test(woReq.headers.authorization) && woReq.headers.apikey === 'test-anon-key', 'requests carry the session token and anon key');
  ok(decodeURIComponent(woReq.path).includes('stage=in.(scheduled,in_progress,waiting_on_product)'), 'only live stages requested');
  ok(!/price|invoice|paid|cost|amount/i.test(decodeURIComponent(woReq.path).replace('invoiced', '')), 'no money column is asked for');
  ok(!/invoiced|paid/.test(decodeURIComponent(woReq.path)), 'invoiced/paid flags not asked for');

  const cards = await page.$$eval('.job[data-i] .wo', els => els.map(e => e.textContent));
  eq(cards, ['WO-9001', 'WO-9002'], 'both jobs listed, priority first');
  ok((await page.textContent('#myname')) === 'Jose Nodal', 'header shows the roster name');
  ok((await page.textContent('#me')) === 'C', 'avatar uses the short name (Cheo)');
  eq(await page.getAttribute('#es', 'aria-pressed'), 'true', 'first sign-in adopts preferred_lang (es)');
  ok((await page.textContent('.job[data-i] .scope')).includes('Reemplazar'), 'Spanish summary shown when it exists');
  ok((await page.$eval('.job[data-i="1"] .mate', e => e.textContent)).includes('Tony'), 'crew mate shown by short name');

  console.log('\n-- open a job (switch to English)');
  await page.click('#en');
  await page.click('.job[data-i="0"]');
  await page.waitForSelector('#sheet.open');
  const items = await page.$$eval('#d_items .lbl', els => els.map(e => e.textContent));
  eq(items, ['Confirm circuit is dead at the panel', 'Replace six pole heads'], 'scope items sorted by position');
  ok((await page.textContent('#d_notes')).includes('Two of the six poles'), 'note shown translated for an English reader');
  ok((await page.textContent('#d_notes')).includes('Translated from Spanish'), 'original attributed under it');
  ok((await page.textContent('#d_crew')).includes('(you)'), 'crew list marks him');
  ok(await page.$('#tapin') !== null, 'not on site: tap-in offered');

  console.log('\n-- tick a scope item');
  let n = log.length;
  await page.click('#d_items .chk[data-k="0"]');
  await settle(page);
  const patch = since(n, 'PATCH', '/rest/v1/scope_item')[0];
  ok(!!patch, 'scope_item updated on the server');
  ok(patch && patch.path.includes('id=eq.' + ITEM1), 'by its own id');
  ok(patch && patch.body.done === true && patch.body.done_by === CHEO.id && typeof patch.body.done_at === 'string', 'done, done_by, done_at sent');
  eq(await page.getAttribute('#d_items .chk[data-k="0"]', 'aria-pressed'), 'true', 'box shows ticked');

  console.log('\n-- type a note');
  n = log.length;
  await page.fill('#notebox', 'Panel is <b>dead</b> & tagged');
  await page.click('#addnote');
  await settle(page);
  const noteReq = since(n, 'POST', '/rest/v1/note')[0];
  ok(!!noteReq, 'note inserted');
  ok(noteReq && noteReq.body.work_order_id === WO1 && noteReq.body.author_id === CHEO.id, 'note carries job and author');
  ok(noteReq && noteReq.body.original_lang === 'en' && noteReq.body.original_body === 'Panel is <b>dead</b> & tagged', 'original kept verbatim');
  ok(noteReq && /^[0-9a-f-]{36}$/.test(noteReq.body.id) && noteReq.body.source === 'typed', 'id made on the phone');
  ok((await page.innerHTML('#d_notes')).includes('&lt;b&gt;dead&lt;/b&gt; &amp; tagged'), 'note text is escaped on screen');
  ok((await page.textContent('#d_notes')).includes('Jose Nodal · Just now'), 'own note attributed to him');

  console.log('\n-- tap in on a scheduled job');
  n = log.length;
  await page.click('#tapin');
  await settle(page);
  const visit = since(n, 'POST', '/rest/v1/job_visit')[0];
  ok(!!visit && visit.body.technician_id === CHEO.id && visit.body.work_order_id === WO1 && visit.body.arrived_at, 'job_visit inserted for himself');
  const stage = since(n, 'POST', '/rest/v1/rpc/apply_synced_stage')[0];
  ok(!!stage && stage.body.wo === WO1 && stage.body.incoming === 'in_progress' && stage.body.client_at, 'stage moved forward through apply_synced_stage');
  ok(log.indexOf(visit) < log.indexOf(stage), 'visit lands before the stage change');
  ok(await page.$('#tapout') !== null && await page.$('#finish') !== null, 'on site: tap-out and finish offered');
  ok((await page.textContent('.job[data-i="0"] .pill')) === 'On site', 'list shows on site');

  console.log('\n-- photo, shrunk and uploaded after its row');
  n = log.length;
  const png = await page.screenshot({ type: 'png' });
  await page.setInputFiles('#photofile', { name: 'IMG_4102.png', mimeType: 'image/png', buffer: png });
  await page.waitForSelector('#kindmodal.open');
  await page.click('#kindmodal .opt[data-k="receipt"]');
  await settle(page, 1500);
  const attIns = since(n, 'POST', '/rest/v1/attachment')[0];
  ok(!!attIns && attIns.body.kind === 'receipt' && attIns.body.uploaded_by === CHEO.id && attIns.body.upload_status === 'pending', 'attachment row inserted pending');
  const up = since(n, 'POST', '/storage/v1/object/wwd/')[0];
  ok(!!up, 'file uploaded to the wwd bucket');
  ok(up && attIns && up.path === '/storage/v1/object/wwd/' + attIns.body.storage_path, 'to the path the row names');
  ok(attIns && attIns.body.storage_path.startsWith(WO1 + '/receipt/') && attIns.body.storage_path.endsWith('.jpg'), 'path is <job>/<kind>/<id>.jpg');
  ok(up && up.headers['x-upsert'] === 'true', 'upload is an upsert so a retry replaces, not fails');
  const attDone = since(n, 'PATCH', '/rest/v1/attachment')[0];
  ok(!!attDone && attDone.body.upload_status === 'uploaded' && attDone.body.uploaded_at, 'row marked uploaded after the bytes');
  ok(log.indexOf(attIns) < log.indexOf(up) && log.indexOf(up) < log.indexOf(attDone), 'row, then file, then mark');
  const shrunk = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 4000; c.height = 3000;
    const big = await new Promise(r => c.toBlob(r, 'image/png'));
    const out = await shrinkImage(big);
    const bmp = await createImageBitmap(out);
    return { w: bmp.width, h: bmp.height, type: out.type };
  });
  eq(shrunk, { w: 1600, h: 1200, type: 'image/jpeg' }, 'a 4000px photo is shrunk to 1600px JPEG on the phone');

  console.log('\n-- offline: everything queues, nothing is sent, screen updates');
  await page.click('#back');
  await page.dblclick('#me');
  await page.waitForSelector('body.offline');
  await page.click('.job[data-i="0"]');
  await page.waitForSelector('#sheet.open');
  n = log.length;
  await page.fill('#notebox', 'Written in the basement');
  await page.click('#addnote');
  await page.click('#d_items .chk[data-k="1"]');
  await page.click('#d_items .chk[data-k="1"]');
  await page.click('#d_items .chk[data-k="1"]');
  await settle(page);
  eq(log.length, n, 'no request left the phone while offline');
  ok((await page.textContent('#queued')).includes('2 changes'), 'banner counts 2 queued (note + one coalesced tick)', await page.textContent('#queued'));
  ok((await page.textContent('#d_notes')).includes('Written in the basement'), 'note is on screen immediately');

  console.log('\n-- reload while offline: queue and jobs survive');
  await page.evaluate(() => localStorage.setItem('test.offline', '1'));
  await page.reload();
  await page.waitForSelector('.job[data-i]');
  await page.evaluate(() => localStorage.removeItem('test.offline'));
  ok(await page.$('#signin[hidden]') !== null, 'session persisted, no sign-in prompt');
  ok(await page.$('body.offline') !== null, 'started offline');
  ok((await page.textContent('#queued')).includes('2 changes'), 'queue restored from disk after reload', await page.textContent('#queued'));
  await page.click('.job[data-i="0"]');
  await page.waitForSelector('#sheet.open');
  ok((await page.textContent('#d_notes')).includes('Written in the basement'), 'unsent note overlaid on the cached job');
  eq(await page.getAttribute('#d_items .chk[data-k="1"]', 'aria-pressed'), 'true', 'unsent tick overlaid too');
  ok(await page.$('#tapout') !== null, 'still shown as on site from the cached visit');

  console.log('\n-- back online: queue drains in order');
  n = log.length;
  await page.evaluate(() => { document.body.classList.remove('offline'); window.dispatchEvent(new Event('online')); });
  await settle(page, 1500);
  const drained = log.slice(n).filter(e => e.method !== 'GET' && e.method !== 'OPTIONS').map(e => e.method + ' ' + e.path.split('?')[0]);
  eq(drained, ['POST /rest/v1/note', 'PATCH /rest/v1/scope_item'], 'note then coalesced tick, one request each');
  const tick2 = since(n, 'PATCH', '/rest/v1/scope_item')[0];
  ok(tick2 && tick2.body.done === true, 'coalesced tick sends the final state (done)');
  ok(since(n, 'GET', '/rest/v1/work_order').length >= 1, 'refreshed from the server after sending');
  eq(await page.textContent('#queued'), '', 'queue empty');

  console.log('\n-- a duplicate from a retry is treated as delivered');
  n = log.length;
  scripted.push({ match: e => e.method === 'POST' && e.path.startsWith('/rest/v1/note')
    ? { status: 409, contentType: 'application/json', body: JSON.stringify({ code: '23505', message: 'duplicate key value violates unique constraint "note_pkey"', details: null, hint: null }) } : null });
  await page.fill('#notebox', 'Retried note');
  await page.click('#addnote');
  await settle(page);
  eq(since(n, 'POST', '/rest/v1/note').length, 1, 'sent once');
  eq(await page.textContent('#queued'), '', 'and dropped from the queue');
  ok(await page.$('#fail[hidden]') !== null, 'not counted as a failure');

  console.log('\n-- a refusal by policy does not block the queue');
  n = log.length;
  scripted.push({ match: e => e.method === 'PATCH' && e.path.startsWith('/rest/v1/scope_item')
    ? { status: 403, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'new row violates row-level security policy for table "scope_item"', details: null, hint: null }) } : null });
  await page.click('#d_items .chk[data-k="0"]');
  await settle(page);
  await page.fill('#notebox', 'After the refusal');
  await page.click('#addnote');
  await settle(page);
  ok(await page.$('#fail:not([hidden])') !== null, 'red bar shows the refused change');
  ok((await page.textContent('#fail')).includes('1 change could not be sent'), 'with a count');
  eq(since(n, 'POST', '/rest/v1/note').length, 1, 'the note after it still went');
  eq(since(n, 'PATCH', '/rest/v1/scope_item').length, 1, 'the refused change was not retried');
  await page.click('#back');                     // the bar sits behind an open job
  await page.click('#fail');                     // dialog auto-accepted
  await settle(page, 300);
  ok(await page.$('#fail[hidden]') !== null, 'discarded on confirm');
  await page.click('.job[data-i="0"]');
  await page.waitForSelector('#sheet.open');

  console.log('\n-- a network error is retried, and holds the order');
  n = log.length;
  scripted.push({ match: e => e.method === 'POST' && e.path.startsWith('/rest/v1/note') ? 'abort' : null });
  await page.fill('#notebox', 'Flaky signal');
  await page.click('#addnote');
  await settle(page, 400);
  ok((await page.textContent('#queued')).includes('1 change'), 'stays queued after a failed request', await page.textContent('#queued'));
  await settle(page, 4200);                      // first backoff is 3s
  eq(since(n, 'POST', '/rest/v1/note').length, 2, 'retried after backoff');
  eq(await page.textContent('#queued'), '', 'then delivered');

  console.log('\n-- finish the job with a signature');
  n = log.length;
  await page.click('#finish');
  await page.waitForSelector('#closemodal.open');
  eq(await page.inputValue('#signer'), 'TEST — Palms Ridge HOA', 'signer name starts as the customer');
  await page.click('#cl_sign');
  ok(await page.$('#closemodal.open') !== null, 'no signature drawn: does not close');
  const pad = await page.$('#pad'); const box = await pad.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 60); await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 90, { steps: 8 }); await page.mouse.up();
  await page.fill('#signer', 'Dana Whitfield');
  await page.click('#cl_sign');
  await page.waitForSelector('#sheet:not(.open)', { state: 'attached' });
  await settle(page, 1500);
  const so = since(n, 'POST', '/rest/v1/rpc/apply_synced_signoff')[0];
  ok(!!so, 'signoff recorded through apply_synced_signoff');
  ok(so && so.body.wo === WO1 && so.body.in_signer === 'Dana Whitfield' && so.body.in_channel === 'on_site' && so.body.in_reason === null && so.body.in_actor === CHEO.id, 'with signer, channel, actor');
  ok(so && so.body.in_path.startsWith(WO1 + '/signature/') && so.body.in_path.endsWith('.png'), 'signature path is <job>/signature/<id>.png');
  const sig = since(n, 'POST', '/storage/v1/object/wwd/' + WO1 + '/signature/')[0];
  ok(!!sig, 'signature PNG uploaded');
  const out = since(n, 'PATCH', '/rest/v1/job_visit')[0];
  ok(!!out && out.body.departed_at, 'open visit closed with departed_at');
  const done = since(n, 'POST', '/rest/v1/rpc/apply_synced_stage')[0];
  ok(!!done && done.body.incoming === 'completed_review', 'stage moved to completed_review');
  ok(log.indexOf(so) < log.indexOf(out) && log.indexOf(out) < log.indexOf(done), 'signoff, tap-out, then stage — in that order');
  const left = await page.$$eval('.job[data-i] .wo', els => els.map(e => e.textContent));
  eq(left, ['WO-9002'], 'finished job leaves the list');

  console.log('\n-- no-signature closeout');
  n = log.length;
  await page.click('.job[data-i="0"]');
  await page.waitForSelector('#sheet.open');
  ok((await page.textContent('#d_wait')).includes('Waiting on: Waiting on 12 x 40W'), 'waiting-on reason shown');
  ok((await page.textContent('#d_notes')).includes('text will appear'), 'voice note without words still listed');
  ok((await page.textContent('#d_atts')).includes('Receipt') && (await page.textContent('#d_atts')).includes('sent'), 'existing receipt listed as sent');
  await page.click('#tapin'); await settle(page, 300);
  await page.click('#finish');
  await page.click('#cl_nosig');
  await page.waitForSelector('#reasonmodal.open');
  await page.click('#reasonmodal .opt[data-r="customer_not_present"]');
  await settle(page, 1200);
  const so2 = since(n, 'POST', '/rest/v1/rpc/apply_synced_signoff')[0];
  ok(!!so2 && so2.body.in_reason === 'customer_not_present' && so2.body.in_signed_at === null && so2.body.in_path === null, 'reason recorded, no signature fields');
  eq(await page.textContent('.job .addr'), 'No jobs assigned right now.', 'list empty afterwards');

  console.log('\n-- a job that is no longer his vanishes on refresh');
  jobsNow = [];                                    // server now returns nothing for him
  n = log.length;
  await page.evaluate(() => pullJobs());
  await settle(page, 500);
  eq(await page.textContent('.job .addr'), 'No jobs assigned right now.', 'server state wins once nothing is pending');

  console.log('\n-- sign out is blocked while changes are pending, allowed when clear');
  jobsNow = jobs();
  await page.evaluate(() => pullJobs());
  await page.waitForSelector('.job[data-i]');
  await page.evaluate(() => document.body.classList.add('offline'));
  await page.click('.job[data-i="0"]');
  await page.fill('#notebox', 'still here');
  await page.click('#addnote');
  await page.click('#back');
  await page.click('#who');
  await page.click('#a_signout');
  await settle(page, 300);
  ok(await page.$('#signin[hidden]') !== null, 'sign-out refused with a change pending');
  await page.evaluate(() => { document.body.classList.remove('offline'); window.dispatchEvent(new Event('online')); });
  await settle(page, 1200);
  await page.click('#who');
  await page.click('#a_signout');
  await page.waitForSelector('#signin:not([hidden])');
  ok(true, 'signed out once the queue was empty');
  ok(find('POST', '/auth/v1/logout').length >= 1, 'server session revoked');
  const rows = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('wwd.auth')));
  eq(rows, [], 'session token removed from the phone');

  console.log('\n-- session expiry: told plainly, queue kept');
  await page.fill('#s_email', 'cheo@wwdi.local'); await page.fill('#s_pass', 'test-pass-0000'); await page.click('#s_go');
  await page.waitForSelector('.job[data-i]');
  await page.evaluate(() => document.body.classList.add('offline'));
  await page.click('.job[data-i="0"]');
  await page.fill('#notebox', 'before expiry'); await page.click('#addnote'); await page.click('#back');
  scripted.push({ match: e => e.method === 'POST' && e.path.startsWith('/rest/v1/note')
    ? { status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST301', message: 'JWT expired', details: null, hint: null }) } : null });
  scripted.push({ match: e => e.path.startsWith('/auth/v1/token') && e.path.includes('refresh_token')
    ? { status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid Refresh Token' }) } : null });
  await page.evaluate(() => { document.body.classList.remove('offline'); window.dispatchEvent(new Event('online')); });
  await page.waitForSelector('#signin:not([hidden])', { timeout: 5000 });
  ok((await page.textContent('#s_err')).includes('expired'), 'expiry message shown');
  ok(await page.evaluate(() => pending().length) === 1, 'the unsent note is still queued for after sign-in');

} catch (e) {
  failures++;
  console.log('\n  EXCEPTION ' + (e.stack || e));
  try {
    console.log('  state: ' + JSON.stringify(await page.evaluate(() => ({
      offline: document.body.classList.contains('offline'), signinHidden: document.getElementById('signin').hidden,
      err: document.getElementById('s_err').textContent, me: ME && ME.id, snap: SNAP && SNAP.me && SNAP.me.id,
      snapJobs: SNAP && SNAP.jobs && SNAP.jobs.length, jobs: DATA.jobs.length, queue: MIRROR.length,
      list: document.getElementById('jobs').textContent.slice(0, 120) }))));
  } catch (e2) { console.log('  (no state: ' + e2.message + ')'); }
} finally {
  await browser.close();
  server.close();
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
