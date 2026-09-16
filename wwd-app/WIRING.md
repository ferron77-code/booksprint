# Technician app — wired to Supabase

Written 16 Sep 2026. Follows on from HANDOFF.md, which still describes
the project, the people and the rules. This covers what changed when the
technician preview stopped running on hardcoded arrays.

## What changed

`technician/` is now the source of truth for the phone app and
`technician-preview.html` is built from it. Nothing in it reads
`seed.json` any more.

| File | What it is |
|---|---|
| `technician/index.html` | The shell. Gained a sign-in screen, an account sheet, a photo picker, a "what kind of photo" prompt, and a customer-name field on closeout. |
| `technician/tech.js` | Rewritten data layer. Same screens, same offline queue, but the queue now drains into real tables, RPCs and Storage. |
| `technician/tech.css` | Styles for the above. |
| `technician/config.js` | Project URL, publishable key, bucket name. Filled in 16 Sep. |
| `technician/vendor/supabase.js` | supabase-js 2.116.0, vendored. A field app must not depend on a CDN being reachable at load time. |
| `build-preview.mjs` | `node build-preview.mjs` inlines everything into `technician-preview.html`. |
| `02b-fix-stage-trigger.sql` | Already applied. Kept here so the run order is complete: 00, 01, 02, 02b, 03, 04. |
| `04-views-and-storage.sql` | Migration. Two gaps, described below. Not yet run. |
| `test/technician.test.mjs` | Playwright test of the wiring against a fake Supabase. 65 checks. |

## Before it will run: three things

1. **The publishable key is in `technician/config.js`** and the preview
   is built with it. If the key is ever rotated, paste the new one and
   run `node build-preview.mjs`. The newer `sb_publishable_…` key and
   the legacy `eyJ…` anon JWT both work with the vendored library.
   Never the service role or `sb_secret_…` key: it bypasses every
   policy, and the key ships in the page.

2. **Migrations 02, 02b and 03 are applied** to the live project as of
   16 Sep. 02b splits the stage trigger so the history row is written
   after the work order row exists. The app's stage writes go through
   `apply_synced_stage`, which 02b does not touch, so nothing in the
   app depends on which version of the trigger is installed.

3. **Run `04-views-and-storage.sql`.** The app works for reads and
   typed notes without it, but every photo, voice recording and
   signature upload will be refused until the bucket and its policies
   exist.

## What 04 fixes, and why it matters

**The views bypassed RLS.** Postgres runs a view with the rights of its
owner, not the caller, unless told otherwise. Every view in 00 was
created the default way, and Supabase exposes every view in `public`
over the API. So a technician holding the anon key and his own session
could `GET /rest/v1/work_order_current_crew` and read who is on every
job in the company, `job_hours_by_person` for every man, and
`note_reader` for every note. No dollar figure was reachable (none is
stored anywhere), but "one crew cannot see where another crew is" was
not true. 04 sets `security_invoker = true` on all eight views. The app
itself only ever queries tables, so it did not depend on this; it is a
door that was open.

**There was no storage bucket.** 04 creates a private bucket `wwd` with
a 25 MB per-object cap and policies keyed on the object path:

    <work_order_id>/<kind>/<row_id>.<ext>

The first folder is the job. A technician can read and write objects
under jobs he is currently assigned to, and replace only what he
uploaded. There is no delete policy for technicians.

## How the sync actually works now

Unchanged principle: nothing he taps waits on the network. Every action
goes into the IndexedDB queue and the screen updates. The difference is
what `flush()` does with a queued row:

| Queue row | Goes to |
|---|---|
| typed or voice note | `insert into note` with the phone-made id |
| scope tick | `update scope_item` (done, done_by, done_at) |
| tap in | `insert into job_visit` for himself only |
| tap out / finish | `update job_visit set departed_at` |
| stage change | `rpc apply_synced_stage` — forward-only on the server |
| signature or no-signature reason | `rpc apply_synced_signoff` — a real signature wins |
| photo | `insert into attachment` (pending) → upload → mark uploaded |

Rules that fell out of the schema and are enforced in the code:

- **Row first, file second.** A photo's row lands in seconds; the bytes
  follow and the row is marked `uploaded` after. If the bytes never make
  it, `upload_attempts` counts up where the office can see it. A voice
  note's `audio_path` is decided on the phone before upload so
  `note_has_content` is satisfied with no words yet.
- **A duplicate is a delivery.** Ids are made on the phone, so a retry
  after a dropped connection gets `23505` from the server and the row
  is treated as sent, not written twice.
- **A refusal does not block the queue.** A row the server rejects for a
  reason that will not change (policy `42501`, a constraint, a bad
  value) is marked failed and stepped over, so a day's notes are not
  stuck behind it. He sees a red bar with a count and can discard.
  Network errors are retried with backoff and hold their order.
- **Ticks coalesce.** Ticking a box on and off sends one update with the
  final state, not three.
- **A refresh never erases unsent work.** After every pull the unsent
  queue is replayed over the server's copy.
- **He only knows his own tap-in state.** Other men's visits are not
  readable, by policy, so the crew list shows their names and nothing
  else. That was a display in the prototype; it cannot be one.
- **Photos are shrunk on the phone** to 1600px JPEG before they are
  queued. This is the cost-critical item from HANDOFF.md.
- **Sign out is refused while changes are waiting.** A queue written
  under one man's name will be refused under another's.
- **Everything is escaped** before it hits `innerHTML`. Other people's
  notes now come from the server.

## Testing

### The wiring (no database needed)

    NODE_PATH=$(npm root -g) node test/technician.test.mjs

Runs the real app in headless Chromium against a fake Supabase that
answers and remembers. Checks endpoints, columns, headers, ordering,
offline queueing, reload survival, coalescing, duplicate handling,
policy refusals, network retry, both closeout paths, sign-out and
session expiry. It cannot check RLS: that needs the live project.

### RLS, on the live project

This is the test that matters and it has not been run yet — the
project is not reachable from where this was built.

1. Open `technician-preview.html` on a phone, or in a desktop browser
   at phone width. The key is already in it.
2. Sign in as `cheo@wwdi.local` (password on the sign-in sheet).
3. He should see WO-9001 and WO-9002 and nothing else. If WO-9003
   (Tony's) or WO-9004 (closed and paid) appears, **stop**: RLS is
   wrong.
4. Tap in on 9001, tick an item, type a note, take a photo, finish
   with a signature. Then in the SQL editor:

       select number, stage from work_order where number = 'WO-9001';
       select * from job_visit where work_order_id = '99920000-0000-0000-0000-000000000001';
       select storage_path, upload_status from attachment order by created_at desc limit 3;
       select signer_name, signature_path from work_order_signoff;

5. Sign in as `tony@wwdi.local` on a second device: he should see
   WO-9002 and WO-9003 only, and not Cheo's visit on 9002.

If step 3 passes and step 4 writes, the product promise holds.

## Still open (unchanged from HANDOFF.md unless noted)

- **Voice note playback** in the app. Audio is uploaded to
  `<job>/audio/<note_id>.<ext>`; a play button needs a signed URL.
- **Server-side transcription** for voice notes recorded with no
  signal. They land with `transcribe_state = 'pending'` and no words;
  nothing picks them up yet.
- **Safari audio container.** Still needs a real iPhone. The app
  stores whatever mime type the phone reports and names the file by
  it.
- **Photo thumbnails.** Attachments are listed by kind and time, not
  shown. The bucket is private, so thumbnails need signed URLs.
- **`dashboard-preview.html`** is still on seed data. Same approach
  applies; the office policies are already in place.
- Helper entry, translation correction screen, Excel export, Pro
  upgrade and deleting the WO-9xxx rows before go-live: as before.
