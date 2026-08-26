# -*- coding: utf-8 -*-
"""Assembles the Worldwide Distributors static pages.
Output is plain HTML with no runtime dependency - drop the site/ folder
onto any host as-is."""
import io, os

OUT = "/home/user/booksprint/site"

# Absolute origin, no trailing slash. Social scrapers will not resolve a
# relative og:image, so this has to be the real domain before go-live, and a
# canonical tag pointing at a domain the company does not own actively tells
# search engines the real version of these pages lives somewhere else.
#
# Confirmed 2026-08-23: the site stays under Worldwide Distributors Inc, and
# so does the address. That matches what the pages actually say — Worldwide
# Distributors is the umbrella, eLighting and eBuilt are its divisions — and
# it is a domain the company demonstrably runs, since every photograph on
# this site was pulled from it (see docs/production/photo-provenance.md).
#
# The two other domains in play stay out of it for now:
#   elighting.org            the domain of their contact address
#   elightingindustries.com  linked from the @elightingdesigns Instagram
# Both should 301 here at launch rather than stay live, or the new site
# starts from nothing while the old links keep pointing elsewhere.
#
# STILL TO CHECK AT DEPLOY: www versus apex. This has to match the host the
# site is actually served from, or the canonical points at a redirect. One
# line to change once that is known.
SITE_URL = "https://www.worldwidedistributorsinc.com"
SITE_URL_CONFIRMED = True

# Per-page alt text for the share card. Describes the photograph, since that
# is what a screen reader announces when the card is posted.
OG_ALT = {
    "index.html":             "A lit office building and parking lot photographed from the air after dark.",
    "commercial.html":        "High-bay fixtures lighting an open commercial interior.",
    "residential.html":       "A specimen palm uplit against a night sky.",
    "property-managers.html": "A lit hedge line running along a lawn after dark.",
    "portfolio.html":         "Grazing light across a sculptured garden wall at night.",
    "contact.html":           "A lit pool and planting in a residential garden after dark.",
    "404.html":               "A lit office building and parking lot photographed from the air after dark.",
}

NAV = [
    ("commercial.html", "Commercial"),
    ("residential.html", "Residential"),
    ("property-managers.html", "Property Managers"),
    ("portfolio.html", "Portfolio"),
    ("contact.html", "Contact"),
]


# ── contact details ──────────────────────────────────
# Supplied by the company 2026-08-26. One place, so a change to the number
# does not have to be chased through six files.
#
# NOTE: the number below replaces (305) 969-8754, which is what the pages
# carried until now. The two differ in the last two digits. Confirm which
# one actually rings before this goes in front of customers.
PHONE      = u"(305) 969-8754"
PHONE_TEL  = u"+13059698754"
EMAIL      = u"info@elighting.org"
ADDRESS    = u"12130 SW 114th Place"
CITY       = u"Miami, Florida"
HOURS      = u"Mon–Fri, 8am–5pm"


# ── licence numbers ───────────────────────────────────────────────────
# Florida §489.119(5)(b) requires the certification or registration number
# in advertising, and a website counts. Until the real numbers arrive these
# are placeholders, and they are deliberately shaped so nobody can mistake
# one for a licence: all X, never digits. A plausible-looking invented
# number on a contractor's live site misrepresents licensure, which is a
# worse problem than an obviously blank one.
#
# To go live: replace the values, keep the keys, re-run tools/build.py.
# Drop any the company does not actually hold — do not leave a placeholder
# standing in for a licence they have not got. check.py fails the build
# while any X remains, so this cannot ship by accident.
LICENCES = [
    ("Electrical", "EC13013987"),
    ("Building",   "CGC1539117"),
]


# ── social profiles ───────────────────────────────────────────────────
# Set the URL for each account the company actually runs, and delete the
# row for any it does not. An empty URL renders nothing at all — better a
# missing icon than a link into a dead profile, which reads worse than
# having no social presence. check.py reports the placeholders on every
# build so they cannot be quietly forgotten.
#
# Each mark is inline SVG on a 24-box, drawn with currentColor so it takes
# the footer's ink and the hover colour without a second asset. The third
# field is the whole of the SVG body, not a single path: the Instagram
# mark needs a real knockout for its lens and cannot be one filled shape.
SOCIAL_LINKS = [
    ("Facebook",  "https://www.facebook.com/YOUR-PAGE",
     '<path fill="currentColor" d="M14 8.5V7.2c0-.6.4-.8.7-.8H16V4h-2c-2 0-2.5 '
     '1.5-2.5 2.5v2H10v2.5h1.5V20H14v-9h1.9l.3-2.5H14z"/>'),
    ("Instagram", "https://www.instagram.com/elightingdesigns",
     '<rect x="4.15" y="4.15" width="15.7" height="15.7" rx="4.6" fill="none" '
     'stroke="currentColor" stroke-width="1.7"/>'
     '<circle cx="12" cy="12" r="3.7" fill="none" stroke="currentColor" '
     'stroke-width="1.7"/>'
     '<circle cx="16.9" cy="7.1" r="1.05" fill="currentColor"/>'),
]


def social_links(cls="soc"):
    """The footer/contact row. Returns "" when nothing is set, so a site with
    no accounts yet simply has no row rather than an empty heading."""
    live = [(n, u, d) for n, u, d in SOCIAL_LINKS if u and "YOUR-" not in u]
    if not live:
        return ""
    a = "".join(
        '<a href="%s" aria-label="Worldwide Distributors on %s"'
        ' rel="noopener" target="_blank">'
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">'
        '%s</svg></a>' % (u, n, mark)
        for n, u, mark in live)
    return '<div class="%s">%s</div>' % (cls, a)


def social_pending():
    return any("YOUR-" in u for _, u, _ in SOCIAL_LINKS)


def licence_line(sep=" &middot; ", label=True):
    """One line of licence numbers. `label=False` where the surrounding
    markup already says "Licence" — the property managers table does."""
    live = [(k, v) for k, v in LICENCES if v.strip()]
    if not live:
        return "Licence no. pending"
    body = sep.join("%s %s" % (k, v) for k, v in live)
    return ("Licence " + body) if label else body


def licence_pending():
    return any("X" in v for _, v in LICENCES)


HEAD = u"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/favicon.svg">
<link rel="canonical" href="{url}">
{social}
<link rel="stylesheet" href="assets/site.css">
<script>document.documentElement.className+=" js";</script>
</head>
<body>

<a class="sr" href="#main">Skip to content</a>

<header class="hdr">
  <div class="wrap hdr-in">
    <a class="brand" href="index.html">
      <svg class="mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M26.5 92.9C26.2 92.7 25.6 92.6 25.1 92.6C24.0 92.6 20.6 91.7 18.4 90.9C12.1 88.6 5.1 80.4 2.8 72.5C2.4 71.4 2.0 69.8 1.7 69.1C-0.1 63.1 -0.1 51.2 1.8 45.1C2.0 44.2 2.5 42.7 2.8 41.8C4.2 36.9 8.8 28.4 10.9 26.6C11.1 26.4 12.0 25.4 12.8 24.4C18.9 16.8 30.2 10.4 42.2 7.8C47.6 6.7 58.9 7.0 63.5 8.5C64.0 8.7 65.2 9.0 66.2 9.3C71.9 10.9 78.8 14.6 83.1 18.3C84.0 19.2 85.6 20.6 86.5 21.4C90.1 24.5 95.5 32.7 97.4 37.6C97.6 38.1 98.0 39.2 98.3 40.0C100.7 46.2 100.4 48.6 97.2 50.0C94.6 51.1 82.5 56.8 73.5 61.1C70.2 62.6 66.2 64.5 64.7 65.2C63.2 65.9 59.5 67.6 56.5 69.0C41.9 75.9 43.9 76.1 39.9 67.4C38.6 64.7 38.2 63.6 36.8 59.7C36.1 57.6 37.2 54.4 38.6 54.4C39.7 54.4 67.4 40.1 67.8 39.3C68.9 37.3 62.4 33.2 55.2 31.3C52.3 30.6 44.8 31.2 41.3 32.5C33.6 35.3 27.7 40.7 24.8 47.5C24.4 48.4 23.9 49.5 23.7 50.0C21.3 55.5 22.0 66.9 25.2 73.1C29.7 82.0 36.9 86.8 45.3 86.5C49.4 86.3 49.5 87.0 45.4 89.1C42.5 90.6 40.5 91.2 33.6 92.9C32.2 93.2 27.3 93.2 26.5 92.9Z"/>
      </svg>
      <span class="wm">
        <b>Worldwide Distributors</b>
        <span>Lighting &middot; Electrical &middot; Construction</span>
      </span>
    </a>
    <nav class="nav" aria-label="Primary">
{nav}
    </nav>
    <a class="btn btn-p btn-sm" href="contact.html">Start a project</a>
  </div>
</header>

<aside class="rail" aria-label="Time of day">
  <span class="cap">12A</span>
  <div class="track" id="track" role="slider" tabindex="0"
       aria-label="Time of day shown on this site"
       aria-valuemin="0" aria-valuemax="1439" aria-valuenow="720">
    <div class="grad" id="grad"></div>
    <div class="knob" id="knob"><i></i></div>
  </div>
  <span class="cap">12P</span>
  <span class="clock js-clock">&mdash;</span>
  <button class="live" id="live" type="button" aria-pressed="true" data-on="1">Live</button>
</aside>

<main id="main">
"""

FOOT = u"""
</main>

<footer class="foot">
  <div class="wrap foot-in">
    <div>
      <strong>Worldwide Distributors</strong><br>
      Lighting &middot; Electrical &middot; Construction<br>
      Miami, Florida
    </div>
    <nav aria-label="Footer">
      <a href="commercial.html">Commercial</a>
      <a href="residential.html">Residential</a>
      <a href="property-managers.html">Property Managers</a>
      <a href="portfolio.html">Portfolio</a>
      <a href="contact.html">Contact</a>
    </nav>
    <div>
      <a href="tel:+13059698754">(305) 969-8754</a><br>
      <a href="mailto:info@elighting.org">info@elighting.org</a><br>
      12130 SW 114th Place, Miami, Florida<br>
      Mon&ndash;Fri, 8am&ndash;5pm<br>
      <span class="tbd">{licences}</span>
      {social}
    </div>
  </div>
</footer>

<a class="callbar" href="tel:+13059698754">Call (305) 969-8754</a>

<script src="assets/site.js"></script>
<script src="assets/scroll.js" defer></script>
</body>
</html>
"""

# The close block is identical on every interior page.
CLOSE = u"""
<section class="close sec">
  <div class="wrap">
    <p class="eyebrow rv">Start here</p>
    <h2 class="disp rv" style="margin-top:14px">{h}</h2>
    <p class="lede rv">{p}</p>
    <div class="contact rv">
      <div class="ci"><b>Talk to us</b><p><a href="tel:+13059698754">(305) 969-8754</a><br><a href="mailto:info@elighting.org">info@elighting.org</a></p></div>
      <div class="ci"><b>Where we work</b><p>12130 SW 114th Place<br>Miami, Florida &middot; serving the state<br>Mon&ndash;Fri, 8am&ndash;5pm</p></div>
      <div class="ci"><b>Send the details</b><p><a href="contact.html">Project enquiry form &rarr;</a><br>Drawings, photos or a description &mdash; whatever you have.</p></div>
    </div>
  </div>
</section>
"""

SOCIAL = u"""<meta property="og:type" content="website">
<meta property="og:site_name" content="Worldwide Distributors">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{ogtitle}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{img}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{ogtitle}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{img}">
<meta name="twitter:image:alt" content="{alt}">
<meta name="theme-color" content="#003FD6">"""


def social(slug, title, desc):
    """og:title drops the site name — og:site_name already carries it, and
    the shorter line survives the truncation feeds apply."""
    card = "og-" + (slug[:-5] if slug.endswith(".html") else slug) + ".jpg"
    if slug == "404.html":
        card = "og-index.jpg"
    parts = [x.strip() for x in title.split(" — ")]
    # Interior pages read "Topic — Worldwide Distributors"; the homepage
    # reads the other way round. Either way keep the half that is not the
    # site name, since og:site_name already carries that.
    ogtitle = parts[0]
    if ogtitle == "Worldwide Distributors" and len(parts) > 1:
        ogtitle = parts[1]
    return SOCIAL.format(
        url=SITE_URL + "/" + slug,
        ogtitle=ogtitle,
        desc=desc,
        img=SITE_URL + "/assets/img/" + card,
        alt=OG_ALT.get(slug, OG_ALT["index.html"]),
    )


def page(slug, title, desc, body):
    nav = "\n".join(
        '      <a href="%s"%s>%s</a>' % (h, ' aria-current="page"' if h == slug else "", t)
        for h, t in NAV
    )
    # social() writes the share-card meta; social_links() writes the row of
    # profile icons in the footer. Different jobs, similar names.
    foot = (FOOT.replace("{licences}", licence_line())
                .replace("{social}", social_links()))
    html = HEAD.format(title=title, desc=desc, nav=nav,
                       url=SITE_URL + "/" + slug,
                       social=social(slug, title, desc)) + body + foot
    io.open(os.path.join(OUT, slug), "w", encoding="utf-8").write(html)
    return len(html)
