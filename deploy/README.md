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

**If anything on this project misbehaves inexplicably: check for a VPN
first.** It has been the cause twice, wearing a different disguise each time.

The second time was not DNS at all. Saving a form notification in the Netlify
dashboard failed with *"We're having some trouble connecting you to Netlify.
This error may be caused by an ad blocker or browser extension"* — a message
that names two culprits and not the actual one. Turning the VPN off fixed it
immediately. So the rule is broader than DNS: **a VPN can break Netlify
dashboard writes**, and Netlify's own error text will send you hunting through
extensions instead.

Consequence worth acting on: the earlier refusal to change the primary domain
was put down to Netlify locking that setting during certificate issuance,
which is real behaviour — but it now has a second plausible cause. Retry it
with the VPN off before concluding anything.

**If a DNS change ever looks like it has not taken: check for a VPN first.**

That is the whole lesson from this cutover. The old GoDaddy site kept coming
up on the office machine for half an hour after the switch while a phone on
mobile data showed the new one — and the cause was a VPN, whose provider's
resolver was still serving the previous answer. Changing VPN server fixed it
instantly. Nothing else would have: `ipconfig /flushdns` clears the Windows
cache, and a VPN does not use the Windows cache. Incognito does not help
either; it clears cookies, not DNS.

The order to check, cheapest first: VPN, then `ipconfig /flushdns`, then
Chrome's own two caches (`chrome://net-internals/#dns` → Clear host cache and
`chrome://net-internals/#sockets` → Flush socket pools), then the router,
then wait out the TTL.

Two things make this diagnosable rather than guesswork:

`ping worldwidedistributorsinc.com` shows the IP the machine is actually
being given. During the confusion it answered 13.248.243.5, whose reverse DNS
is awsglobalaccelerator.com — GoDaddy's Website Builder infrastructure — while
every public resolver said 75.2.60.5. That gap is the entire diagnosis, and it
takes one command.

Netlify holds no copy of the old site and cannot serve it. So *seeing the old
site is proof the browser never reached Netlify*. The worst Netlify can give a
browser is a certificate warning. If you are looking at the old site, the
problem is in front of the DNS, not behind it.

### Still to do

- [ ] **Set `www` as the primary domain — retry with the VPN off.** The
      earlier refusal was attributed to Netlify locking the setting during
      certificate issuance, but a VPN has since been shown to break Netlify
      dashboard writes, so that diagnosis is no longer the only candidate.
      Once the certificate has issued, Options on the www row → Set as primary
      domain. Until then the page code and the host disagree about which
      hostname is canonical: harmless for days, worth not leaving for weeks.
- [ ] **Forms → Form notifications → Email notification → info@elighting.org.**
      Until this is set, enquiries arrive in the dashboard and nobody is told.
      Send a real test through the form and confirm the mail lands.
- [ ] **Unpublish the GoDaddy Website Builder site** from this domain. It is
      no longer reachable, but leaving it attached invites a future editor to
      "fix" the DNS back.
- [x] **`elighting.org` apex forwarded** — done 2026-09-10. The Domain row
      reads `https://worldwidedistributorsinc.com`, permanent 301, and
      **Subdomains stays "Not set up"** so `www` keeps its CNAME to
      `s.dudaone.com` and the Duda catalog and its rankings are untouched.
      That pairing is the whole point; do not add a `www` row.
- [ ] **`elighting.org` `www` — forward it too. Decided 2026-09-10.** The
      recommendation here was to keep the split until the catalog existed; the
      client's decision is to forward everything now, and that is the
      instruction. Subdomains → Add Forwarding → `www` →
      `https://worldwidedistributorsinc.com`, permanent 301, VPN off. GoDaddy
      will warn that it overwrites an existing record — accept it, that record
      is the one being replaced.
      **Rollback value, recorded before it is overwritten:**
      `www  CNAME  s.dudaone.com.` (TTL 1 hour). Re-adding that record restores
      the Duda site at that address.
      Still NOT `elightingindustries.com` — a live Shopify store whose login
      has not been recovered.
- [x] **`worldwidedistributors.co` forwarded** — done 2026-09-10.
- [x] **Cutover confirmed by the client**, 2026-09-10: refreshing the old
      address lands on the new site.
- [x] **Email address settled** — the site keeps `info@elighting.org`.

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
HTML, so there is nothing to install — but three things still need doing in
the dashboard, and until they are, submissions arrive and nobody is told:

1. **Forms → Enable form detection.** This is off by default and it is the
   one that will waste your afternoon. Correct markup is not enough: with
   detection off, Netlify never looks. The page works, the thank-you page
   works, and every submission goes nowhere.

   **Enabling it does not find the existing form.** Netlify parses HTML at
   deploy time, so a build made while detection was off stays unscanned.
   Trigger a fresh deploy after enabling — Deploys → Trigger deploy, or push
   anything.

2. **Forms → check `enquiry` is listed.** After that redeploy it appears in
   place of the setup pitch. If it does not, the markup is the problem and
   check.py's form gate is the place to start.
3. **Forms → Form notifications → Add notification → Email notification.**
   Without this, submissions sit in the dashboard silently. Point it at an
   address someone actually reads today rather than waiting on a decision
   about which address the site should advertise — that is a branding
   question and it should not hold up a live form.

Send a real test submission and confirm the email arrives before telling the
client the form works.

### What the form can and cannot carry

Netlify caps a submission at **8 MB total** — text and attachments together —
and the upload gives up after 30 seconds. That ceiling is the same on every
plan; no amount of money raises it.

So the size problem is solved before the upload rather than by paying for
headroom. `site/assets/site.js` resizes each photo in the browser — 2000px
long edge, JPEG quality 0.82 — and only then submits. Measured: five phone
photos totalling 53.9 MB went over the wire as **1.51 MB**, all five parts
intact and visually indistinguishable from the originals. That is why the
form offers **five** file fields rather than three; the Netlify ceiling
stopped being what decides how many a customer may attach.

It is five separate fields rather than one multi-select on purpose: Netlify
Forms keeps **one file per field** and silently discards the rest.

PDFs cannot be resized, so they still go as they are. When the total will not
fit, the `#toobig` panel appears and its button opens the visitor's mail app
with everything they have already typed carried across — so a set of 25 MB
drawings does not mean starting again.

### What the form costs

Nothing, on Netlify's current credit-based plans: as of the April 2026 pricing
update, **form submissions are free and unlimited** — no 100-a-month cap and
no Forms Level tiers. Attachments are counted as form file-upload storage
against the billing period, which at roughly 1.5 MB per enquiry is not a
figure worth watching: twenty enquiries a month is about 30 MB.

The old structure still applies to **legacy** plans — 100 submissions per site
per month, and crossing it moves the site to Forms Level 1 at $19/month for
1,000 submissions and 1 GB of uploads. Which of the two this account is on is
visible under **Team → Billing**; check it once rather than assuming.

(`docs.netlify.com` is blocked by this session's egress proxy, so the above
came from search results rather than the docs themselves. The billing page in
the dashboard is the authority.)

`contact.php` is gone. It was the old handler and Netlify cannot run PHP —
every enquiry sent from the live site would have hit a 404.

## 5. The other domains — audited 2026-09-10

Checked by resolving each one rather than assuming, because the assumption was
wrong. Earlier notes in this file said to 301 `elightingindustries.com` here.
Do not: it is a live Shopify store.

| Domain | DNS at | What is on it | Email |
|---|---|---|---|
| `worldwidedistributors.co` | GoDaddy | parked / forwarding | Google Workspace |
| `elighting.org` | GoDaddy, the "E-Lighting" account | **Duda site** on the www version | Proofpoint |
| `elightingindustries.com` | Google / Squarespace | **Shopify** (23.227.38.66) | hostedemail.com |
| `ewaterindustries.com` | GoDaddy | **Shopify** (23.227.38.32) | none |

**`worldwidedistributors.co` is forwarded** as of 2026-09-10. Domain row →
`worldwidedistributorsinc.com`, permanent 301, masking off. GoDaddy → the
domain → DNS → Forwarding tab; never by hand in the records table, because
forwarding touches the A record only and leaves mail alone. `.co` carries
Google Workspace mail.

**`elighting.org` is NOT forwarded, and should not be without asking.** It was
found in a third GoDaddy account, named "E-Lighting". The bare domain already
forwards to `http://www.elighting.org`, and that www host is a CNAME to
`s.dudaone.com` — a **live site built on Duda**. Forwarding the bare domain
would send everyone who types "elighting.org" away from it.

**That Duda site is not abandoned, and it is not small.** The host is blocked
by this session's egress proxy, so it was never loaded directly — but it is
indexed, with hand-written SEO titles on at least seven pages:

| Page | Indexed title |
|---|---|
| `/` | Commercial, Residential, Hospitality Lighting \| LED Lighting |
| `/about-us` | Commercial & Residential Lighting Solutions Provider |
| `/products` | Products |
| `/landscape-lighting` | Landscape Lighting Kits \| Uplights & Downlights |
| `/studio-and-stage-lighting` | Studio & Stage Lighting Kits \| Outdoor Lighting |
| `/matrix-page` | Services Area Lighting \| Studio Lighting |
| `/contact` | Contact us \| LED Lighting |

**This is why the domain must not simply be forwarded.** Those are
*product-catalogue* pages — kits, uplights, downlights, studio and stage
fixtures. The new site is a services-and-capability site: it has no products
section and nothing equivalent to any of them. A 301 from seven ranking
product pages onto a site with no matching content does not transfer their
rankings; search engines treat a redirect to a non-equivalent page as a soft
404 and the rankings are simply lost. Forwarding would take the eLighting
brand's entire product-facing presence off the web in one click.

The two sites are not duplicates competing for the same visitor. They are two
halves of the business — the catalogue and the capability — and only one of
them has been rebuilt. So the question for the client is not "shall we tidy
this away", it is: **do the products come into the new site, or do both stay
up?** Either answer is workable. Forwarding before that is decided is not.

Asked on the 2026-09-10 call what was on this domain, the answer was "I don't
know," so this needs putting to Ariel rather than to Elizabeth.

**Since noted, there is a second reason not to forward it.** Ariel wants a
catalog or store built, and those `/products`, `/landscape-lighting` and
`/studio-and-stage-lighting` pages are the seed content and the starting SEO
for exactly that project. Switching them off before a replacement exists would
discard the only asset the work begins with. See
`docs/strategy/ecommerce-and-catalog.md`.

**Do not confuse the two elighting domains.** On that call the Duda site was
described as being on `elightingindustries.com`. It is not. Verified against
public resolvers the same day:

- **Duda is on `www.elighting.org`** — CNAME to `s.dudaone.com`. The apex
  already forwards to it, so the Duda site *is* the live `elighting.org`
  website.
- **`elightingindustries.com` is Shopify** — `23.227.38.66`, `www` CNAME to
  `shops.myshopify.com`, on Google Cloud nameservers with mail on
  `hostedemail.com`. No Duda involved.

They are different platforms on different registrars' nameservers, and the
consequence of acting on the wrong one is the difference between hiding a
brochure page and taking a store offline.

**If `elighting.org` is forwarded, the email survives — but say why, not just
that.** GoDaddy serves forwarding through `A` and `CNAME` records; `MX` is a
different record type and forwarding does not modify it. So web forwarding and
`info@elighting.org` are independent. The record that forwarding *does*
overwrite is the `www` CNAME to `s.dudaone.com`, and that is the Duda site,
not the mail. GoDaddy will warn about exactly that, and the warning is
accurate.

**`elightingindustries.com` cannot be touched yet regardless.** The Shopify
login has not been recovered — "I'm still trying to get the login." It is a
live store; it should not be forwarded, and no part of this project is blocked
waiting for it.

**Do not touch `elightingindustries.com`.** It resolves to Shopify, on Google's
nameservers, with its own mail host. That is a running e-commerce site, not an
abandoned old page, and forwarding it would take the store down. Whether it
gets folded into this site is a business decision for the client, not a
tidying-up step.

**The pattern here is worth naming.** Three of the four domains turned out to
have something live on them — Shopify, Shopify, Duda — after being described
as old sites to redirect. This company has more websites than anyone
volunteered. Resolve a domain and look at what answers before touching it; the
instruction "the old domains should point at the new site" is a hypothesis,
not a fact.

**`ewaterindustries.com`** is also Shopify and is a different company. Nothing
to do with this project.

## The full `elighting.org` record set

Read off the GoDaddy DNS Records page, 2026-09-10. 21 records, and they say
more about this business than the domain audit did.

| Type | Name | Data | What it is |
|---|---|---|---|
| A | `@` | `15.197.225.128`, `3.33.251.168` | GoDaddy forwarding service |
| NS | `@` | `ns71/ns72.domaincontrol.com` | GoDaddy nameservers |
| SOA | `@` | `ns71.domaincontrol.com` | — |
| MX | `@` | `mx1/2/3-usg1.ppe-hosted.com` (0) | Proofpoint filtering |
| TXT | `@` | `NETORGFT3014538.onmicrosoft.com` | **Microsoft 365 tenant** |
| TXT | `@` | `v=spf1 include:_spf-usg1.ppe-hosted.com include:secureserver.net ~all` | SPF |
| CNAME | `autodiscover` | `autodiscover.outlook.com` | M365 client auto-setup |
| CNAME | `msoid` | `clientconfig.microsoftonline-p.net` | M365 sign-in |
| CNAME | `lyncdiscover` | `webdir.online.lync.com` | Skype for Business / Teams |
| CNAME | `sip` | `sipdir.online.lync.com` | Skype for Business / Teams |
| SRV | `_sip._tls` | `100 1 443 sipdir.online.lync.com` | Skype for Business / Teams |
| CNAME | `email` | `email.secureserver.net` | GoDaddy webmail shortcut |
| CNAME | `www` | `s.dudaone.com` | **the Duda site** |
| CNAME | `pay` | `paylinks.commerce.godaddy.com` | **GoDaddy Payments** |
| CNAME | `ftp` | `elighting.org` | legacy, now aimed at a web forwarder |
| CNAME | `_domainconnect` | `_domainconnect.gd.domaincontrol.com` | GoDaddy Domain Connect |

### The email is Microsoft 365, more precisely than "GoDaddy email"

The `NETORGFT…onmicrosoft.com` TXT is a Microsoft 365 tenant identifier, and
the `NETORGFT` prefix is the signature of **M365 resold by GoDaddy**. Together
with `autodiscover`, `msoid`, `lyncdiscover`, `sip` and the SRV record, this is
a full Microsoft 365 mailbox setup with Proofpoint filtering in front of it —
which is exactly how GoDaddy sells M365.

So `info@elighting.org` is an Outlook/M365 mailbox, reachable at
`outlook.office.com`, on a subscription that is separate from the Duda one.
The earlier note called it "GoDaddy's email," which was right but too vague to
act on. It matters because **the do-not-touch list is longer than MX and SPF**:
deleting `autodiscover` breaks Outlook's automatic setup for every client, and
the `sip`/`lyncdiscover`/SRV set is Teams federation.

### There is a payments endpoint on this domain

`pay` → `paylinks.commerce.godaddy.com` is **GoDaddy Payments payment links**.
Someone set this domain up to take money at `pay.elighting.org`. Nobody
mentioned it. There may be a GoDaddy Payments account with transaction history
and live payment links already sitting on invoices or in sent email.

This is directly relevant to the catalog project — see
`docs/strategy/ecommerce-and-catalog.md`. It is also the **fourth** live thing
found on a domain that was described as an old site: Shopify, Shopify, Duda,
and now a payment endpoint.

### What this means for forwarding — the useful part

The apex `A` records **are already GoDaddy's forwarding service**. The bare
domain does not need any record change to be forwarded; it is forwarded
today, to `http://www.elighting.org`. Changing its destination is an edit on
the **Forwarding** tab, not in the records table.

Which makes a clean middle path available now:

**Forward the bare `elighting.org` to this site, and leave the `www` row
alone.** Someone typing "elighting.org" lands on the new site. Someone
arriving from Google — which indexes the `www` host — still reaches the Duda
catalog. Email is untouched either way, because forwarding writes `A` and
`CNAME` records and never `MX` or `TXT`.

That gets the brand consolidation without spending the catalog's rankings, and
it is reversible in one click. The only irreversible move in this whole area
remains overwriting `www → s.dudaone.com`, and there is no reason to do that
until the catalog exists.

**The trap when actually doing this.** GoDaddy's Forwarding tab has two
separate areas: **Domain**, which forwards the bare hostname and needs no
subdomain, and **Subdomains**, which forwards a named host and makes the
Subdomain field mandatory. Open the Subdomains form by mistake and Save stays
greyed out until something is typed in that box — and the obvious thing to
type is `www`, which is exactly the one irreversible action here.

The bare domain is **already forwarded**, so the correct control is the
existing **Domain** row's *Edit*, not an *Add* anywhere. If no such row can be
found, do nothing: the whole gain from this change is that typed traffic
reaches the new site, which is a nice-to-have, while the cost of getting it
wrong is the catalog and its rankings. Leaving the domain untouched costs
nothing.

### Three subscriptions on one domain

Worth surfacing to the client as a set, because they are separate products and
cancelling one does not affect the others: the **Microsoft 365** mailboxes, the
**Duda** site, and quite possibly **GoDaddy Payments**. Only the Duda one is a
candidate for cancelling, and only once its content is saved.

## Email on these domains

Checked directly against public resolvers on 2026-09-10:

| Domain | Mail runs on |
|---|---|
| `worldwidedistributorsinc.com` | Google Workspace — five `aspmx.l.google.com` MX |
| `worldwidedistributors.co` | Google — five MX, `aspmx2/3.googlemail.com` among them |
| `elighting.org` | **Proofpoint** — `mx1/2/3-usg1.ppe-hosted.com` |

Two providers, two domains, no overlap. That answers the question of whether
the company can have `info@worldwidedistributorsinc.com` *and* keep
`info@elighting.org`: yes, and they do not compete. They are separate mail
systems and neither knows about the other.

- **`info@elighting.org` keeps working with nothing done to it.** It is on
  Proofpoint and none of the website work touches mail.
- **`info@worldwidedistributorsinc.com` needs no DNS change either.** Google
  Workspace is already receiving on that domain. Adding the address is a
  Workspace admin action, and it should be an **alias on an existing user**,
  not a new user — aliases are free, users are per-seat.
- **Do not** try to unify them by moving `elighting.org` into Workspace. That
  means repointing live MX away from Proofpoint. If one inbox for both is
  wanted, forward `info@elighting.org` at the Proofpoint end instead.

**Decided on the call of 2026-09-10: the site keeps `info@elighting.org`.**
Asked directly whether to move to a `worldwidedistributorsinc.com` address,
the answer was "I would keep what we have right now." So nothing changes on
the site — it already advertises that address — and nothing changes in DNS.

Two things learned on that call that are worth having written down:

- **`info@elighting.org` is GoDaddy's email**, which reconciles with the
  Proofpoint MX above: `ppe-hosted.com` is Proofpoint Essentials, which
  GoDaddy puts in front of the mailboxes it hosts. The client's own
  description — "that's attached to GoDaddy" — is correct.
- **The Workspace mailboxes on `worldwidedistributorsinc.com` are not for
  customers.** There is `elizabeth@worldwidedistributorsinc.com`, described as
  "just the admin one," created in order to set the domain up. Ariel has no
  mailbox there at all. So do not route enquiries to that domain on the
  assumption that someone is reading it.

What must keep being paid for, then, is both the `elighting.org` registration
**and** the GoDaddy email plan on it. Lose either and the address on every
page of this site stops receiving.

## If it needs to move off Netlify

`site/` is portable: 409 files, 29 MB, no server-side anything except the
form. Drop the contents of that folder — the contents, not the folder — into
any web root and every page works. The only thing that would not come along
is the enquiry form, which is Netlify's. On a host with PHP, the old
`contact.php` handler is in this repo's history at commit `24e728e~1`.

## Details the old site carries that this one does not

**Reviewed and declined, 2026-09-10: "We're good with our site. Everything is
accurate."** Nothing below was applied and nothing below should be applied
without a fresh instruction. It is kept as a record of what was checked, so
that finding these again later does not look like finding a defect.

Where the two sites disagree — the closing time, most obviously — **this site
is the correct one.** The old page is the stale copy.

All of it came from the company's own existing pages and their Procore
listing rather than from anything invented here.

- **`(305) 969-8754` is confirmed.** It appears independently as the company
  number, which matches what the client specified and what every page of the
  new site shows. Nothing to change; worth knowing it was verified rather than
  taken on trust.
- **`(305) 969-8769` looks like a second line — the showroom.** It appears
  against the 12130 SW 114th Place address. Not an error in either place; the
  question is whether the new site should list both.
- **The ZIP is 33176.** The new site shows the street and city but no ZIP.
  Adding it is a small, real improvement for local search and maps.
- **Hours disagree, and 8am–5pm is right.** The old site says Mon–Fri
  8:00am–4:00pm. Confirmed by the client that this site is accurate, so the
  old page is simply out of date.
- **The Procore listing reads "Worldwide Distributors Inc. dba Elighting"** and
  names trades the new site does not mention: Electronic Security, Concrete,
  Electronic Life Safety, Project Management and Coordination. Confirms the
  dba, and suggests the capability list is narrower than the real one.
- **"Over 30 years in the lighting industry"** is claimed on the old site.
  That is the company's own prior marketing, not a verified fact, so it stays
  off this site until Ariel confirms it. Noting it because the new site
  deliberately makes no experience claim, and this is where one could come
  from legitimately.
- **There is a podcast episode about Ariel** — "Elighting: Lighting the Way |
  How Ariel Rodriguez Built a Lighting Empire from the Ground Up," on The
  Plant Movement Podcast. A real, citable third-party asset if the site ever
  wants one.
