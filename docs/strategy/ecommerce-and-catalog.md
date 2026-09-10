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
