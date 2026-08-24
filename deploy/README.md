# Putting the site somewhere the client can review it

`site/` is the whole deliverable: 409 files, 29 MB, already built. There is no
build step on the server — it serves finished files.

One thing is not static. `contact.php` is the enquiry handler, so the form only
actually sends on a host that runs PHP. Everything else works anywhere.

## Hostinger (their host, and the one the production notes assume)

1. hPanel → Domains → Subdomains → create `preview` (or `staging`).
2. Upload the **contents** of `site/` into that subdomain's folder — not the
   folder itself, or every page lands one level too deep.
3. Upload `deploy/robots.staging.txt` over `robots.txt`. This matters: a second
   live copy of the site competes with the real one in search.
4. hPanel → the subdomain → password-protect it. A client-review URL that
   anyone can find is a client-review URL a competitor can find.
5. Check the PHP settings in `docs/production/enquiry-form.md` before testing
   the form — the defaults reject the attachment sizes the form allows.

## If they cannot get hosting access today

Netlify Drop (`app.netlify.com/drop`) takes a dragged folder and returns a URL
in about a minute, free, no account needed to start. Everything works **except
the enquiry form**, because there is no PHP — the form will look right and do
nothing. Say so before showing it, or the one thing that breaks will be the one
thing they test.

## What not to do

Do not put a review copy on the production domain root. The canonical tags all
point at `https://www.worldwidedistributorsinc.com`, which is correct for
launch and wrong for a preview sitting anywhere else.

## The zip

`deploy/wwd-site.zip` is the whole of `site/` in one file, for dragging onto
Netlify Drop. It is deliberately **not** tracked in git — it duplicates files
that are already in the repo, and git keeps every version of every blob
forever, so committing 28 MB on each rebuild would grow the repository
permanently for something one command reproduces:

    cd site && zip -qr ../deploy/wwd-site.zip .
