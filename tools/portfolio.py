# -*- coding: utf-8 -*-
"""Writes portfolio.html from the photographs that actually exist on disk.

Every image here is Worldwide Distributors' own work, shot at night — which
is the only version of a lighting project that matters. There is no day/night
pair because there is no daylight photograph; the page palette still follows
the visitor's clock.

To add a project: put <slug>.jpg in site/assets/img/, add a row below, and
run tools/build.py. Rows whose image is missing are skipped, not broken.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import page, CLOSE
from pages_common import phero

# slug, filter keys, kind label, title, blurb
PROJECTS = [
    ("walls",    "lighting residential landscape", "Landscape &middot; Architectural",
     "Sculpture Wall Grazing",
     "Each panel gets its own fixture at its own aim. Grazing light this close to a surface is unforgiving &mdash; a fixture a few degrees out shows up as a hot spot from across the garden."),
    ("palm",     "lighting residential landscape", "Landscape &middot; Specimen",
     "Specimen Palm Uplighting",
     "Uplights set back far enough to carry the whole trunk and catch the crown, without throwing glare at anyone walking the path."),
    ("garden",   "lighting residential landscape", "Landscape &middot; Garden",
     "Garden Wall &amp; Canopy",
     "Wall grazing and tree uplighting working together, with the fixtures themselves invisible from the house."),
    ("hedge",    "lighting residential property landscape", "Grounds &middot; Perimeter",
     "Perimeter &amp; Lawn Lighting",
     "A run of in-grade fixtures along a hedge line. Even spacing matters more than output here &mdash; the eye reads the gaps, not the brightness."),
    ("pool",     "lighting residential", "Exterior &middot; Pool",
     "Pool &amp; Terrace",
     "Pool, hedge and covered terrace lit as three separate layers so the space still reads as outdoor living after dark, not as a lit car park."),
    ("interior", "lighting residential", "Interior &middot; Residential",
     "Interior Pendants &amp; Coves",
     "Decorative pendants doing the visual work while cove and recessed lighting carry the actual light level. Warm throughout."),
    ("highbay",  "lighting commercial property", "Commercial &middot; High Bay",
     "Commercial High-Bay Lighting",
     "Rows of high-bay pendants over an open commercial floor, spaced so the light lands evenly and nobody works in someone else's shadow."),
]

SITE = "/home/user/booksprint/site"
def have(slug):
    return os.path.exists(os.path.join(SITE, "assets/img", slug + ".jpg"))

live = [p for p in PROJECTS if have(p[0])]
missing = [p[0] for p in PROJECTS if not have(p[0])]

def tile(slug, cats, kind, title, blurb):
    return u"""      <article class="pf-item" data-cat="%s">
        <span class="tile">
          <img src="assets/img/%s.jpg" alt="%s, photographed at night" loading="lazy">
        </span>
        <div class="pf-body">
          <span class="k">%s</span>
          <h3>%s</h3>
          <p>%s</p>
        </div>
      </article>""" % (cats, slug, title.replace("&amp;", "and"), kind, title, blurb)

grid = "\n".join(tile(*p) for p in live)

FILTERS = [("all", "Everything"), ("landscape", "Landscape"), ("lighting", "Lighting"),
           ("residential", "Residential"), ("commercial", "Commercial"), ("property", "Property Managers")]
fbtns = "\n".join(
    '      <button type="button" data-f="%s" aria-pressed="%s">%s</button>' % (k, "true" if k == "all" else "false", t)
    for k, t in FILTERS)

body = phero(
    "hero-wide.jpg", "",
    "Portfolio",
    "Every project<br>has a night version",
    "This one is the only one that matters. Lighting, electrical and construction "
    "across Florida &mdash; photographed the way a client actually sees the work, "
    "which is after dark.",
    u'<a class="btn btn-p" href="contact.html">Start a project</a>'
    u'<a class="btn btn-s" href="#grid">Browse the work</a>')

body += u"""
<section class="sec" id="grid">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Selected work</p>
      <h2 class="disp">Completed<br>projects</h2>
      <p class="lede">Filter by what you need. Most of these touched more than one division &mdash; which is the point.</p>
    </div>

    <div class="filt rv" data-target=".pf-grid" hidden>
%s
      <span class="filt-live">%d projects</span>
    </div>

    <div class="pf-grid rv">
%s
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">In detail</p>
      <h2 class="disp">What a project<br>actually involves</h2>
      <p class="lede">Three of the above, and how the divisions stack on a single job.</p>
    </div>
  </div>

  <div class="cs par-host rv">
    <div class="cs-media">
      <img src="assets/img/scene-walls.jpg" alt="Sculptural garden walls lit at night" data-par="9" loading="lazy">
    </div>
    <div class="cs-body">
      <span class="eyebrow">Landscape &middot; Architectural</span>
      <h3>Sculpture Wall Grazing</h3>
      <p>A house lit properly has a few things deliberately bright and everything else deliberately not. Here the walls are the subject and the lawn is left to fall away, which is what stops the garden reading as a floodlit yard.</p>
      <ul class="cs-scope">
        <li><b>Design</b><span>What gets lit, what stays dark, beam angles and colour temperature</span></li>
        <li><b>Electrical</b><span>Transformer sizing, run lengths, buried splices done to last</span></li>
        <li><b>Install</b><span>Wall grazing, tree uplighting, path and step lighting</span></li>
        <li><b>Maintain</b><span>Re-aiming as planting grows, lens cleaning, connection repair</span></li>
      </ul>
    </div>
  </div>

  <div class="cs par-host rv">
    <div class="cs-media">
      <img src="assets/img/pool.jpg" alt="Pool, terrace and hedge lit at night" data-par="9" loading="lazy">
    </div>
    <div class="cs-body">
      <span class="eyebrow">Exterior &middot; Pool</span>
      <h3>Pool &amp; Terrace</h3>
      <p>Three separate layers &mdash; water, planting, covered terrace &mdash; each on its own circuit and its own level. Put them all at one brightness and an outdoor room turns into a parking lot with a pool in it.</p>
      <ul class="cs-scope">
        <li><b>Design</b><span>Layering by zone, glare control from seated eye height</span></li>
        <li><b>Electrical</b><span>Wet-location circuits, bonding, switching and controls</span></li>
        <li><b>Install</b><span>Pool, hedge, terrace and step lighting</span></li>
        <li><b>Maintain</b><span>Salt-air corrosion checks, seals, control resets</span></li>
      </ul>
    </div>
  </div>

  <div class="cs par-host rv">
    <div class="cs-media">
      <img src="assets/img/highbay.jpg" alt="Commercial high-bay lighting over an open floor" data-par="9" loading="lazy">
    </div>
    <div class="cs-body">
      <span class="eyebrow">Commercial &middot; High Bay</span>
      <h3>Commercial High-Bay Lighting</h3>
      <p>The commercial version of the same discipline. Spacing is the whole job: get it wrong and half the floor works in the other half's shadow, whatever the fixtures are rated at.</p>
      <ul class="cs-scope">
        <li><b>Survey</b><span>Existing draw and light levels measured, honest payback answer</span></li>
        <li><b>Supply</b><span>Fixtures sourced at distributor pricing, spec or substitute</span></li>
        <li><b>Install</b><span>Bucket truck work, circuit changes, controls</span></li>
        <li><b>Maintain</b><span>Scheduled checks so failures get caught one fixture at a time</span></li>
      </ul>
    </div>
  </div>
</section>
""" % (fbtns, len(live), grid)

body += CLOSE.format(
    h=u"Yours could be<br>the next one",
    p=u"Send photos of the space as it stands. We will tell you what it takes and what it looks like when it is done.")

n = page("portfolio.html",
         "Portfolio — Worldwide Distributors",
         "Completed lighting, electrical and construction projects across Florida, photographed at night.",
         body)

print("portfolio.html: %d projects, %d bytes" % (len(live), n))
if missing:
    print("no photograph yet for:", ", ".join(missing))
