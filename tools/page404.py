# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import page

body = u"""
<section class="sec" style="padding-top:clamp(150px,22vh,240px)">
  <div class="wrap">
    <p class="eyebrow">404</p>
    <h1 class="disp" style="font-size:clamp(34px,6.4vw,84px);margin-top:14px">The lights are on.<br>This page isn't.</h1>
    <p class="lede">Whatever you were looking for has moved or never existed. The pages below cover everything we do.</p>
    <div class="btns" style="margin-top:28px">
      <a class="btn btn-p" href="index.html">Back to the start</a>
      <a class="btn btn-s" href="contact.html">Contact us</a>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="grid g4">
      <a class="panel" href="commercial.html"><h3>Commercial</h3><p>Buildouts, tenant improvements, electrical and lighting.</p><span class="go">Go <i>&rarr;</i></span></a>
      <a class="panel" href="residential.html"><h3>Residential</h3><p>Landscape and permanent lighting, electrical service.</p><span class="go">Go <i>&rarr;</i></span></a>
      <a class="panel" href="property-managers.html"><h3>Property<br>Managers</h3><p>Common areas, parking, unit turns, maintenance.</p><span class="go">Go <i>&rarr;</i></span></a>
      <a class="panel" href="projects.html"><h3>Projects</h3><p>Selected work, in daylight and after dark.</p><span class="go">Go <i>&rarr;</i></span></a>
    </div>
  </div>
</section>
"""

page("404.html", "Page not found — Worldwide Distributors",
     "That page could not be found.", body)
