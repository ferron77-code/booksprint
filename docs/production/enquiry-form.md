# The enquiry form — what it does and what the host has to allow

## What a visitor can send

Name, company, email, phone, project type, location, a message, and up to
**8 attachments**: JPEG, PNG, HEIC, HEIF, WebP, GIF or PDF, **10 MB each,
20 MB in total**. That covers what this trade actually sends — phone photos of
a space, a floor plan, a fixture schedule, a spec sheet.

The site had been promising this already. Every page's closing block says
"Drawings, photos or a description — whatever you have," and the contact
page's own "useful to have on hand" list opens with Photos. There was no way
to attach anything until now.

## How attachments are handled

They are **mailed straight through and never written to disk**. Nothing the
form accepts lands anywhere the web server could later be talked into
executing. There is no uploads directory to lock down, and nothing to prune.

Validation, in order:

1. `post_max_size` overflow is detected first. PHP discards an oversized POST
   before the script runs, leaving `$_POST` and `$_FILES` both empty with no
   error flag — indistinguishable from a blank form unless you check
   `CONTENT_LENGTH` yourself.
2. File count, then per-file size, then a running total.
3. **Type is read from the file's contents** via `finfo`, never from the
   name or the browser's `Content-Type`, both of which the sender controls.
   If the host has neither `finfo` nor `mime_content_type`, attachments are
   refused rather than trusted.
4. The filename is rebuilt: a readable stem is kept from what the sender
   called it, stripped to `[A-Za-z0-9 ._-]`, capped at 60 characters, and our
   own extension is appended from the *detected* type.

Tested against a live PHP server:

| Sent | Result |
| --- | --- |
| valid text-only enquiry | `?sent=1` |
| JPEG + PDF | `?sent=1`, both attached, byte-identical on decode |
| PHP payload named `evil.jpg`, `Content-Type: image/jpeg` | `?error=type` |
| 11 MB file | `?error=size` |
| 9 files | `?error=count` |
| filename `../../etc/passwd.jpg` | attached as `passwd.jpg` |
| filename `roof plan v2 <script>.pdf` | attached as `roof plan v2 script.pdf` |
| honeypot filled | `?sent=1`, silently discarded |

## Telling the visitor what happened

`contact.php` redirects back with the outcome in the query string. Both
outcome panels are written in `contact.html` and start hidden; a short inline
script reveals the panel and the one line that applies.

`?sent=1` and `?error=1` existed before. The error panel did not — the
redirect had nowhere to land, so a failed submission looked identical to a
fresh form. That was tolerable when the only failure was a missing email
address. It is not tolerable once a file can be rejected.

Codes: `1` (name or email missing), `big` (POST over the server limit),
`size`, `type`, `count`, `upload` (transfer failed), `mail` (send failed).
An unrecognised code falls back to a generic line. Every panel offers the
phone number.

`site.js` also lists the chosen files with a running total and blocks an
over-limit submit before the upload starts — worth having on a phone. It is
an optimisation only; the server enforces the same limits regardless, and
with no JavaScript the field is a plain multiple file input that works.

## What the host must allow

This is the part to check before go-live, because the defaults on cheap
shared hosting are below what the form offers:

    post_max_size       = 24M     ; must exceed upload_max_filesize
    upload_max_filesize = 10M
    memory_limit        = 64M     ; attachments are read into memory to encode
    max_execution_time  = 120     ; a 20 MB upload over hotel wifi is slow
    file_uploads        = On

Set these in `php.ini`, or in `.htaccess` on Apache:

    php_value post_max_size 24M
    php_value upload_max_filesize 10M
    php_value memory_limit 64M
    php_value max_execution_time 120

If the host will not raise them, lower `$MAX_ONE` and `$MAX_TOTAL` at the top
of `contact.php` to match — otherwise the form advertises a limit the server
will reject, and the visitor gets `?error=big` after a long wait.

Also confirm before go-live:

- `$TO` in `contact.php` is the address that should receive enquiries.
- `mail()` works at all on the host, and that mail from it is not being
  filed as spam. Shared hosts frequently disable it or require SMTP
  authentication instead. If it is unreliable, swap the `mail()` call for
  PHPMailer over the domain's own SMTP — the rest of the handler is
  unaffected.
- The receiving mailbox accepts a 20 MB message. Base64 inflates
  attachments by roughly a third, so a full batch arrives around 27 MB and
  many mailboxes cap at 25 MB. If that is a problem, drop `$MAX_TOTAL` to
  15 MB.

## Not done

Attachments are emailed, not stored, so there is no record of them beyond the
inbox. If they ever want a copy kept — a job folder per enquiry — that is a
different design: write to a directory outside the web root, serve through a
script rather than by URL, and prune on a schedule.

---

# Social share cards

Every page carries Open Graph and Twitter Card tags, plus a canonical URL and
a `theme-color` set to the brand blue.

Each page has its own 1200x630 card in `site/assets/img/og-<slug>.jpg`,
regenerated by `python3 tools/ogcards.py`. The cards are rendered in Chromium
rather than drawn with a graphics library, so the type is the site's own
Archivo and IBM Plex Mono at the same weights the pages use.

Every photograph on a card is **the company's own work**. The page heroes are
still renderings (see photo-provenance.md) and are deliberately not used here:
the share card is the first thing an outsider sees of them.

| Page | Photograph | Headline |
| --- | --- | --- |
| index | aerial night, lit building and lot | Lighting. Electrical. Construction. |
| commercial | high-bay interior | Empty shell to open doors |
| residential | uplit specimen palm | Nobody sees the fixtures |
| property-managers | lit hedge line | One call for the whole property |
| portfolio | wall grazing | Every project has a night version |
| contact | lit pool and planting | Tell us what you're building |

Contrast was measured on the rendered cards, not assumed: wordmark 5.06-5.52:1,
strapline 4.50-5.34:1, headline 4.51-5.30:1 — all above 4.5:1.

628 KB in total, and a visitor never downloads any of it. Only a scraper does,
one card at a time.

`tools/check.py` validates the tags on every build: the required properties
are present and non-empty, `og:url` names the page it sits on, `og:image`
resolves to a file that exists on disk, and all the absolute URLs share one
origin. That check exists because `index.html` is hand-written and not
regenerated, so it is the file that can drift — an empty `og:description` got
through once before the check was added.

## Confirm the domain before go-live

    tools/chrome.py:  SITE_URL = "https://www.elighting.org"

**This is an assumption, not a fact.** It is taken from the company's own
contact address, `info@elighting.org`. Nobody has confirmed the site will live
there. Change that one constant and re-run `python3 tools/build.py`, then
patch the same block in `site/index.html`, which is hand-written.

Absolute URLs are required — scrapers will not resolve a relative `og:image`.
If `SITE_URL` is wrong, every share of the site shows a broken card.

After go-live, paste a page URL into these and confirm the card renders:

- Facebook: https://developers.facebook.com/tools/debug/
- LinkedIn: https://www.linkedin.com/post-inspector/
- X: https://cards-dev.twitter.com/validator

Facebook and LinkedIn cache aggressively. If a card is wrong at launch, fix it
and then use the debugger's re-scrape button, or the old one persists.
