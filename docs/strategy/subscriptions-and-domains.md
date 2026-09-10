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
| **Netlify** | The new site — all of it | **$0 expected.** Free tier; form submissions are free and unlimited on current plans | **Keep** | Netlify → Team → Billing |
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
