# Worldwide Distributors — standing brief

Read this first. It is the context a new conversation needs to be useful on
this account without re-deriving it. Last updated 2026-09-11.

## Who

**Worldwide Distributors Inc.**, Miami — lighting, electrical and construction,
trading as **eLighting** (lighting and electrical) and **eBuilt**
(construction). Source-and-supply sits **under eLighting** and is not a third
division.

- **Ariel Rodriguez** — owner. Decisions about the business, the brand, and
  money go to him.
- **Elizabeth** — Ariel's daughter, day-to-day contact. Holds the Google
  Workspace admin account. Predates none of the older web history, so questions
  about who built what go to Ariel.
- Work is done by Ferron (agency side). Repo: `ferron77-code/booksprint`,
  branch `claude/website-strategy-analysis-20d1y5`.

## What is live

`https://www.worldwidedistributorsinc.com` — six pages, hosted free on
Netlify, served straight from `site/` in this repo with no build step.
Live since 2026-09-10 and confirmed by the client.

The enquiry form works end to end: submissions log in Netlify Forms and email
`info@elighting.org`, tested and confirmed received.

## Hard rules — these have all been broken once

**The site is generated. Never hand-edit `site/*.html`.** Page content lives in
`tools/*.py`; run the generator and then `python3 tools/check.py`, which must
report `0 page(s) with problems`. Three separate bugs this project came from
one piece of content existing in two hand-maintained places — the homepage
carousel kept stale project names for a fortnight, and the colour-temperature
slider was dead on residential because the markup and the JS disagreed.
Single-source anything that appears twice.

**Never fabricate** licences, certifications, awards, product counts, years of
experience, manufacturer relationships, testimonials, statistics, guarantees or
pricing. If it is not confirmed by the client or verifiable, it does not go on
the site. Their old site claims "over 30 years" — that is their prior marketing,
not a verified fact, and stays off until Ariel confirms it.

**The word "Concept" must not appear anywhere on the site.**

**Margin figures are internal.** Never in anything client-facing.

**Never edit MX or SPF TXT records on any of these domains.** Live email runs
on them. `info@elighting.org` is printed on every page of the site.

**Client-facing means PDF.** A Claude artifact link will not open for someone
without a Claude account. PDF for the client, links for internal use, never raw
HTML.

**US spelling on the site.** British spellings and nouns have both slipped
through before ("colour", "car park").

## The domain estate — verified, not assumed

| Domain | State |
|---|---|
| `worldwidedistributorsinc.com` | Serves the site. Google Workspace mail. |
| `worldwidedistributors.co` | Forwards here. $59.99/yr, renews 6 Jul 2027. |
| `elighting.org` | Both apex and `www` forward here. **Microsoft 365 mail via GoDaddy, Proofpoint filtering — do not touch.** Also carries `pay.elighting.org` (GoDaddy Payments). |
| `elightingindustries.com` | **Untouched.** Live Shopify store, on Google Cloud DNS. GoDaddy forwarding would migrate the nameservers and destroy the zone including MX. Use Shopify's own Settings → Domains instead. |
| `ewaterindustries.com` | A different company. Not ours. |

Six things have turned up on this estate that nobody in the company knew
about: two Shopify stores, the Duda site, a payments endpoint, and an apparent
agency relationship. **Resolve a domain and look at what answers before
touching it.** "The old domains should point at the new site" is a hypothesis,
not a fact.

## Decided

- The site advertises `info@elighting.org`. Asked directly; the client chose to
  keep what they have.
- Phone is `(305) 969-8754`. Verified independently.
- Hours are Mon–Fri 8am–5pm. Where the old site disagrees, this site is right.
- The site's content is accurate as it stands. Reviewed and confirmed.
- Both `elighting.org` hostnames forward here — the client chose this over
  preserving the Duda catalogue's search rankings, after the trade-off was put
  to them.

## Open

1. **The Shopify login for `elightingindustries.com`.** Gates three things: the
   catalogue build, tidying that domain, and cancelling a plan for a store that
   has never taken an order. Elizabeth is not the account owner, so this may be
   a support request with proof of ownership rather than a password reset.
2. **Who built the eLighting site?** Duda is a white-label platform sold only to
   agencies, so someone outside the business built it and may hold the login and
   the billing. Ask Ariel.
3. **Export the seven Duda product pages before that subscription lapses.** The
   only irreversible item on the list; they are the catalogue's seed content.
4. **Does anyone use an `@elightingindustries.com` address?** One answer decides
   whether that domain can be repointed.
5. The catalogue itself — see `docs/strategy/ecommerce-and-catalog.md`. It is a
   new build, not a migration, and the evidence favours a quote-driven catalogue
   over a checkout.

## Where things are written down

- `deploy/README.md` — the go-live runbook. DNS, the domain audit, email, the
  form, what is still to do, and the traps (a VPN has caused two unexplained
  failures; GoDaddy's Subdomains form will happily destroy a live CNAME).
- `docs/strategy/ecommerce-and-catalog.md` — the catalogue brief.
- `docs/strategy/subscriptions-and-domains.md` — what is being paid for.
- `tools/` — the generators. `check.py` gates the build.
