# Worldwide Distributors — website

Plain static HTML, CSS and JavaScript. No build step, no framework, no
dependencies. Upload the contents of this folder to the web root
(`public_html/` on Hostinger) and it runs.

## What is here

```
index.html              home
commercial.html         commercial buildouts and tenant improvements
residential.html        landscape and permanent lighting, residential electrical
property-managers.html  property and association managers
portfolio.html          past work, filterable, day and night
contact.html            contact details and the project enquiry form
404.html                not-found page
contact.php             enquiry form handler (see below)
.htaccess               extensionless URLs, 404 page, compression, caching
robots.txt, sitemap.xml
assets/site.css         all styling
assets/site.js          the clock: one time value drives every colour
assets/scroll.js        scroll scenes; optional, the site works without it
assets/img/             photography and video
```

## The clock

The whole palette is driven by one value: the visitor's local time. `site.js`
recomputes the sky, surface, text, line and accent colours on every frame and
writes them to CSS custom properties on `:root`. Nothing else in the stylesheet
hardcodes those colours. The rail on the right lets a visitor scrub the time;
"Live" returns to their actual clock.

Day and night photography crossfade on the same value — every `.hero-shots`
and `.tile` carries a `.day` and a `.night` image.

With JavaScript off the site renders in its daylight palette and every section
is visible; the reveal animations are gated behind a `js` class so they can
never leave content hidden.

## Before go-live

- **Licence numbers.** Every place a contractor licence belongs is marked
  `Licence no. pending` with the `.tbd` class. Search for `tbd` to find them
  all. Florida requires the licence number in advertising, websites included.
- **Phone and email.** `(305) 969-8769` and `info@elighting.org` are used
  throughout — confirm both, then search and replace.
- **Photography.** Every image is currently a concept rendering, labelled as
  such on the page (`Concept imagery — pending project photography` and the
  `Concept` badge on each tile). Replace with real jobs shot twice: once in
  daylight, once after dark, from the same position. Do not remove the labels
  until the images are real.
- **Domain.** `sitemap.xml` and `robots.txt` reference
  `worldwidedistributorsinc.com`.

## The enquiry form

`contact.html` posts to `contact.php`, which validates the fields and mails
them on. Set `$TO` at the top of that file to the address that should receive
enquiries. It uses PHP's `mail()`, which works on Hostinger shared hosting but
lands in spam more often than a real sending service — if enquiries matter,
point the form at a form service or SMTP instead.

The form has a hidden honeypot field named `website`. Real visitors never fill
it in; submissions that do are silently discarded.

## Editing

Pages are plain HTML — edit them directly. The repeated chrome (head, header,
time rail, footer) is duplicated in each file rather than included, so if you
change it in one place, change it everywhere. `../tools/` holds small scripts
that regenerate the interior pages from a shared template if you would rather
not do that by hand — one command, `python3 tools/build.py`. See
`../tools/README.md`.
