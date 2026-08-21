# -*- coding: utf-8 -*-
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
  <span class="rend">Concept imagery &middot; pending project photography</span>
</section>
""" % (day, night, eyebrow, h1, lede, btns)

CTA_P = u'<a class="btn btn-p" href="contact.html">Start a project</a>'
CTA_S = u'<a class="btn btn-s" href="projects.html">See the work</a>'
