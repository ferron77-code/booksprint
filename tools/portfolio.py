# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import page, CLOSE
from pages_common import phero

# slug, day/night basename, category keys, kind label, title, blurb
PROJECTS = [
    ("medical",  "buildout medical commercial", "Buildout &middot; Medical",
     "Medical Office Fit-Out",
     "Exam rooms, corridors and a waiting area taken from bare shell to open practice. Colour rendering and glare control are clinical requirements here, not preferences."),
    ("estate",   "lighting residential landscape", "Landscape &middot; Residential",
     "Estate Uplighting",
     "Facade grazing, tree uplighting and path lighting on a low-voltage system sized so the last fixture is as bright as the first."),
    ("garage",   "lighting commercial property", "Retrofit &middot; Parking",
     "Parking Structure Retrofit",
     "A deck relit end to end. The argument for the retrofit is not the energy model, it is walking a resident through at nine at night."),
    ("court",    "lighting residential exterior", "Exterior &middot; Sport",
     "Court &amp; Grounds Lighting",
     "Even playing-surface light with the spill controlled so the neighbours keep their night sky and the grounds still read as landscape."),
    ("hero",     "lighting commercial", "Architectural &middot; Commercial",
     "Commercial Facade Lighting",
     "Entry, canopy and facade lighting that makes a building findable after dark and still looks deliberate from the road."),
]

# Ready to switch on the moment the second photography set lands.
PENDING = [
    ("restaurant", "buildout commercial", "Buildout &middot; Restaurant", "Restaurant Buildout",
     "Dining room, bar and kitchen, built to a hard opening date and lit warm enough to read as hospitality."),
    ("retail",     "buildout commercial", "Buildout &middot; Retail", "Retail Floor",
     "A sales floor where the lighting is doing merchandising work, plus back-of-house and exterior signage circuits."),
    ("lot",        "lighting commercial property", "Retrofit &middot; Parking", "Parking Lot Pole Lighting",
     "Pole-mounted LED area lighting laid out so the pools overlap and there are no dark gaps between them."),
    ("roofline",   "lighting residential", "Permanent &middot; Residential", "Permanent Roofline System",
     "Fixed track under the eaves. Warm white year-round, colour for holidays, controlled from a phone."),
    ("lobby",      "lighting property residential", "Common Areas &middot; Multifamily", "Condominium Lobby",
     "Downlights and a cove detail grazing the stone wall, tuned warm so a lobby reads residential rather than corporate."),
    ("warehouse",  "lighting commercial", "Retrofit &middot; Industrial", "Warehouse High-Bay Retrofit",
     "Rows of linear high-bay lighting the aisles and racking evenly to the far wall, with no dark patches."),
]

SITE = "/home/user/booksprint/site"
def have(slug):
    return all(os.path.exists(os.path.join(SITE, "assets/img", slug + s + ".jpg"))
               for s in ("-day", "-night"))

live = [p for p in PROJECTS + PENDING if have(p[0])]
missing = [p[0] for p in PROJECTS + PENDING if not have(p[0])]

def tile(slug, cats, kind, title, blurb):
    return u"""      <article class="pf-item" data-cat="%s">
        <span class="tile">
          <img class="day"   src="assets/img/%s-day.jpg"   alt="%s in daylight" loading="lazy">
          <img class="night" src="assets/img/%s-night.jpg" alt="%s lit after dark" loading="lazy">
          <span class="badge">Concept</span>
        </span>
        <div class="pf-body">
          <span class="k">%s</span>
          <h3>%s</h3>
          <p>%s</p>
        </div>
      </article>""" % (cats, slug, title, slug, title, kind, title, blurb)

grid = "\n".join(tile(*p) for p in live)

FILTERS = [("all", "Everything"), ("lighting", "Lighting"), ("buildout", "Buildouts"),
           ("commercial", "Commercial"), ("residential", "Residential"), ("property", "Property Managers")]
fbtns = "\n".join(
    '      <button type="button" data-f="%s" aria-pressed="%s">%s</button>' % (k, "true" if k == "all" else "false", t)
    for k, t in FILTERS)

body = phero(
    "hero-day.jpg", "hero-night.jpg", "",
    "Portfolio",
    "Every project<br>has a night version",
    "Lighting, electrical and construction across Florida. Each project below is shown twice &mdash; "
    "as it reads in daylight, and as it reads once it is switched on. The page follows your clock, "
    "so whichever one you are seeing is the one that is true right now.",
    u'<a class="btn btn-p" href="contact.html">Start a project</a>'
    u'<a class="btn btn-s" href="#grid">Browse the work</a>')

body += u"""
<section class="sec" id="grid">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Selected work</p>
      <h2 class="disp">The whole range,<br>under one contract</h2>
      <p class="lede">Filter by what you need. Most of these projects touched more than one division &mdash; which is the point.</p>
    </div>

    <div class="filt rv" data-target=".pf-grid" hidden>
%s
      <span class="filt-live">%d projects</span>
    </div>

    <div class="pf-grid rv">
%s
    </div>

    <div class="note rv">
      <span class="t">About these images</span>
      <p><b>Every image on this page is a concept rendering, not a finished Worldwide Distributors project.</b>
      They are here so the layout and the day/night idea can be judged before real photography is commissioned.
      Each one gets replaced with an actual job &mdash; shot in daylight and again after dark from the same
      position &mdash; before this site goes live. Nothing here is presented as completed work.</p>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">In detail</p>
      <h2 class="disp">What a project<br>actually involves</h2>
      <p class="lede">Three worked examples of how the divisions stack on a single job.</p>
    </div>
  </div>

  <div class="cs par-host rv">
    <div class="cs-media">
      <img class="day"   src="assets/img/medical-day.jpg"   alt="Medical office fit-out in daylight"   data-par="9" loading="lazy">
      <img class="night" src="assets/img/medical-night.jpg" alt="Medical office fit-out lit after dark" data-par="9" loading="lazy">
    </div>
    <div class="cs-body">
      <span class="eyebrow">Buildout &middot; Medical</span>
      <h3>Medical Office Fit-Out</h3>
      <p>A leased shell becomes a working practice. The lighting decision here is not decorative &mdash; a treatment room needs colour rendering good enough to assess a patient by, and a corridor needs to not glare into the eyes of someone lying on a gurney.</p>
      <ul class="cs-scope">
        <li><b>Build</b><span>Demolition, framing, drywall, doors, flooring, finishes</span></li>
        <li><b>Electrical</b><span>Service, panel, circuit rough-in, device trim, emergency and egress</span></li>
        <li><b>Lighting</b><span>Layout, high-CRI fixture spec, glare control, controls</span></li>
        <li><b>After</b><span>Punch list, close-out, ongoing service relationship</span></li>
      </ul>
    </div>
  </div>

  <div class="cs par-host rv">
    <div class="cs-media">
      <img class="day"   src="assets/img/garage-day.jpg"   alt="Parking structure in daylight"   data-par="9" loading="lazy">
      <img class="night" src="assets/img/garage-night.jpg" alt="Parking structure lit after dark" data-par="9" loading="lazy">
    </div>
    <div class="cs-body">
      <span class="eyebrow">Retrofit &middot; Parking</span>
      <h3>Parking Structure Retrofit</h3>
      <p>Old fixtures come out, LED goes in, and the deck stops having dark corners between the pools of light. Managers buy this on the energy number; residents notice it because they stop feeling uneasy walking to their car.</p>
      <ul class="cs-scope">
        <li><b>Survey</b><span>Measured look at existing draw and light levels, honest payback answer</span></li>
        <li><b>Supply</b><span>Fixtures sourced at distributor pricing, spec or substitute</span></li>
        <li><b>Install</b><span>Bucket truck work, circuit changes, photocell and control resets</span></li>
        <li><b>Maintain</b><span>Scheduled checks so failures get caught one fixture at a time</span></li>
      </ul>
    </div>
  </div>

  <div class="cs par-host rv">
    <div class="cs-media">
      <img class="day"   src="assets/img/estate-day.jpg"   alt="Residential estate in daylight"   data-par="9" loading="lazy">
      <img class="night" src="assets/img/estate-night.jpg" alt="Residential estate with landscape lighting" data-par="9" loading="lazy">
    </div>
    <div class="cs-body">
      <span class="eyebrow">Landscape &middot; Residential</span>
      <h3>Estate Uplighting</h3>
      <p>A house lit properly has a few things deliberately bright and everything else deliberately not. The common failure is the opposite: fixtures placed where the wire was easy to run, all at one brightness, aimed at nothing.</p>
      <ul class="cs-scope">
        <li><b>Design</b><span>What gets lit, what stays dark, beam angles and colour temperature</span></li>
        <li><b>Electrical</b><span>Transformer sizing, run lengths, buried splices done to last</span></li>
        <li><b>Install</b><span>Facade grazing, tree uplighting, path and step lighting</span></li>
        <li><b>Maintain</b><span>Re-aiming as trees grow, lens cleaning, connection repair</span></li>
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
         "Lighting, electrical and construction projects across Florida, each shown in daylight and after dark.",
         body)

print("portfolio.html: %d live projects, %d bytes" % (len(live), n))
if missing:
    print("waiting on photography for:", ", ".join(missing))
