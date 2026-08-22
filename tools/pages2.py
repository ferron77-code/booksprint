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

<!-- Progressive relight: each fixture opens its own circle as you scroll,
     so the property switches on one fixture at a time. Under reduced motion
     scroll.js crossfades the whole night frame instead. -->
<section class="relight" data-points="[[13,64,24],[27,68,22],[36,52,20],[49,55,22],[52,76,24],[68,52,22],[75,70,22],[89,44,20]]">
  <div class="relight-stick">
    <div class="relight-stage">
      <img class="rl-dark" src="assets/img/scene-lot.jpg" alt="A commercial parking lot at night, its pole lighting coming on">
      <div class="rl-night"><img src="assets/img/scene-lot.jpg" alt=""></div>
      <p class="rl-count"><b>0</b> fixtures on</p>
      <div class="rl-copy">
        <div class="wrap">
          <p class="eyebrow">Parking lighting &middot; pole by pole</p>
          <h2 class="disp">No dark gaps<br>between the pools</h2>
          <p>A lot is not lit because the fixtures work. It is lit when the pools overlap and there is nowhere left that feels unsafe walking to your car. The gaps closing is the whole job.</p>
        </div>
      </div>
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
