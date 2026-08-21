# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import page
from pages_common import phero

body = phero(
    "court-day.jpg", "court-night.jpg", "",
    "Contact",
    "One number.<br>One company<br>accountable.",
    "Lighting, electrical or construction &mdash; or all three. Tell us what you are working on "
    "and the right person calls you back, rather than routing you through three companies first.",
    u'<a class="btn btn-p" href="tel:+13059698769">(305) 969-8769</a>'
    u'<a class="btn btn-s" href="mailto:info@elighting.org">info@elighting.org</a>')

body += u"""
<section class="sec">
  <div class="wrap">
    <div class="contact rv" style="margin-top:0">
      <div class="ci"><b>Phone</b><p><a href="tel:+13059698769">(305) 969-8769</a></p></div>
      <div class="ci"><b>Email</b><p><a href="mailto:info@elighting.org">info@elighting.org</a></p></div>
      <div class="ci"><b>Where we work</b><p>Headquartered in Miami, Florida.<br>Serving Florida.</p></div>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Project enquiry</p>
      <h2 class="disp">Tell us what<br>you're building</h2>
      <p class="lede">The more you can say about the space, the more useful the first call is. Nothing here is required except a way to reach you.</p>
    </div>

    <div class="note rv" id="sent" hidden>
      <span class="t">Thank you</span>
      <p><b>Your enquiry is in.</b> We will get back to you shortly. If it is urgent, call <a href="tel:+13059698769" style="color:var(--accent)">(305) 969-8769</a>.</p>
    </div>

    <!-- The action below posts to contact.php, included in this folder.
         Confirm the destination address in contact.php before go-live. -->
    <form class="form rv" method="post" action="contact.php">
      <div class="f2">
        <label class="field"><span>Name <i>*</i></span>
          <input type="text" name="name" required autocomplete="name"></label>
        <label class="field"><span>Company</span>
          <input type="text" name="company" autocomplete="organization"></label>
      </div>
      <div class="f2">
        <label class="field"><span>Email <i>*</i></span>
          <input type="email" name="email" required autocomplete="email"></label>
        <label class="field"><span>Phone</span>
          <input type="tel" name="phone" autocomplete="tel"></label>
      </div>
      <div class="f2">
        <label class="field"><span>What kind of project</span>
          <select name="kind">
            <option>Not sure yet</option>
            <option>Commercial buildout</option>
            <option>Commercial lighting or electrical</option>
            <option>Property or association services</option>
            <option>Residential lighting</option>
            <option>Residential electrical</option>
            <option>Supply only &mdash; buying the package</option>
          </select></label>
        <label class="field"><span>Property location</span>
          <input type="text" name="location" placeholder="City or address"></label>
      </div>
      <label class="field"><span>Tell us about it</span>
        <textarea name="message" placeholder="The space, the timeline, what is already there, what you want it to become."></textarea></label>
      <label class="field" style="position:absolute;left:-9999px" aria-hidden="true" tabindex="-1">
        <span>Leave this blank</span><input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      <button class="btn btn-p" type="submit">Send enquiry</button>
      <p class="formnote">Prefer to talk? Call <a href="tel:+13059698769" style="color:var(--accent)">(305) 969-8769</a>. We use what you send here to answer your enquiry, nothing else.</p>
    </form>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Before you call</p>
      <h2 class="disp">Useful to have<br>on hand</h2>
    </div>
    <dl class="rows rv">
      <div class="row"><dt>Photos</dt><dd>Phone photos of the space as it stands answer more questions than a description does. Daylight is fine.</dd></div>
      <div class="row"><dt>Drawings</dt><dd>A lease plan, a survey or an architect's set if you have one. If you do not, we work from the space itself.</dd></div>
      <div class="row"><dt>Timeline</dt><dd>The date that actually matters &mdash; a lease commencement, an inspection, an event.</dd></div>
      <div class="row"><dt>Scope</dt><dd>Whether you want the whole thing handled or only one piece of it. Both are normal.</dd></div>
    </dl>
  </div>
</section>

<script>
if (location.search.indexOf("sent=1") > -1) {
  var s = document.getElementById("sent");
  if (s) { s.hidden = false; s.scrollIntoView({ block: "center" }); }
}
</script>
"""

page("contact.html",
     "Contact — Worldwide Distributors",
     "Talk to Worldwide Distributors about lighting, electrical or construction in Florida. Call (305) 969-8769 or send a project enquiry.",
     body)
