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
