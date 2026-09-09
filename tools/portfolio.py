# -*- coding: utf-8 -*-
"""Writes portfolio.html.

Two kinds of entry:

  PHOTO    one photograph of a finished Worldwide Distributors project,
           shot at night. No daylight frame exists, so these do not
           cross-fade — they are simply the work.

  RENDER   a day/night rendering pair that cross-fades on the visitor's
           clock, illustrating a category the company works in but has no
           photography of yet. Each one carries a "Visualization" credit on
           the tile. Nothing on the page used to distinguish these from the
           photographs, which put a licensed contractor's portfolio one
           question away from an awkward answer; the provenance is still
           recorded in docs/production/photo-provenance.md as well.

Photographs lead. To add a project: put the file(s) in site/assets/img/, add
a row below, run tools/build.py. Rows whose images are missing are skipped.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import page, CLOSE
from pages_common import phero
from projects import REAL, CONCEPT

SITE = "/home/user/booksprint/site"
IMG = os.path.join(SITE, "assets/img")

# ── lighting studies ──────────────────────────────────────────────────
# Generated visualizations, not photographs of completed jobs. They live
# under their own heading for exactly that reason: a prospect can always
# tell which is which, and nobody can ask "whose house is that?" and get
# silence. Renderings are ordinary practice in lighting and architectural
# work — what is not ordinary is passing one off as a finished project.
#
# Each entry needs study-<slug>-day.jpg and study-<slug>-night.jpg in
# assets/img at the same dimensions. Entries whose images are not on disk
# are skipped, so this list can run ahead of the artwork.
# slug, title, blurb, left label, right label
STUDIES = [
    ("oak", "Live Oak Uplighting",
     "Uplights set at the base of the trunk and angled to carry the whole "
     "canopy, so the branch structure reads against the sky instead of the "
     "tree becoming a dark mass with a bright bottom.", "Unlit", "Lit"),
    ("palms", "Palm Row &amp; Facade Grazing",
     "A row lit to the same height with the same beam, and the facade grazed "
     "from close in. Matching the trunks matters more than the brightness "
     "&mdash; an uneven row is the first thing the eye finds.", "Unlit", "Lit"),
    ("garden", "Garden Path &amp; Planting Beds",
     "Low fixtures inside the beds picking out leaf texture, path lights kept "
     "below eye level, and nothing aimed where somebody walking will look "
     "straight into it.", "Unlit", "Lit"),
]


def studies_html():
    """Skips any study whose day/night pair is not on disk yet."""
    out = []
    for slug, title, blurb, lbl_l, lbl_r in STUDIES:
        day = os.path.join(IMG, "study-%s-day.jpg" % slug)
        night = os.path.join(IMG, "study-%s-night.jpg" % slug)
        if not (os.path.exists(day) and os.path.exists(night)):
            continue
        out.append("""
      <figure class="study rv">
        <div class="split">
          <img src="assets/img/study-%s-day.jpg" alt="%s, daylight, lighting off">
          <div class="after"><img src="assets/img/study-%s-night.jpg" alt="The same view after dark with the lighting on"></div>
          <div class="seam" role="slider" tabindex="0" aria-label="Reveal the lit state"
               aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></div>
          <span class="split-lbl l">%s</span>
          <span class="split-lbl r">%s</span>
        </div>
        <figcaption><b>%s</b><p>%s</p></figcaption>
      </figure>""" % (slug, title.replace("&amp;", "and"), slug,
                      lbl_l, lbl_r, title, blurb))
    if not out:
        return ""
    return """
<section class="sec" id="studies">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Lighting studies</p>
      <h2 class="disp">What the light does,<br>before anyone digs</h2>
      <p class="lede">These are visualizations, not photographs of finished jobs &mdash;
         the same studies we put in front of a client to settle a scheme before a
         fixture is bought. The photographed work is above.</p>
    </div>
    <div class="studies rv">%s
    </div>
  </div>
</section>
""" % ("".join(out))

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
        <div class="pf-body"><span class="k">%s</span><h3>%s</h3><p>%s</p>
          <p class="credit">Visualization</p></div>
      </article>""" % (cats, slug, title.replace("&amp;", "and"), slug,
                       title.replace("&amp;", "and"), kind, title, blurb)

grid = "\n".join([tile_real(*p) for p in real] + [tile_concept(*p) for p in concept])

# Two axes, in this order: what the work was, then who it was for. There is
# deliberately no "Lighting" chip. It sits on 13 of the 14 projects, so it
# showed the same page as "Everything" and read as a broken filter — which is
# exactly how the client reported it. This is a lighting company; the whole
# portfolio is the lighting filter. The tag stays on the items in case a
# future split needs it.
FILTERS = [("all", "Everything"), ("landscape", "Landscape"),
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
      <div class="filt-scroll">
%s
      </div>
      <span class="filt-live">%d of %d projects</span>
    </div>

    <div class="pf-grid rv">
%s
    </div>

  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Featured project &middot; the same view, twice</p>
      <h2 class="disp">Daylight &rarr; After dark</h2>
      <p class="lede">Nobody hires a lighting company for how a property looks at noon. The version that matters is the one after dark.</p>
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
      <p class="lede">Three completed jobs, and everything that goes into one of them.</p>
    </div>
  </div>

  <div class="cs par-host rv">
    <div class="cs-media">
      <img src="assets/img/scene-walls.jpg" alt="Sculptural garden walls lit at night" data-par="9" loading="lazy">
    </div>
    <div class="cs-body">
      <span class="eyebrow">Residential &middot; Landscape</span>
      <h3>Garden Wall Lighting</h3>
      <p>A house lit properly has a few things deliberately bright and everything else deliberately not. Here the walls are the subject and the lawn is left to fall away, which is what stops the garden reading as a floodlit yard.</p>
      <ul class="cs-scope">
        <li><b>Design</b><span>What gets lit, what stays dark, beam angles and color temperature</span></li>
        <li><b>Electrical</b><span>Transformer sizing, run lengths, buried splices done to last</span></li>
        <li><b>Install</b><span>In-ground fixtures at the walls and trees, path and step lighting</span></li>
        <li><b>Maintain</b><span>Re-aiming as planting grows, lens cleaning, connection repair</span></li>
      </ul>
    </div>
  </div>

  <div class="cs par-host rv">
    <div class="cs-media">
      <img src="assets/img/pool.jpg" alt="Pool, terrace and hedge lit at night" data-par="9" loading="lazy">
    </div>
    <div class="cs-body">
      <span class="eyebrow">Residential &middot; Exterior</span>
      <h3>Pool &amp; Covered Terrace</h3>
      <p>Three separate layers &mdash; water, planting, covered terrace &mdash; each on its own circuit and its own level. Put them all at one brightness and an outdoor room stops feeling like one.</p>
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
      <span class="eyebrow">Commercial &middot; Interior</span>
      <h3>High-Bay Lighting</h3>
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
""" % (fbtns, len(real) + len(concept), len(real) + len(concept), grid)

# The studies sit below the photographed work, never mixed into it.
body += studies_html()

body += CLOSE.format(
    h=u"Yours could be<br>the next one",
    p=u"Send photos of the space as it stands. We will tell you what it takes and what it looks like when it is done.")

n = page("portfolio.html",
         "Portfolio — Worldwide Distributors",
         "Lighting, electrical and construction projects across Florida, in daylight and after dark.",
         body)

print("portfolio.html: %d photographed + %d concept = %d, %d bytes"
      % (len(real), len(concept), len(real) + len(concept), n))
