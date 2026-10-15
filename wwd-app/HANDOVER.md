# Work order app — handover checklist

Written 15 Oct 2026. The aim is that Worldwide Distributors can run this
without me, and that I keep access to help. Both, not either.

Nothing here is urgent in the sense of breaking today. All of it matters the
day I am not reachable.

---

## What exists

| Piece | Identifier |
|---|---|
| Database, auth, file storage, workers | Supabase project `wwd-workorders` (`sdjheotlpvvkdovrccol`), region us-east-1 |
| Supabase organisation | "Worldwide Distributors" (`pypslzrbapqaustltmpv`) — **free plan** |
| Hosting | Netlify site `wwd-workorders`, currently on my personal team `ferron77` |
| Code | `ferron77-code/booksprint`, branch `claude/new-session-qh7uls`, under `wwd-app/` |
| Deployable bundle | `wwd-app/web/` — 15 files, flat, dropped as a zip |
| Edge functions | `translate-notes` (v6), `scan-ticket` (v5), `storage-sweep` |
| Domain | `worldwidedistributorsinc.com` at GoDaddy — **already theirs** |

As of today: 21 work orders, 75 checklist lines, 37 files (14 MB), 36 MB
database, 15 user accounts.

## Who owns what today

Of the five things this app needs, they own one — the domain. Everything else
is in my name. That is the whole problem this checklist solves.

---

## 1. Supabase — add them as owners, and leave the free plan

**Why the plan matters:** the free tier takes **no automatic backups**. This is
now the record of what work was done, who did it, and what was invoiced. A free
project that loses data has no restore point. Pro is $25/month and includes
daily backups with 7-day retention.

Storage is not the reason to upgrade — 14 MB of a 1 GB allowance after three
weeks. The backups are.

- [ ] Upgrade the org to Pro, **billed to their card, not mine**
- [ ] Settings → Team → invite Ariel and Elizabeth as **Owner**
- [ ] Keep my account as Owner as well
- [ ] Confirm a backup has actually run (Database → Backups) before calling it done
- [ ] Turn on leaked-password protection (Authentication → Policies) — still off

## 2. The Anthropic API key — the one that is easy to miss

The Spanish translation runs on **my** API key, stored as a Supabase function
secret, billed to **me**. Hand over without changing it and translations keep
working right up until I rotate that key or stop paying. Then they stop, with
no error anyone will see — notes simply stay in one language.

- [ ] They create their own key at console.anthropic.com on their billing
- [ ] Replace `ANTHROPIC_API_KEY` in Supabase → Edge Functions → Secrets
- [ ] Add a note, wait a minute, confirm the Spanish appears
- [ ] Only then remove my key from their account

Cost at current volume is small — on the order of a few dollars a month — but
it has to be *their* small bill, not mine.

## 3. Netlify — move it off my personal team

- [ ] Create a Netlify team owned by them
- [ ] Transfer the `wwd-workorders` site into it
- [ ] Add me as a member of that team
- [ ] Re-check the custom domain after the transfer; it does not always follow

## 4. GitHub — split the app out

One personal repo currently holds both the marketing site and this app, which
makes "give them the code" awkward.

- [ ] New repo under an account they control, containing `wwd-app/` only
- [ ] Add me as a collaborator
- [ ] Link the Netlify site to it (publish directory `wwd-app/web`, build
      command **blank**) so deploys stop being manual zip drops

## 5. The subdomain

`workorders.worldwidedistributorsinc.com` → `wwd-workorders.netlify.app`

- [ ] GoDaddy → **DNS tab** → add CNAME, host `workorders`, value
      `wwd-workorders.netlify.app`
- [ ] Netlify → the site → Domain management → add the custom domain
- [ ] Wait for the certificate, then open it on a phone

**Use the DNS tab, not Forwarding.** GoDaddy's Forwarding → Subdomains form
demands a value and will overwrite a live CNAME. This bit us on the marketing
site.

This touches neither the apex, nor `www`, nor the MX records, so the marketing
site and `info@elighting.org` are unaffected.

## 6. Decide what happens with sign-ins

Every account is `name@wwdi.local`. That domain does not exist, so **no
password reset email can ever arrive.** The only way to reset anyone is for
someone with Supabase dashboard access to do it by hand.

Two options, pick one before handover:

- Leave as is, and whoever holds Supabase access resets passwords on request.
  Fine while the crew is small and someone technical is reachable.
- Move the office accounts to real email addresses so they can self-serve.
  The crew can stay on `.local` — they rarely sign out.

---

## Gotchas this project has already cost us

- **Deploys are manual.** Drop the zip on Netlify → Deploys. The zip itself,
  never an unzipped folder. "1 new file uploaded" is normal — Netlify skips
  files whose contents have not changed.
- **A phone keeps the old code until the app is fully closed.** Swiped out of
  the app switcher, not just backgrounded. The service worker is network-first,
  so a true reload always picks up the new build.
- **A VPN can serve a stale site** long after a deploy. Cost us an afternoon on
  the marketing site.
- **`signOut()` is global.** Signing out on one device signs that user out
  everywhere. Do not sign out of the phone app while logged in as a technician
  — it kicks them off in the field.
- **Do not edit MX or SPF records** on any of these domains. Email runs on them.

## Still open in the code

- `signOut()` should be `scope: 'local'` — one line, not yet done
- Site data blocked in Safari kills the phone app outright; `createClient`
  touches storage before the guard runs. Needs a storage shim.
- A note that fails translation four times stays silently `pending` forever.
  The crew sees the English, so nothing is lost, but nobody is told.
- Two duplicate notes on WO-1001 from 14 Oct, safe to remove from the board
- `wwd-app/technician/` is a stale snapshot; `wwd-app/web/` is the truth
