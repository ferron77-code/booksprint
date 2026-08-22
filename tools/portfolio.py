# -*- coding: utf-8 -*-
"""Writes portfolio.html.

Two kinds of entry:

  PHOTO    one photograph of a finished Worldwide Distributors project,
           shot at night. No daylight frame exists, so these do not
           cross-fade — they are simply the work.

  RENDER   a day/night rendering pair that cross-fades on the visitor's
           clock, illustrating a category the company works in but has no
           photography of yet. These carry no on-page label; which entries
           are which is recorded in docs/production/photo-provenance.md.

Photographs lead. To add a project: put the file(s) in site/assets/img/, add
a row below, run tools/build.py. Rows whose images are missing are skipped.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import page, CLOSE
from pages_common import phero

SITE = "/home/user/booksprint/site"
IMG = os.path.join(SITE, "assets/img")

# slug, filter keys, kind label, title, blurb
REAL = [
    ("walls",    "lighting residential landscape", "Estate Garden &middot; Wall Grazing",
     "Sculpture Wall Grazing",
     "Each panel gets its own fixture at its own aim. Grazing light this close to a surface is unforgiving &mdash; a fixture a few degrees out shows up as a hot spot from across the garden."),
    ("palm",     "lighting residential landscape", "Estate Garden &middot; Specimen Trees",
     "Specimen Palm Uplighting",
     "The same garden, looking the other way. Uplights set back far enough to carry the whole trunk and catch the crown, without throwing glare at anyone walking the path."),
    ("hedge",    "lighting residential property landscape", "Grounds &middot; Perimeter",
     "Perimeter &amp; Lawn Lighting",
     "A run of in-grade fixtures along a hedge line. Even spacing matters more than output here &mdash; the eye reads the gaps, not the brightness."),
    ("pool",     "lighting residential", "Exterior &middot; Pool",
     "Pool &amp; Terrace",
     "Pool, hedge and covered terrace lit as three separate layers so the space still reads as outdoor living after dark, not as a lit car park."),
    ("interior", "lighting residential", "Interior &middot; Residential",
     "Interior Pendants &amp; Coves",
     "Decorative pendants doing the visual work while cove and recessed lighting carry the actual light level. Warm throughout."),
    ("lot",      "lighting commercial property", "Exterior &middot; Parking",
     "Parking Lot &amp; Approach",
     "Pole lighting laid out so the pools overlap across the whole lot and the approach reads as one lit surface, not a row of bright spots with dark between them."),
    ("deck",     "lighting commercial property", "Retrofit &middot; Parking Deck",
     "Parking Deck Retrofit",
     "Linear fixtures down the drive lane and across the bays. On a deck the ceiling is the reflector, so getting the spacing right does more than adding output would."),
    ("deck-wide","lighting commercial property", "Retrofit &middot; Parking Deck",
     "Deck Drive Lane",
     "A second deck, lit down the drive lane rather than across the bays. Bollards and floor markings carry as much of the safety job as the fixtures do."),
    ("planting", "lighting residential landscape", "Landscape &middot; Planting",
     "Planting Bed &amp; Canopy",
     "Low fixtures inside the bed picking out leaf texture, with the palms lit from behind so the canopy reads against the sky rather than disappearing into it."),
    ("highbay",  "lighting commercial property", "Commercial &middot; High Bay",
     "Commercial High-Bay Lighting",
     "Rows of high-bay pendants over an open commercial floor, spaced so the light lands evenly and nobody works in someone else's shadow."),
]

CONCEPT = [
    ("medical", "buildout commercial", "Buildout &middot; Medical", "Medical Office Fit-Out",
     "Exam rooms, corridors and a waiting area from bare shell to open practice. Colour rendering and glare control are clinical requirements here, not preferences."),
    ("estate",  "lighting residential landscape", "Landscape &middot; Estate", "Estate Uplighting",
     "Facade grazing, tree uplighting and path lighting on a low-voltage system sized so the last fixture is as bright as the first."),
    ("garage",  "lighting commercial property", "Retrofit &middot; Parking", "Parking Structure Retrofit",
     "A deck relit end to end. The argument for the retrofit is not the energy model, it is walking a resident through at nine at night."),
    ("court",   "lighting residential exterior", "Exterior &middot; Sport", "Court &amp; Grounds Lighting",
     "Even playing-surface light with the spill controlled so the neighbours keep their night sky and the grounds still read as landscape."),
]

def has(*names):
    return all(os.path.exists(os.path.join(IMG, n)) for n in names)

real    = [p for p in REAL    if has(p[0] + ".jpg")]
concept = [p for p in CONCEPT if has(p[0] + "-day.jpg", p[0] + "-night.jpg")]

def tile_real(slug, cats, kind, title, blurb):
    return u"""      <article class="pf-item" data-cat="%s">
        <span class="tile">
          <img src="assets/img/%s.jpg" alt="%s, photographed at night" loading="lazy">
        </span>
        <div class="pf-body"><span class="k">%s</span><h3>%s</h3><p>%s</p></div>
      </article>""" % (cats, slug, title.replace("&amp;", "and"), kind, title, blurb)

def tile_concept(slug, cats, kind, title, blurb):
    return u"""      <article class="pf-item" data-cat="%s">
        <span class="tile">
          <img class="day"   src="assets/img/%s-day.jpg"   alt="%s in daylight" loading="lazy">
          <img class="night" src="assets/img/%s-night.jpg" alt="%s lit after dark" loading="lazy">
        </span>
        <div class="pf-body"><span class="k">%s</span><h3>%s</h3><p>%s</p></div>
      </article>""" % (cats, slug, title.replace("&amp;", "and"), slug,
                       title.replace("&amp;", "and"), kind, title, blurb)

grid = "\n".join([tile_real(*p) for p in real] + [tile_concept(*p) for p in concept])

FILTERS = [("all", "Everything"), ("lighting", "Lighting"), ("landscape", "Landscape"),
           ("buildout", "Buildouts"), ("residential", "Residential"),
           ("commercial", "Commercial"), ("property", "Property Managers")]
fbtns = "\n".join(
    '      <button type="button" data-f="%s" aria-pressed="%s">%s</button>' % (k, "true" if k == "all" else "false", t)
    for k, t in FILTERS)

body = phero(
    "hero-day.jpg", "hero-night.jpg", "",
    "Portfolio",
    "Every project<br>has a night version",
    "Lighting, electrical and construction across Florida. The page follows your clock, "
    "so whichever version you are seeing is the one that is true right now.",
    u'<a class="btn btn-p" href="contact.html">Start a project</a>'
    u'<a class="btn btn-s" href="#grid">Browse the work</a>')

body += u"""
<section class="sec" id="grid">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Selected work</p>
      <h2 class="disp">The whole range,<br>under one contract</h2>
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
      <p class="eyebrow">Featured project &middot; drag the seam</p>
      <h2 class="disp">Daylight &rarr; After dark</h2>
      <p class="lede">Nobody hires a lighting company for how a property looks at noon. Drag the seam and see the only version that matters.</p>
    </div>
    <div class="split rv" id="split">
      <img src="assets/img/estate-day.jpg" alt="Residential estate exterior in daylight">
      <div class="after"><img src="assets/img/estate-night.jpg" alt="The same estate exterior after dark with landscape lighting"></div>
      <div class="seam" role="slider" tabindex="0" aria-label="Reveal the night state"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></div>
      <span class="split-lbl l">As found</span>
      <span class="split-lbl r">Lit</span>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">In detail</p>
      <h2 class="disp">What a project<br>actually involves</h2>
      <p class="lede">Three completed jobs, and how the divisions stack on a single project.</p>
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
""" % (fbtns, len(real) + len(concept), grid)

body += CLOSE.format(
    h=u"Yours could be<br>the next one",
    p=u"Send photos of the space as it stands. We will tell you what it takes and what it looks like when it is done.")

n = page("portfolio.html",
         "Portfolio — Worldwide Distributors",
         "Lighting, electrical and construction projects across Florida, in daylight and after dark.",
         body)

print("portfolio.html: %d photographed + %d concept = %d, %d bytes"
      % (len(real), len(concept), len(real) + len(concept), n))
