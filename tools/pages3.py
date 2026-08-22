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

    <div class="note rv" id="failed" hidden>
      <span class="t">Not sent</span>
      <p data-why="1">Please give us a name and an email address we can reply to.</p>
      <p data-why="big">Those files were too large for the server to accept at all. Send them under 20&nbsp;MB in total, or email them straight to <a href="mailto:info@elighting.org">info@elighting.org</a>.</p>
      <p data-why="size">The attachments came to more than 20&nbsp;MB. Send the most useful few, or email the rest to <a href="mailto:info@elighting.org">info@elighting.org</a>.</p>
      <p data-why="type">One of those files is a type we do not accept &mdash; photos (JPEG, PNG, HEIC, WebP, GIF) and PDFs only.</p>
      <p data-why="count">That is more than 8 files. Send the most useful ones and we will ask for the rest.</p>
      <p data-why="upload">A file did not finish uploading, usually a dropped connection. Worth trying again.</p>
      <p data-why="mail">The message could not be sent from the server.</p>
      <p data-why="">Something in that did not go through.</p>
      <p class="formnote">Either way you can call <a href="tel:+13059698769" style="color:var(--brand)">(305) 969-8769</a> and we will take the details down the old way.</p>
    </div>

    <div class="note rv" id="sent" hidden>
      <span class="t">Thank you</span>
      <p><b>Your enquiry is in.</b> We will get back to you shortly. If it is urgent, call <a href="tel:+13059698769" style="color:var(--brand)">(305) 969-8769</a>.</p>
    </div>

    <!-- The action below posts to contact.php, included in this folder.
         Confirm the destination address in contact.php before go-live. -->
    <form class="form rv" method="post" action="contact.php" enctype="multipart/form-data">
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
      <label class="field"><span>Drawings, photos or specs</span>
        <input type="file" name="files[]" id="files" multiple
               accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.gif,.pdf,image/*,application/pdf"
               aria-describedby="fileshint">
        <small class="hint" id="fileshint">Photos of the space, a floor plan, a fixture schedule, a spec sheet &mdash; whatever you have. Up to 8 files, 10&nbsp;MB each, 20&nbsp;MB in total. JPEG, PNG, HEIC, WebP, GIF or PDF.</small>
        <output class="filelist" for="files" aria-live="polite"></output></label>
      <label class="field" style="position:absolute;left:-9999px" aria-hidden="true" tabindex="-1">
        <span>Leave this blank</span><input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      <button class="btn btn-p" type="submit">Send enquiry</button>
      <p class="formnote">Prefer to talk? Call <a href="tel:+13059698769" style="color:var(--brand)">(305) 969-8769</a>. We use what you send here to answer your enquiry, nothing else.</p>
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
/* contact.php redirects back here with the outcome in the query string.
   Every message is written in the markup above and starts hidden, so this
   only has to reveal the panel and the one line that applies — there is no
   HTML built in JavaScript here, and nothing to escape. With no script at
   all the visitor simply sees the form again, which is the old behaviour
   rather than a broken one. */
(function () {
  var q = location.search;
  function show(n) {
    if (!n) return;
    n.hidden = false;
    n.scrollIntoView({ block: "center" });
  }
  if (q.indexOf("sent=1") > -1) { show(document.getElementById("sent")); return; }
  var m = q.match(/[?&]error=([a-z0-9]+)/);
  if (!m) return;
  var panel = document.getElementById("failed");
  if (!panel) return;
  var lines = panel.querySelectorAll("p[data-why]"), hit = null;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].getAttribute("data-why") === m[1]) { hit = lines[i]; }
  }
  if (!hit) hit = panel.querySelector('p[data-why=""]');
  for (var j = 0; j < lines.length; j++) {
    if (lines[j] !== hit) lines[j].parentNode.removeChild(lines[j]);
  }
  show(panel);
})();
</script>
"""

page("contact.html",
     "Contact — Worldwide Distributors",
     "Talk to Worldwide Distributors about lighting, electrical or construction in Florida. Call (305) 969-8769 or send a project enquiry.",
     body)
