# wwd-app/web — what is actually deployed

This directory is the **deployable bundle, exactly as it ships**: flat, every
file a sibling, because that is how the app resolves its own paths.
`office.html` loads `config.js` and `vendor/supabase.js` as siblings, `sw.js`
must sit at the root to claim the whole scope, and `_headers` is Netlify's.
Do not reorganise it into subfolders without changing those references.

| File | What it is |
|---|---|
| `office.html` | The office board. Self-contained: markup, styles and script in one file. |
| `index.html` | The technician phone app shell. |
| `tech.js` / `tech.css` | The phone app's logic and styles. |
| `config.js` | Project URL, publishable key, bucket. Shared by both apps. |
| `sw.js` | Service worker. Network-first with `cache: 'no-store'`, so a deploy shows up on the next open and the cached copy is only used with no signal. |
| `_headers` | Netlify headers: no-cache on `sw.js`, `Service-Worker-Allowed: /`, correct type for the manifest. |
| `manifest.webmanifest`, icons, `og.png` | Installable-app metadata. |
| `vendor/supabase.js` | supabase-js, vendored. A field app must not depend on a CDN at load time. |
| `vendor/xlsx.mini.min.js` | Spreadsheet export from the office board. |

## Read this before editing anything

**`wwd-app/technician/` is a stale snapshot. This directory is the truth.**

When this was committed (23 Sep 2026) the repo copy was well behind what was
live, and nobody had noticed:

| File | In `technician/` | Deployed |
|---|---|---|
| `tech.js` | 60,979 bytes | 69,743 |
| `index.html` | 7,438 | 9,995 |
| `tech.css` | 11,883 | 13,024 |
| `office.html` | *absent* | 92,112 |

The gap was not cosmetic. `job_helper` appears 30 times in the deployed
`tech.js` and **not once** in the repo copy — the crew-helper-hours feature had
shipped to the crew's phones while its migration
(`10-crew-helper-hours.sql`) sat in the repo with no app code beside it. The
office board had never been committed at all; its only copies were the live
deploy and a zip on a laptop.

So: edit here. `technician/`, `build-preview.mjs` and `technician-preview.html`
belong to the older preview-building arrangement and should probably go, but
deleting someone else's files is not this commit's job.
