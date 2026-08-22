# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import page, CLOSE

def phero(day, night, alt, eyebrow, h1, lede, btns):
    return u"""
<section class="phero">
  <div class="hero-shots" aria-hidden="true">
    <img class="day"   src="assets/img/%s" alt="" fetchpriority="high">
    <img class="night" src="assets/img/%s" alt="" fetchpriority="high">
  </div>
  <div class="hero-scrim" aria-hidden="true"></div>
  <div class="phero-in">
    <div class="wrap">
      <p class="stamp"><i></i>%s &middot; <span class="js-state">Daylight</span> &middot; <b class="js-clock">&mdash;</b></p>
      <h1 class="disp">%s</h1>
      <p class="lede">%s</p>
      <div class="btns">%s</div>
    </div>
  </div>
</section>
""" % (day, night, eyebrow, h1, lede, btns)

CTA_P = u'<a class="btn btn-p" href="contact.html">Start a project</a>'
CTA_S = u'<a class="btn btn-s" href="portfolio.html">See the work</a>'


# ══════════════════════════════════════════════════════════ COMMERCIAL

# ── ground-up study ───────────────────────────────────────────────────
# Five stages of one building, generated rather than photographed, which is
# why it carries its own "a study" eyebrow and says so in the lede. Each
# stage was made from the finished building as the reference so the five
# frames stay the same building on the same lot instead of drifting.
#
# Needs stage-<slug>.jpg in assets/img at 1100x821. The whole section is
# skipped unless every stage is on disk, so it cannot ship half-built.
STAGES = [
    ("site",     "Foundation",  "Slab, footings and stub-ups. Everything that has to be right before anything is visible."),
    ("shell",    "Structure",   "Walls to full height, bond beam poured, joists set. Openings are still holes."),
    ("dryin",    "Dried in",    "Roof on, glazing in, asphalt down. The building stops being weather-dependent."),
    ("finished", "Finished",    "Finish coat, canopy clad, kerbs, bays and planting. Handed over in daylight."),
    ("night",    "Switched on", "And the part most contractors leave to somebody else \u2014 the lighting that decides how it reads at seven."),
]


IMGDIR = "/home/user/booksprint/site/assets/img"


def buildfly_html():
    """The drone orbit, scroll-scrubbed. Returns "" until the frames exist,
    so the static strip keeps the section until the video has been cut."""
    import os as _os, glob as _glob
    folder = _os.path.join(IMGDIR, "buildfly")
    frames = sorted(_glob.glob(_os.path.join(folder, "f*.jpg")))
    if len(frames) < 20:
        return ""
    poster = ("assets/img/buildfly-poster.jpg"
              if _os.path.exists(_os.path.join(IMGDIR, "buildfly-poster.jpg"))
              else "assets/img/stage-night.jpg")
    steps = "".join("<li>%s</li>" % label for _, label, _ in STAGES)
    return """
<section class="scrub" id="buildfly" data-frames="%d" data-base="assets/img/buildfly/" data-mode="video">
  <div class="scrub-stick">
    <div class="scrub-stage">
      <video muted loop playsinline preload="none" poster="%s">
        <source src="assets/img/buildfly.mp4" type="video/mp4">
        <source src="assets/img/buildfly.webm" type="video/webm">
      </video>
      <canvas aria-hidden="true"></canvas>
      <div class="scrub-vig"></div>
    </div>
    <div class="scrub-copy">
      <div class="wrap">
        <p class="eyebrow">Ground up &middot; a study</p>
        <h2 class="disp">Slab to<br>switched on</h2>
        <p>One building and one unbroken circle around it, from a poured slab to
           the lights going on. A visualisation rather than a photographed job
           &mdash; it is here because the last part of it is the part that usually
           belongs to a different company.</p>
        <div class="scrub-bar"><i></i></div>
        <ol class="scrub-steps">%s</ol>
      </div>
    </div>
  </div>
</section>
""" % (len(frames), poster, steps)


def groundup_html():
    import os as _os
    fly = buildfly_html()
    if fly:
        return fly
    files = ["stage-%s.jpg" % slug for slug, _, _ in STAGES]
    if not all(_os.path.exists(_os.path.join(IMGDIR, f)) for f in files):
        return ""
    items = []
    for i, (slug, label, blurb) in enumerate(STAGES, 1):
        items.append("""
        <li class="stage">
          <img src="assets/img/stage-%s.jpg" alt="%s stage" loading="lazy" decoding="async" width="1100" height="821">
          <span class="sn">%02d</span>
          <b>%s</b>
          <p>%s</p>
        </li>""" % (slug, label, i, label, blurb))
    return """
<section class="sec" id="groundup">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Ground up &middot; a study</p>
      <h2 class="disp">Slab to<br>switched on</h2>
      <p class="lede">One building, five stages, from a poured slab to the lights
         going on. A visualisation rather than a photographed job &mdash; it is here
         because it shows the sequence, and because the last frame is the part that
         usually belongs to a different company.</p>
    </div>
    <ol class="stages rv">%s
    </ol>
  </div>
</section>
""" % ("".join(items))

body = phero(
    "medical-day.jpg", "medical-night.jpg", "",
    "Commercial &amp; buildouts",
    "Empty shell to<br>open doors",
    "Restaurants, medical offices, retail, barber shops, professional offices. "
    "Permitting, demolition, framing, electrical, lighting and finishes under one contract "
    "&mdash; with the same company answering for all of it.",
    CTA_P + u'<a class="btn btn-s" href="#scope">What we cover</a>')

body += u"""
<section class="sec" id="scope">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">The problem we exist to solve</p>
      <h2 class="disp">Four contractors,<br>three excuses</h2>
      <p class="lede">A typical buildout means a general contractor, an electrician, a lighting supplier and a maintenance company. When the schedule slips, each one points at the other three and the tenant pays for the gap. We carry all four roles, so there is nothing to point at.</p>
    </div>
    <ol class="steps rv">
      <li><b>Walk the space</b><p>We look at the shell as it stands &mdash; existing service, panel capacity, ceiling heights, what the landlord's work letter actually covers, and what it quietly does not.</p></li>
      <li><b>Scope and schedule</b><p>One scope covering build, electrical and lighting, with the long-lead items flagged up front. Fixtures and materials get sourced at distributor pricing, which is where most of the schedule risk lives.</p></li>
      <li><b>Build</b><p>Demolition, framing, rough-in, drywall, finishes. Our own crews on the trades we hold, so a delay in one stage does not mean renegotiating with a stranger.</p></li>
      <li><b>Light it properly</b><p>The part almost everyone treats as an afterthought. Layout, colour temperature and control, specified for what the space is actually for &mdash; not whatever fixture was in stock.</p></li>
      <li><b>Hand over, then stay</b><p>Punch list, close-out, and an ongoing service relationship. When a ballast dies in year two, you call the same number you called in month one.</p></li>
    </ol>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Scope</p>
      <h2 class="disp">What sits under<br>one contract</h2>
    </div>
    <div class="grid g3 rv">
      <div class="panel" id="build">
        <span class="n">01</span><h3>Build</h3>
        <p>Commercial buildouts and tenant improvements from an empty leased shell through to an open business.</p>
        <ul class="tags"><li>Demolition</li><li>Framing</li><li>Drywall</li><li>Plumbing</li><li>Finishes</li><li>Remodelling</li></ul>
      </div>
      <div class="panel" id="electrical">
        <span class="n">02</span><h3>Electrical</h3>
        <p>Licensed electrical work &mdash; service, panels, rough-in, device trim, troubleshooting and bucket truck work.</p>
        <ul class="tags"><li>Panel upgrades</li><li>Service</li><li>Rough-in</li><li>Troubleshooting</li><li>Exterior</li></ul>
      </div>
      <div class="panel" id="lighting">
        <span class="n">03</span><h3>Lighting</h3>
        <p>Design, layout and install &mdash; plus LED conversion planning and energy surveys on existing spaces.</p>
        <ul class="tags"><li>Layouts</li><li>Photometrics</li><li>LED retrofit</li><li>Architectural</li><li>Parking lot</li></ul>
      </div>
    </div>
    <div class="note rv">
      <span class="t">Supply only</span>
      <p><b>You can also just buy the package.</b> We source fixtures, doors, windows and materials at distributor pricing and hand them to your own crew. No installation required, no obligation to use ours.</p>
    </div>
  </div>
</section>

<!-- Scroll scrub: the clip advances a frame at a time under the wheel.
     Desktop only - scroll.js leaves the plain <video> in place below 900px
     and under prefers-reduced-motion. -->
<section class="scrub" id="scrub" data-frames="121" data-base="assets/img/buildout/" data-mode="video">
  <div class="scrub-stick">
    <div class="scrub-stage">
      <video muted loop playsinline preload="none" poster="assets/img/buildout-poster.jpg">
        <source src="assets/img/buildout.mp4" type="video/mp4">
      </video>
      <canvas aria-hidden="true"></canvas>
      <div class="scrub-vig"></div>
    </div>
    <div class="scrub-copy">
      <div class="wrap">
        <p class="eyebrow"><span class="cased">eBuilt</span> &middot; four months, one move</p>
        <h2 class="disp">Empty shell to<br>open doors</h2>
        <p>Months of work in one continuous move: the shell becomes a finished,
           lit space &mdash; the same sequence a tenant lives through, minus
           the four months of it.</p>
        <div class="scrub-bar"><i></i></div>
        <ol class="scrub-steps">
          <li>Shell</li><li>Demolition</li><li>Framing</li>
          <li>Electrical rough-in</li><li>Lighting</li><li>Finishes</li><li>Open</li>
        </ol>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Sectors</p>
      <h2 class="disp">Spaces we build</h2>
    </div>
    <div class="grid g4 rv">
      <div class="panel"><h3>Restaurants</h3><p>Kitchens, dining rooms and bar lighting, built around health-department reality and a hard opening date.</p></div>
      <div class="panel"><h3>Medical</h3><p>Exam rooms, waiting areas and corridors &mdash; where colour rendering and glare control are clinical requirements, not preferences.</p></div>
      <div class="panel"><h3>Retail</h3><p>Sales floors where the lighting is doing merchandising work, plus back-of-house and exterior signage circuits.</p></div>
      <div class="panel"><h3>Offices</h3><p>Professional offices, barber shops and service businesses. Straightforward buildouts on predictable schedules.</p></div>
    </div>
  </div>
</section>
"""
body += groundup_html()

body += CLOSE.format(
    h=u"Tell us about<br>the space",
    p=u"Send the lease plan, the landlord's work letter, or just photos of the shell. We will tell you what it actually takes.")

page("commercial.html",
     "Commercial Buildouts &amp; Tenant Improvements — Worldwide Distributors",
     "Miami commercial buildouts: permitting, demolition, framing, electrical, lighting and finishes under one contract. Restaurants, medical, retail and professional offices.",
     body)


# ══════════════════════════════════════════════════════════ RESIDENTIAL
body = phero(
    "estate-day.jpg", "estate-night.jpg", "",
    "Residential lighting",
    "Nobody sees<br>your house at noon",
    "Landscape and permanent exterior lighting, panel upgrades, troubleshooting and remodelling. "
    "Designed for the twelve hours a day when lighting is the only thing anyone is looking at.",
    CTA_P + CTA_S)

body += u"""
<section class="sec">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">How we approach it</p>
      <h2 class="disp">Light the architecture,<br>not the lawn</h2>
      <p class="lede">Most residential lighting fails the same way: fixtures placed where they were easy to run, aimed at nothing in particular, all at one brightness. A house lit properly has a few things deliberately bright and everything else deliberately not.</p>
    </div>
    <div class="grid g3 rv">
      <div class="panel">
        <span class="n">01</span><h3>Landscape</h3>
        <p>Uplighting on trees and facade features, path and step lighting, water and pool surrounds. Low-voltage runs sized so the last fixture is as bright as the first.</p>
      </div>
      <div class="panel">
        <span class="n">02</span><h3>Permanent<br>roofline</h3>
        <p>Fixed track under the eaves &mdash; warm white year-round, colour for holidays, controlled from a phone. Installed once instead of hung and taken down every December.</p>
      </div>
      <div class="panel">
        <span class="n">03</span><h3>Electrical</h3>
        <p>Panel upgrades, added circuits, exterior outlets, generator and EV feeds, and the troubleshooting nobody else wants to take on.</p>
      </div>
    </div>
  </div>
</section>

<!-- Progressive relight: each fixture opens its own circle as you scroll,
     so the property switches on one fixture at a time. Under reduced motion
     scroll.js crossfades the whole night frame instead. -->
<section class="relight" data-points="[[30,70,26],[50,50,30],[70,70,26],[13,80,22],[87,80,22],[50,88,26],[20,56,20],[80,56,20]]">
  <div class="relight-stick">
    <div class="relight-stage">
      <img class="rl-dark" src="assets/img/estate-night.jpg" alt="A residential estate at night, its landscape lighting coming on">
      <div class="rl-night"><img src="assets/img/estate-night.jpg" alt=""></div>
      <p class="rl-count"><b>0</b> fixtures on</p>
      <div class="rl-copy">
        <div class="wrap">
          <p class="eyebrow">Landscape lighting &middot; how an install goes</p>
          <h2 class="disp">One fixture<br>at a time</h2>
          <p>This is roughly how an install actually goes: a transformer, a run of cable, and then each fixture aimed at the one thing it is there for.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Day &rarr; night</p>
      <h2 class="disp">The version<br>that matters</h2>
      <p class="lede">A daytime photo is what a prospective buyer or a dinner guest arriving at seven is shown. The other half is what they actually see.</p>
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
      <p class="eyebrow">Colour temperature</p>
      <h2 class="disp">Warm, or the<br>house looks like a car park</h2>
      <p class="lede">This is the single most common mistake in residential exteriors. Same fixture, same wattage: one reads as a home, the other reads as a loading dock.</p>
    </div>
    <div class="kelvin grid g2 rv" style="gap:0;background:none">
      <svg class="kroom" viewBox="0 0 800 520" role="img" aria-label="Illustrated interior lit at the selected colour temperature">
        <defs>
          <radialGradient id="pool" cx="50%" cy="8%" r="78%">
            <stop offset="0%"  stop-color="var(--k,#FFD6A8)" stop-opacity=".95"/>
            <stop offset="55%" stop-color="var(--k,#FFD6A8)" stop-opacity=".30"/>
            <stop offset="100%" stop-color="var(--k,#FFD6A8)" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="800" height="520" fill="#0A0C10"/>
        <rect x="0" y="360" width="800" height="160" fill="#14171C"/>
        <ellipse cx="400" cy="120" rx="330" ry="300" fill="url(#pool)"/>
        <rect x="372" y="0" width="56" height="46" fill="var(--k,#FFD6A8)"/>
        <rect x="150" y="300" width="220" height="16" fill="var(--k,#FFD6A8)" opacity=".5"/>
        <rect x="150" y="316" width="220" height="90" fill="#1B1F26"/>
        <rect x="470" y="250" width="150" height="156" fill="#1B1F26"/>
        <rect x="470" y="244" width="150" height="8" fill="var(--k,#FFD6A8)" opacity=".45"/>
        <rect x="0" y="404" width="800" height="4" fill="var(--k,#FFD6A8)" opacity=".22"/>
      </svg>
      <div class="kctl">
        <div class="krow">
          <span class="kval" id="kVal">3500K</span>
          <span class="kname" id="kName">Soft White</span>
        </div>
        <input type="range" id="kSlide" min="2700" max="5000" step="100" value="3500" aria-label="Colour temperature in kelvin">
        <p class="kuse" id="kUse"></p>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Afterward</p>
      <h2 class="disp">Lights fail slowly,<br>then all at once</h2>
      <p class="lede">Landscape fixtures live outdoors in salt air. Lenses fog, connections corrode, and a system loses a fixture at a time until the night it obviously looks wrong. Scheduled care catches it while it is still one fixture.</p>
    </div>
    <dl class="rows rv">
      <div class="row"><dt>Re-aim</dt><dd>Trees grow and beams drift off the thing they were aimed at. Re-aiming is most of what a maintenance visit actually is.</dd></div>
      <div class="row"><dt>Connections</dt><dd>Buried splices and corroded connections are the usual cause of a fixture that works intermittently.</dd></div>
      <div class="row"><dt>Lenses and glass</dt><dd>Cleaned so output stays where it was specified rather than dropping quietly year over year.</dd></div>
      <div class="row"><dt>Controls</dt><dd>Timers and photocells reset after outages and drift with the seasons. Checked and corrected.</dd></div>
    </dl>
  </div>
</section>
"""
body += CLOSE.format(
    h=u"Show us the<br>front of the house",
    p=u"A couple of daytime photos and a rough idea of what you want lit is enough to start the conversation.")

page("residential.html",
     "Residential Landscape &amp; Permanent Lighting — Worldwide Distributors",
     "Landscape lighting, permanent roofline systems, panel upgrades and electrical service for Florida homes. Designed for how the house looks after dark.",
     body)
