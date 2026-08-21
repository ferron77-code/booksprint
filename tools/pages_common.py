# -*- coding: utf-8 -*-

def phero(img, alt, eyebrow, h1, lede, btns):
    """Interior-page hero. One photograph — the work is shot at night, so
    there is no day/night pair to cross-fade."""
    return u"""
<section class="phero">
  <div class="hero-shots" aria-hidden="true">
    <img src="assets/img/%s" alt="" fetchpriority="high">
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
""" % (img, eyebrow, h1, lede, btns)

CTA_P = u'<a class="btn btn-p" href="contact.html">Start a project</a>'
CTA_S = u'<a class="btn btn-s" href="portfolio.html">See the work</a>'
