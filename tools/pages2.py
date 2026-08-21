# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import page, CLOSE
from pages_common import phero, CTA_P, CTA_S

# ══════════════════════════════════════════════════════════ PROPERTY MANAGERS
body = phero(
    "garage-day.jpg", "garage-night.jpg", "",
    "Property &amp; association managers",
    "One vendor,<br>the whole property",
    "Common-area and parking lighting, electrical service, panel work, unit turns and recurring "
    "maintenance. The point is not that we are cheaper on any one line item &mdash; it is that "
    "you stop coordinating four vendors across one address.",
    CTA_P + u'<a class="btn btn-s" href="#services">What we cover</a>')

body += u"""
<section class="sec" id="services">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Standing scope</p>
      <h2 class="disp">The work that<br>keeps recurring</h2>
      <p class="lede">Most of a manager's maintenance spend is the same handful of items across every property. These are the ones we carry in-house, which means one purchase order instead of four.</p>
    </div>
    <div class="grid g3 rv">
      <div class="panel"><span class="n">01</span><h3>Parking &amp;<br>garage lighting</h3><p>Pole and garage fixture replacement, LED retrofit, photocell and timer faults, and the bucket truck work that most vendors have to subcontract out.</p></div>
      <div class="panel"><span class="n">02</span><h3>Common<br>areas</h3><p>Corridors, lobbies, stairwells, amenity decks and exterior grounds &mdash; including emergency and egress fixtures.</p></div>
      <div class="panel"><span class="n">03</span><h3>Electrical<br>service</h3><p>Panel work, added circuits, breaker faults, exterior receptacles and the intermittent problems that come back if they are not root-caused.</p></div>
      <div class="panel"><span class="n">04</span><h3>Unit<br>turns</h3><p>Fixture and device replacement, small remodels, paint-adjacent finish work between tenants, on turn-around timelines.</p></div>
      <div class="panel"><span class="n">05</span><h3>Landscape<br>lighting care</h3><p>Scheduled re-aiming, connection repair, lens cleaning and control resets so the grounds do not degrade one fixture at a time.</p></div>
      <div class="panel"><span class="n">06</span><h3>Energy<br>surveys</h3><p>A measured look at what the existing lighting actually draws, and an honest answer on whether a retrofit pays back or not.</p></div>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Onboarding</p>
      <h2 class="disp">Vendor packet</h2>
      <p class="lede">Managers ask for the same documents every time. Rather than making you chase them, ask and we will send the current set directly.</p>
    </div>
    <dl class="rows rv">
      <div class="row"><dt>Licence</dt><dd><span class="tbd">Licence number pending &mdash; to be published here once confirmed.</span></dd></div>
      <div class="row"><dt>Insurance</dt><dd>Certificate of insurance issued to your entity, with the additional-insured language your management agreement requires.</dd></div>
      <div class="row"><dt>W-9</dt><dd>Current, signed, sent on request.</dd></div>
      <div class="row"><dt>References</dt><dd>Available on request for properties comparable to yours.</dd></div>
      <div class="row"><dt>Compliance networks</dt><dd><span class="tbd">Approved-vendor network memberships to be listed here once confirmed.</span></dd></div>
    </dl>
    <div class="note rv">
      <span class="t">Why this section exists</span>
      <p><b>Nothing above is published until it is verified.</b> Where a line is still marked pending, it is because we would rather show you a blank than a number we have not checked. Ask and we will send the document itself.</p>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Before &rarr; after</p>
      <h2 class="disp">A parking deck,<br>relit</h2>
      <p class="lede">The clearest argument for a retrofit is not the energy model. It is walking a resident through the deck at nine at night.</p>
    </div>
    <div class="split rv" id="split">
      <img src="assets/img/garage-day.jpg" alt="Parking structure in daylight">
      <div class="after"><img src="assets/img/garage-night.jpg" alt="The same parking structure lit after dark"></div>
      <div class="seam" role="slider" tabindex="0" aria-label="Reveal the night state"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></div>
      <span class="split-lbl l">As found</span>
      <span class="split-lbl r">Lit</span>
    </div>
    <p class="rend" style="position:static;display:inline-block;margin-top:12px">Concept imagery &middot; pending project photography</p>
  </div>
</section>
"""
body += CLOSE.format(
    h=u"Send us the<br>property list",
    p=u"Addresses and the recurring problems, or just the one building that keeps generating work orders. We will walk it.")

page("property-managers.html",
     "For Property &amp; Association Managers — Worldwide Distributors",
     "Common-area and parking lighting, electrical service, panel work, unit turns and recurring maintenance for Florida property and association managers, from one vendor.",
     body)


# ══════════════════════════════════════════════════════════ PROJECTS
body = phero(
    "hero-day.jpg", "hero-night.jpg", "",
    "Selected work",
    "Every project<br>has a night version",
    "Hover or drag the time rail and the whole page moves with the sun. "
    "So does the work &mdash; each project below is shown as it reads in daylight and as it reads once it is switched on.",
    u'<a class="btn btn-p" href="contact.html">Start a project</a>')

TILES = [
    ("medical",  "Buildout &middot; Medical",     "Medical Office Fit-Out",     "commercial.html",  "Medical office fit-out"),
    ("estate",   "Landscape",                     "Estate Uplighting",          "residential.html", "Residential estate"),
    ("garage",   "Commercial Lighting",           "Parking Structure Retrofit", "property-managers.html", "Parking structure"),
    ("court",    "Exterior &middot; Sport",       "Court &amp; Grounds Lighting",   "residential.html", "Outdoor court and grounds"),
]
tiles = "\n".join(u"""      <a class="tile" href="%s">
        <img class="day"   src="assets/img/%s-day.jpg"   alt="%s in daylight">
        <img class="night" src="assets/img/%s-night.jpg" alt="%s lit after dark">
        <span class="badge">Concept</span>
        <div class="cap"><span class="cat">%s</span><h4>%s</h4></div>
      </a>""" % (href, slug, alt, slug, alt, cat, name)
    for slug, cat, name, href, alt in TILES)

body += u"""
<section class="sec">
  <div class="wrap">
    <div class="grid g2 rv">
%s
    </div>
    <div class="note rv">
      <span class="t">About this page</span>
      <p><b>The images above are concept renderings, not finished projects.</b> They exist so the design direction can be reviewed before the real photography is commissioned. Every one of them gets replaced with an actual Worldwide Distributors job &mdash; shot in daylight and again after dark &mdash; before this site goes live.</p>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">E-Built &middot; one continuous take</p>
      <h2 class="disp">Empty shell to<br>open doors</h2>
      <p class="lede">A commercial buildout is months of work that nobody sees. This is what it looks like compressed into one move.</p>
    </div>
    <div class="film-wrap rv">
      <video id="film" muted loop playsinline preload="metadata" poster="assets/img/buildout-poster.jpg">
        <source src="assets/img/buildout.mp4" type="video/mp4">
      </video>
    </div>
    <p class="film-meta">
      <span>Demolition</span><span>Framing</span><span>Electrical rough-in</span><span>Lighting</span><span>Finishes</span><span>Open</span>
    </p>
  </div>
</section>
""" % tiles

body += CLOSE.format(
    h=u"Yours could be<br>the next one",
    p=u"Send photos of the space as it stands. We will tell you what it takes and what it looks like when it is done.")

page("projects.html",
     "Projects — Worldwide Distributors",
     "Selected lighting, electrical and construction work in Florida, shown in daylight and after dark.",
     body)
