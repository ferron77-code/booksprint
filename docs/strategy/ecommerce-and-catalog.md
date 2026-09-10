# The e-commerce site / catalog

Noted 2026-09-10. Ariel wants a product catalog or store built as a separate
site, integrated into `worldwidedistributorsinc.com` "somehow." Not started;
this is the brief and the constraints, written while the domain estate is
fresh so the work does not begin from a blank page.

## Do not start by building

Two product-facing assets already exist. A third built from scratch would
throw away whatever is in them and would compete with them in search.

| Asset | State | What it holds |
|---|---|---|
| `elightingindustries.com` | Live Shopify store | Product data, and presumably orders, customers and SEO history |
| `www.elighting.org` | Live Duda site | `/products`, `/landscape-lighting`, `/studio-and-stage-lighting` — indexed and ranking |

**The blocking task is recovering the Shopify login.** As of the 2026-09-10
call it has not been: "I'm still trying to get the login." That one answer
decides whether this project is *migrate an existing store* or *build a new
one*, and every other decision here sits downstream of it. Building first and
finding the login afterwards means paying to rebuild a catalog that already
existed and splitting the brand's search presence across two stores.

So the order is: get into Shopify → see what is in there → then choose a
platform. Not the reverse.

## There may already be a payments account

`elighting.org` carries a `pay` CNAME to `paylinks.commerce.godaddy.com` —
**GoDaddy Payments payment links**. Someone configured this domain to take
money at `pay.elighting.org`, and nobody has mentioned it.

Add it to the list of things to establish before building: is there a GoDaddy
Payments account, does it have transaction history, and are there live payment
links out on invoices or in sent email? If card payments are already being
taken somewhere, that changes both the "catalog or store" question and who the
merchant of record would be.

Full record list and the rest of what it revealed:
`deploy/README.md`, "The full `elighting.org` record set."

## The Shopify store has never taken an order

Confirmed by the client on the 2026-09-10 call: `elightingindustries.com` has
never produced a single order.

**What that settles.** The catalog is a **new build, not a migration** — there
is no order history, customer list or working sales operation to carry across,
so the earlier "migrate or build" question resolves to build. It also removes
the concern about breaking a live checkout or abandoned-cart links; there is no
transaction flow to disturb.

More usefully, it is strong evidence for the **catalog-with-quote-requests**
shape over a checkout. A real Shopify store with a real cart has been live on
this brand and taken zero orders in its lifetime. Building a second checkout
and expecting a different result needs a reason, and "we already tried that"
is a hard fact to argue with. The site's own words remain the better read of
the business: fixtures sourced at distributor pricing and handed over, which
is a quote, not a shelf price.

**What it does not settle — and this is the part to hold onto.** It says
nothing about the DNS hazard. GoDaddy forwarding would still migrate the
domain off Google Cloud DNS and discard the zone, MX record included. "No
orders" is about sales; the risk was always the mail. Do not read one as
permission for the other.

**The question that would settle it:** does anyone actually use an
`@elightingindustries.com` email address? There is an MX record pointing at
`hostedemail.com`, so a mailbox was set up at some point. If nobody uses it,
the zone is worthless and the domain becomes genuinely free to repoint. If
someone does, the zone has to be reproduced before anything moves. That is a
far more answerable question than "did the site produce leads," and it is the
one to put to Elizabeth next.

**And there is probably money leaking.** A Shopify store that is still serving
pages is almost certainly still on a paid monthly plan. Nothing has come back
from it, ever. Recovering that login is no longer just housekeeping for the
catalog — it likely stops a recurring charge. Worth checking the actual billing
amount once inside.

## Decision, 2026-09-10: everything forwards

The client's decision is to forward `www` as well as the apex, now, rather
than waiting for the catalog. The concern below was raised and the decision
reaffirmed, so this is the instruction and not an open question.

**What that changes, and what it does not.** Overwriting the `www` CNAME makes
the Duda site unreachable *at that address*. It does not delete anything: the
pages still exist inside Duda and remain retrievable from the Duda dashboard
for as long as the subscription is paid. The destructive step is cancelling
that subscription, not the DNS change — and the DNS change is reversible by
re-adding `www CNAME s.dudaone.com.`

So the content-saving below stays on the list. It is no longer a precondition
for forwarding; it is a precondition for **cancelling Duda**. Keep paying until
the seven pages are out.

The SEO cost is accepted: those pages will 301 onto a site with no products,
so their rankings are spent rather than transferred, and the catalog will
start from zero on search.

## Save the Duda content before anything else

**This is the only step with no undo, and it does not depend on any decision
being made first.** Copy the content off those seven pages — product lists,
descriptions, images, copy — and commit it here.

The domain can be forwarded and un-forwarded. Rankings can be lost and
rebuilt, slowly. But the Duda subscription is presumably being paid monthly,
and the moment it lapses those pages are gone. They are the starting inventory
for this project; losing them means writing from scratch a catalog that
already existed.

Note also that **cancelling Duda and forwarding the domain are two separate
actions.** Stopping the subscription is where any cost saving actually comes
from, and it takes the pages down on its own — at which point forwarding is
correct, because it would then be redirecting a dead page rather than a live
one. The sequence that loses least:

1. Copy the content out.
2. Let the Duda subscription lapse.
3. Leave the domain unforwarded meanwhile. Nothing breaks; the email is
   unaffected either way.
4. Once the catalog is live, map `elighting.org` into it **page to page** —
   `/landscape-lighting` onto the new landscape page, not onto the homepage.
   That is where the rankings transfer instead of evaporating, and it is only
   available if the catalog exists first.

### On "has it ever produced leads"

Worth being careful with the answer to this, because the data to support it
does not exist. Leads from that site arrived as email to `info@elighting.org`
or as phone calls, indistinguishable from any other enquiry. Nobody attributes
phone calls to a website without setting that up first, so the honest answer
will be a guess in the direction of "not really." *We cannot see any leads* and
*it produces no leads* are different claims.

Better sources than recollection: the **GoDaddy Conversations inbox** (16
messages, 2 in the last 30 days as of writing — these may themselves be the
answer), **Duda's built-in visitor stats**, and Google Search Console if it was
ever connected.

## The integration question is really the address

"Integrate it into this website" resolves to one of three URL shapes, and the
choice has consequences that are hard to reverse later.

**Its own domain**, e.g. the store stays on `elightingindustries.com`, with
links between the two sites. Zero technical risk and no work. The cost is that
neither site builds authority for the other; they stay two brands in search.

**A subdomain**, `shop.worldwidedistributorsinc.com`. What Shopify supports
natively and what most people choose. Clean and quick. The cost is that search
engines treat a subdomain as substantially a separate site, so the store's
rankings and this site's rankings largely do not compound.

**A subfolder**, `worldwidedistributorsinc.com/shop`. The best outcome for
search — everything accrues to one hostname — and the hardest to build,
because the store is not hosted here. Netlify can serve a remote origin under
a local path with a proxy rewrite (a `[[redirects]]` rule with
`status = 200` pointing at the store's host), which is the standard technique.

**The catch worth knowing before promising anyone a `/shop` URL:** proxying
*hosted Shopify* into a subfolder fights the platform. Absolute URLs, cookie
domains, the checkout flow and Shopify's own canonical-domain handling all
assume the store owns its hostname. It is routinely attempted and routinely
painful.

Which means **the platform choice and the URL shape are coupled**, and that is
the thing to decide deliberately:

- Want plain hosted Shopify? Then realistically it is a **subdomain**.
- Want `/shop` on this domain? Then it wants to be **headless** — Shopify's
  Storefront API, or a catalog built into this site — not a proxied storefront.

## Consider whether a store is what is needed

Ariel said "catalog list," and a catalog is not the same thing as a store.
Worth testing before committing to a platform, a monthly fee and a checkout,
because **this business does not sell by add-to-cart.** This site already says
so, in its own words on `commercial.html`:

> Supply only. You can also just buy the package. We source fixtures, doors,
> windows and materials at distributor pricing and hand them to your own crew.

That is a quote motion, not a retail motion. Distributor pricing is negotiated
and project-scoped; it is not a shelf price.

So there is a cheaper intermediate that may fit better: **a catalog built into
this site**, generated from a product list by `tools/` the same way every other
page here is, with "Request a quote" running into the enquiry form that already
works. No cart, no payment processing, no platform subscription, no PCI
surface — and it consolidates onto this domain from day one. Add a real
checkout later if transactional selling turns out to justify it.

The honest counter-argument: if they genuinely want customers buying fixtures
by card without a conversation, that is a real store and this is the wrong
shape. Ariel is the one who knows which it is.

## The hook already exists

Whatever gets built, it does not need new architecture to attach to. This site
has three places already pointing at supply:

- `commercial.html` — the "Supply only" block quoted above
- `contact.html` — the enquiry form's *"Supply only — buying the package"*
- `portfolio.html` — *"Supply · Fixtures sourced at distributor pricing"*

Three existing entry points to link from. Also note the standing decision that
source-and-supply is **not** a third division — it sits under eLighting — so
the catalog should not be presented as one.

## This makes the elighting.org advice firmer

The advice was already not to forward `elighting.org`, because its product
pages would 301 onto a site with no products and lose their rankings.

That now has a second reason: **those pages are the seed content for this
project.** `/products`, `/landscape-lighting` and `/studio-and-stage-lighting`
are an existing, ranking, hand-titled product catalog. They are the starting
inventory for whatever gets built, and the SEO equity that a new catalog would
otherwise have to earn from zero. Switching them off before the replacement
exists would be throwing away the only asset this project starts with.

Leave that domain alone until the catalog is live and can absorb it.

## What Ariel needs to decide

1. Has the Shopify login been recovered, and what is in that store?
2. Catalog with quote requests, or a real checkout with card payments?
3. If a checkout: hosted Shopify on a subdomain, or headless at `/shop`?
4. Does the Duda site's product content come across, and does that domain
   then redirect into the new catalog?
5. Does the store trade as eLighting or as Worldwide Distributors?

Nothing here is blocked on the current site, which is finished and live.
