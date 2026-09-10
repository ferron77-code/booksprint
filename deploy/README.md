# Going live on worldwidedistributorsinc.com

## Status: live since 2026-09-10

The switch is done. `worldwidedistributorsinc.com` serves this site, confirmed
from a phone on mobile data — a path sharing no cache with the office.

Both GoDaddy records went in cleanly and were verified independently by
resolving them from outside GoDaddy:

    worldwidedistributorsinc.com        -> 75.2.60.5
    www.worldwidedistributorsinc.com    -> 18.208.88.157, 98.84.224.111
    worldwide-distributors.netlify.app  -> 18.208.88.157, 98.84.224.111

The www addresses matching the netlify.app addresses exactly is the proof the
CNAME resolves to the project rather than to something that merely answers.

Netlify then reported `DNS verification was successful`. The per-row "Pending
DNS verification" labels on the domain list lagged behind that for a while and
were not describing a real problem.

**One thing to know if this ever looks broken again.** For a while after the
cutover the old GoDaddy site kept appearing on the office machine while the
phone showed the new one. That is a local DNS cache, and it is diagnosable
without guessing: Netlify has no copy of the old site and cannot serve it, so
seeing the old site proves the browser is still being handed GoDaddy's
address. The worst a browser can get from Netlify is a certificate warning.
Fix is `ipconfig /flushdns`, then `chrome://net-internals/#dns` → Clear host
cache, then a full restart of the browser. Or wait out the TTL.

### Still to do

- [ ] **Set `www` as the primary domain.** Netlify made the bare domain
      primary and locks the change while a certificate request is in flight.
      Once the certificate has issued, Options on the www row → Set as primary
      domain. Until then the page code and the host disagree about which
      hostname is canonical: harmless for days, worth not leaving for weeks.
- [ ] **Forms → Form notifications → Email notification → info@elighting.org.**
      Until this is set, enquiries arrive in the dashboard and nobody is told.
      Send a real test through the form and confirm the mail lands.
- [ ] **Unpublish the GoDaddy Website Builder site** from this domain. It is
      no longer reachable, but leaving it attached invites a future editor to
      "fix" the DNS back.
- [ ] **301 `elighting.org` and `elightingindustries.com`** here. Website
      forwarding only — do not touch `elighting.org`'s MX records.

The site is a folder of finished files. Netlify serves `site/` straight from
this repo with no build step, and `netlify.toml` at the repo root carries the
settings so they are readable here rather than buried in a dashboard.

**Current address:** https://worldwide-distributors.netlify.app
**Going to:** https://www.worldwidedistributorsinc.com

Every canonical tag, share-card URL, `sitemap.xml` and `robots.txt` is built
from one string — `SITE_URL` in `tools/chrome.py`. Change that line, re-run
`tools/build.py`, and everything follows.

## www, and the one thing the bare domain costs

Both records get created in GoDaddy either way, so which domain is primary is
not about what visitors can reach — both work. It decides which address dies
if Netlify ever moves the load-balancer IP that an apex A record has to hold
as a literal number. An apex cannot use a CNAME; www can.

- **www primary:** a stale IP costs the bare domain. www carries on via its
  CNAME, which follows Netlify automatically.
- **apex primary:** a stale IP is the whole site.

Same risk either way, much smaller blast radius with www. **If the site is
ever unreachable while the Netlify deploy is green, check that A record
against Netlify's current published IP before anything else.**

Do not accept the **Set up Netlify DNS** offer in the domain Options menu. It
moves DNS hosting off GoDaddy, which means recreating all thirteen records by
hand at Netlify — including the five Google MX records this domain's email
runs on. The routing gain is not worth putting their email through that.

## 1. Add the domain in Netlify

Site configuration → Domain management → Add a domain → a domain you own.

1. Enter `www.worldwidedistributorsinc.com`.
2. Netlify offers to add `worldwidedistributorsinc.com` alongside it — accept.
3. Netlify will make the **bare** domain primary on its own. Change it:
   Options on the www row → **Set as primary domain**.

Expect that to be refused at first. Netlify locks custom domain changes while
a certificate attempt is in flight, and the first attempt cannot succeed —
DNS is still pointing at GoDaddy. Wait for it to finish failing and the option
comes back. Meanwhile the HTTPS panel shows a red certificate error, then
"Waiting on DNS propagation". Both are correct at this stage.

## 2. Point the DNS at GoDaddy

GoDaddy → My Products → the domain → DNS → Manage Zones.

Two records. **Delete or edit whatever is already on `@` and `www`** — a
GoDaddy parking page usually leaves an A record on `@` and a CNAME on `www`,
and a stale one will win.

| Type  | Name | Value                                | TTL      |
|-------|------|--------------------------------------|----------|
| CNAME | www  | `worldwide-distributors.netlify.app` | 1 hour   |
| A     | @    | `75.2.60.5`                          | 1 hour   |

`75.2.60.5` is Netlify's load balancer for apex domains on external DNS. If
Netlify's own "Pending DNS verification" panel shows a different address for
this site, **use the one it shows** — sites on their higher-performance tier
get a different IP, and the panel is the authority, not this file.

Leave the MX records alone. Email for `elighting.org` is a separate domain and
is not touched by any of this, but if this domain ever carries mail, deleting
its MX records will stop it.

## 3. Wait, then check

DNS takes anywhere from ten minutes to a few hours. Netlify verifies on its
own and issues a Let's Encrypt certificate once it resolves — no action
needed, but HTTPS will fail until that lands. Do not panic at a certificate
warning in the first hour.

Then confirm all four of these:

- `https://worldwidedistributorsinc.com` serves the site
- `https://www.worldwidedistributorsinc.com` redirects to it
- The padlock is there, with no mixed-content warning
- `https://worldwidedistributorsinc.com/sitemap.xml` loads, and none of the
  URLs in it carry a `www`

## 4. The enquiry form

The form uses **Netlify Forms**. Netlify finds it by reading the deployed
HTML, so there is nothing to install — but two things still need doing in the
dashboard, and until they are, submissions arrive and nobody is told:

1. **Forms → check `enquiry` is listed.** It appears after the first deploy
   that includes it. If it is not there, the deploy has not picked up the
   markup.
2. **Forms → Form notifications → Add notification → Email notification.**
   Send to `info@elighting.org`. Without this, submissions sit in the
   dashboard silently.

Send a real test submission and confirm the email arrives before telling the
client the form works.

### What the form can and cannot carry

Netlify caps a submission at **8 MB total** — text and attachments together —
and the upload gives up after 30 seconds. The form offers three file fields
and warns the visitor at 7 MB, which leaves room for the rest.

It is three separate fields rather than one multi-select on purpose: Netlify
Forms keeps **one file per field** and silently discards the rest. The page
tells people to email anything bigger to `info@elighting.org`.

The free tier includes 100 submissions a month. Worth watching in the first
few months; going over means submissions are rejected, not queued.

`contact.php` is gone. It was the old handler and Netlify cannot run PHP —
every enquiry sent from the live site would have hit a 404.

## 5. The other two domains

`elighting.org` and `elightingindustries.com` should 301 to
`https://worldwidedistributorsinc.com` rather than stay up as separate
sites. Two live sites for one company compete with each other in search, and
every link either has ever earned is currently pointing at a dead end.

In GoDaddy that is Domains → the domain → Forwarding → Forward domain →
permanent (301), forward with masking **off**. Masking keeps the old address
in the bar and hides the real one from search engines, which is the opposite
of what is wanted here.

`elighting.org` carries their email, so forward the *website* only. Do not
touch its MX records.

## If it needs to move off Netlify

`site/` is portable: 409 files, 29 MB, no server-side anything except the
form. Drop the contents of that folder — the contents, not the folder — into
any web root and every page works. The only thing that would not come along
is the enquiry form, which is Netlify's. On a host with PHP, the old
`contact.php` handler is in this repo's history at commit `24e728e~1`.
