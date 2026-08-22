# -*- coding: utf-8 -*-
"""Assembles the Worldwide Distributors static pages.
Output is plain HTML with no runtime dependency - drop the site/ folder
onto any host as-is."""
import io, os

OUT = "/home/user/booksprint/site"

NAV = [
    ("commercial.html", "Commercial"),
    ("residential.html", "Residential"),
    ("property-managers.html", "Property Managers"),
    ("portfolio.html", "Portfolio"),
    ("contact.html", "Contact"),
]

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
<link rel="stylesheet" href="assets/site.css">
<script>document.documentElement.className+=" js";</script>
</head>
<body>

<a class="sr" href="#main">Skip to content</a>

<header class="hdr">
  <div class="wrap hdr-in">
    <a class="brand" href="index.html">
      <svg class="mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <mask id="hdr-e"><rect width="100" height="100" fill="#fff"/><g fill="none" stroke="#000" stroke-width="9.5" stroke-linecap="round"><path d="M27.5 50H72.5"/><path d="M72.5 50A22.5 22.5 0 1 0 62.9 68.4"/></g></mask>
        <circle cx="50" cy="50" r="46" fill="currentColor" mask="url(#hdr-e)"/>
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
      <a href="tel:+13059698769">(305) 969-8769</a><br>
      <a href="mailto:info@elighting.org">info@elighting.org</a><br>
      <span class="tbd">Licence no. pending</span>
    </div>
  </div>
</footer>

<a class="callbar" href="tel:+13059698769">Call (305) 969-8769</a>

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
      <div class="ci"><b>Talk to us</b><p><a href="tel:+13059698769">(305) 969-8769</a><br><a href="mailto:info@elighting.org">info@elighting.org</a></p></div>
      <div class="ci"><b>Where we work</b><p>Headquartered in Miami, Florida.<br>Serving Florida.</p></div>
      <div class="ci"><b>Send the details</b><p><a href="contact.html">Project enquiry form &rarr;</a><br>Drawings, photos or a description &mdash; whatever you have.</p></div>
    </div>
  </div>
</section>
"""

def page(slug, title, desc, body):
    nav = "\n".join(
        '      <a href="%s"%s>%s</a>' % (h, ' aria-current="page"' if h == slug else "", t)
        for h, t in NAV
    )
    html = HEAD.format(title=title, desc=desc, nav=nav) + body + FOOT
    io.open(os.path.join(OUT, slug), "w", encoding="utf-8").write(html)
    return len(html)
