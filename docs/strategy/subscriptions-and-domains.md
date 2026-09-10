# What is being paid for

Assembled 2026-09-10 from DNS verification, the GoDaddy dashboards seen during
the cutover, and what the client confirmed on two calls.

**Read the cost column carefully.** Only one figure here has been seen on an
actual invoice. Everything else is marked *confirm* — the platform is verified,
the price is not, and nothing should be quoted to the client as a number until
it has been read off the billing page named in the last column. No amounts have
been estimated or filled in from list prices.

**Why nobody has a clear picture: the bills are spread across at least five
places.** Three separate GoDaddy accounts (one of them named "E-Lighting"), a
Google Workspace admin console, a Shopify admin nobody can log into, plus Duda
and Netlify. That is the actual finding here — not any single subscription.

## Domains

| Domain | Registrar | Cost | Keep? | Where to check |
|---|---|---|---|---|
| `worldwidedistributorsinc.com` | GoDaddy | confirm | **Keep** — this is the live site and the Workspace mail domain | GoDaddy → Renewals |
| `worldwidedistributors.co` | GoDaddy | **$59.99/yr, renews 6 Jul 2027** | Decide — forwards here, adds nothing else | GoDaddy → Renewals |
| `elighting.org` | GoDaddy ("E-Lighting" account) | confirm | **Keep — load-bearing.** `info@elighting.org` is printed on every page of the new site | GoDaddy → Renewals |
| `elightingindustries.com` | Google/Squarespace (NS is Google Cloud DNS) | confirm | Decide — the Shopify domain | Squarespace/Google Domains billing |

`ewaterindustries.com` also appeared in the audit. It is a **different company**
and not on this bill — noted only so it does not cause confusion later.

## Hosting and site platforms

| Service | What it serves | Cost | Keep? | Where to check |
|---|---|---|---|---|
| **Netlify** | The new site — all of it | **$0 — confirmed.** Account is on a credit-based plan, where form submissions are free and unlimited | **Keep** | verified 2026-09-10 |
| **Duda** | Was `www.elighting.org`. **Now unreachable** — that hostname forwards to the new site | confirm | **Cancel — after exporting the seven product pages.** They are the catalog's starting inventory and vanish with the subscription | Duda account billing |
| **Shopify** | `elightingindustries.com` | confirm | **Cancel candidate — has never taken a single order** (client confirmed) | Shopify admin → Settings → Billing |
| **GoDaddy Website Builder** | Was `worldwidedistributorsinc.com`. **Now unreachable** — last published Mar 2024 | confirm | **Cancel** | GoDaddy → My Products |

## Email — handle with care

Nothing in this section should be cancelled without checking who reads it.
Mail is the one thing on this list that breaks silently and costs business.

| Service | Domain | Cost | Keep? | Where to check |
|---|---|---|---|---|
| **Microsoft 365** (resold by GoDaddy, Proofpoint filtering) | `elighting.org` — carries `info@elighting.org` | confirm, per mailbox | **Keep. Do not touch.** Every page of the new site points here, and enquiries now arrive here | GoDaddy → My Products → Email |
| **Google Workspace** | `worldwidedistributorsinc.com` — `elizabeth@`, described as "just the admin one"; Ariel has no mailbox | confirm, per seat | **Review** — how many seats are billed versus actually used | Google Admin → Billing |
| **Google MX also present** | `worldwidedistributors.co` | confirm | Review with the above | Google Admin → Billing |
| **hostedemail.com** | `elightingindustries.com` | confirm | **Unknown — ask first.** Does anyone use an `@elightingindustries.com` address? | Ask the client |

## Payments

| Service | Where | Cost | Keep? |
|---|---|---|---|
| **GoDaddy Payments** | `pay.elighting.org` is configured for payment links | confirm — typically per-transaction rather than monthly, but verify | Ask — nobody has mentioned this existing |

## The short version for the client

- **The new website costs nothing to host.** Netlify's free tier covers it, forms included.
- **Three things are being paid for that serve nothing:** the Duda site and the GoDaddy Website Builder site are both already unreachable, and the Shopify store has never taken an order.
- **One thing must not be touched:** the Microsoft 365 mail on `elighting.org`, because `info@elighting.org` is the address on the whole new site.
- **The Shopify login is the most valuable missing item.** It gates the catalog build, tidying that domain, and cancelling a charge that has returned nothing.
- **Only one price here has been verified.** The rest need ten minutes across the billing pages above before any total is put in front of anyone.

## Someone outside the business built these

Two facts landed together on 2026-09-10 and they point the same way.

**Elizabeth does not know the Shopify store or its domain exists.** She was
not involved in setting it up.

**The `elighting.org` site is on Duda, which is not sold to business owners.**
It is a white-label platform sold to agencies and web professionals, who
rebrand the whole product — Duda advertises white labeling covering everything
"from the editor interface to client-facing communications." A business owner
would never know they were on Duda; they would know they were "with [some web
company]." Not recognising the name is the expected result, not an oversight.

**So the likely shape of this: there is no Duda invoice.** There is an invoice
from a web designer or marketing company who pays Duda, holds the login, and
may well have built the Shopify store too. Cancelling goes through them, not
through Duda.

That makes both of these the fifth and sixth things on this estate that nobody
in the company knew about — after the two Shopify stores, the Duda site itself,
and the `pay.elighting.org` payments endpoint.

### The question that probably unlocks it

**Who built the eLighting website — a designer, an agency, an employee since
departed?** One name likely produces the Duda login, possibly the Shopify
credentials, and an explanation for charges nobody can place. Ask Ariel; this
appears to predate Elizabeth.

### Two consequences worth acting on

**The bank statement stops being a nice-to-have.** If the Shopify charge is on
their statement, they are paying monthly for something Elizabeth does not know
exists. If it is *not* on their statement — and the store is serving pages, so
someone is paying — then **a third party is funding and controlling a domain
carrying this company's brand.** That is a business exposure to raise with
Ariel, not a billing detail.

**Shopify recovery may not be a password reset.** If Elizabeth is not the
account owner, the reset mail goes to whoever is. That route is Shopify support
with proof of ownership — business documents, domain control — and is worth
starting before more weeks go into the login page.

## Delivering these to a client

**Claude artifact links do not open for someone without a Claude account.**
Established the hard way, 2026-09-10. So the rule for anything going to Ariel,
Elizabeth or any customer is:

- **Client-facing → PDF.** Always. It opens for everyone, on any device, gets
  filed and forwarded, and reads as a document from the practice rather than a
  tool's output.
- **Internal / for Ferron → artifact link.** Fine for anyone with Claude, and it
  updates in place while a document is still changing.
- **Never send raw HTML.** Mail clients block or strip it, Gmail will not
  preview it, and phones download rather than open it.

One caveat on PDFs generated in the session container: **`fonts.googleapis.com`
is blocked by the egress proxy there**, so a PDF rendered in-session falls back
to whatever is installed locally — Liberation Sans and DejaVu Sans Mono, aliased
onto the intended families so the layout still holds. Printing the same page
from a normal browser gets the real typefaces, because that machine can reach
Google Fonts. For a document where the typography matters, print it from the
browser; for one that just needs to be correct and legible, the in-session
render is fine.
