# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import page, social_links
from pages_common import phero

body = phero(
    "court-day.jpg", "court-night.jpg", "",
    "Contact",
    "One number.<br>One company<br>accountable.",
    "Lighting, electrical or construction &mdash; or all three. Tell us what you are working on "
    "and the right person calls you back, rather than routing you through three companies first.",
    u'<a class="btn btn-p" href="tel:+13059698754">(305) 969-8754</a>'
    u'<a class="btn btn-s" href="mailto:info@elighting.org">info@elighting.org</a>')

# ── the enquiry form ──────────────────────────────────────────────────
# Netlify detects the form by reading the deployed HTML at deploy time, so a
# site with no build step needs nothing beyond the markup: data-netlify plus
# a hidden form-name that matches the form's name. Submissions land in the
# site's Forms tab and can be forwarded to an address from there.
#
# It posts the ordinary way rather than over fetch. Staying on the page is
# nicer, but a failed background request loses the enquiry with the visitor
# none the wiser, and it stops working altogether if a script is blocked.
# Success goes to thanks.html.
#
# This replaced contact.php, which Netlify cannot execute — it would have
# served the source or a 404, and every enquiry sent from the live site
# would have gone nowhere. check.py now fails the build if the wiring is
# missing or a PHP handler creeps back in.

body += u"""
<section class="sec">
  <div class="wrap">
    <div class="contact rv" style="margin-top:0">
      <div class="ci"><b>Phone</b><p><a href="tel:+13059698754">(305) 969-8754</a></p></div>
      <div class="ci"><b>Email</b><p><a href="mailto:info@elighting.org">info@elighting.org</a></p></div>
      <div class="ci"><b>Office</b><p>12130 SW 114th Place<br>Miami, Florida</p></div>
      <div class="ci"><b>Hours</b><p>Monday to Friday<br>8am &ndash; 5pm</p></div>
      {social_ci}
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

    <!-- Netlify Forms: the data-netlify attribute and a matching hidden
         form-name are the whole wiring. A plain POST rather than fetch, so
         a blocked script cannot lose an enquiry. -->
    <form class="form rv" name="enquiry" method="post" action="thanks.html"
          data-netlify="true" data-netlify-honeypot="website"
          enctype="multipart/form-data">
      <input type="hidden" name="form-name" value="enquiry">
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
      <!-- Five inputs rather than one multiple: Netlify Forms takes a single
           file per field and would quietly drop everything after the first.

           Five of them, and not three, because site.js resizes photos in the
           browser before they are sent — a 10 MB phone photo lands at a few
           hundred KB — so the 8 MB Netlify allows per submission stopped
           being the thing that decides how many a customer may attach. What
           it still decides is PDFs, which cannot be resized. -->
      <div class="field">
        <span id="fileslbl">Drawings, photos or specs</span>
        <input type="file" name="file1" id="files"
               accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.gif,.pdf,image/*,application/pdf"
               aria-labelledby="fileslbl" aria-describedby="fileshint">
        <input type="file" name="file2" id="file2"
               accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.gif,.pdf,image/*,application/pdf"
               aria-label="Photo or file 2" aria-describedby="fileshint">
        <input type="file" name="file3" id="file3"
               accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.gif,.pdf,image/*,application/pdf"
               aria-label="Photo or file 3" aria-describedby="fileshint">
        <input type="file" name="file4" id="file4"
               accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.gif,.pdf,image/*,application/pdf"
               aria-label="Photo or file 4" aria-describedby="fileshint">
        <input type="file" name="file5" id="file5"
               accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.gif,.pdf,image/*,application/pdf"
               aria-label="Photo or file 5" aria-describedby="fileshint">
        <small class="hint" id="fileshint">Photos of the space, a floor plan, a fixture schedule, a spec sheet &mdash; whatever you have. Up to five, and photos are resized as they are sent, so send them straight off your phone without worrying about the size. Drawings and PDFs go as they are: if one is bigger than about 7&nbsp;MB, email it to <a href="mailto:info@elighting.org">info@elighting.org</a> instead. JPEG, PNG, HEIC, WebP, GIF or PDF.</small>
        <output class="filelist" aria-live="polite"></output>
      </div>
      <label class="field" style="position:absolute;left:-9999px" aria-hidden="true" tabindex="-1">
        <span>Leave this blank</span><input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      <!-- Shown only when the attachments will not fit. Rather than telling
           someone with 25 MB of drawings to start again somewhere else, the
           button opens their mail app with everything they have already typed
           carried across, so the only thing left to do is attach the files.
           site.js fills in the href and unhides this. -->
      <div class="note" id="toobig" hidden>
        <span class="t">Too large to send from here</span>
        <p><b>Those attachments are over what the form can carry.</b> Nothing is lost &mdash; the button below opens an email with everything you have typed already filled in. Attach the files there and send.</p>
        <div class="btns" style="margin-top:14px">
          <a class="btn btn-p" id="mailover" href="mailto:info@elighting.org">Email it instead &rarr;</a>
        </div>
      </div>
      <button class="btn btn-p" type="submit">Send enquiry</button>
      <p class="formnote">Prefer to talk? Call <a href="tel:+13059698754" style="color:var(--brand)">(305) 969-8754</a>. We use what you send here to answer your enquiry, nothing else.</p>
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
"""

# The contact details row gets a labeled "Follow" item, but only if there is
# an account to point at — an empty one would just be a heading over nothing.
_soc = social_links("soc")
body = body.replace(
    "{social_ci}",
    '<div class="ci"><b>Follow</b>%s</div>' % _soc if _soc else "")

page("contact.html",
     "Contact — Worldwide Distributors",
     "Talk to Worldwide Distributors about lighting, electrical or construction in Florida. Call (305) 969-8754 or send a project enquiry.",
     body)


# ══════════════════════════════════════════════════════════════ THANK YOU
# Where Netlify sends a successful submission. A real page rather than an
# inline note: it has its own address, so it survives a refresh and can be
# used as a conversion goal later, and the back button does the sensible
# thing. Kept out of the nav and out of the sitemap — nobody arrives here
# except by sending the form.
thanks = u"""
<section class="sec" style="padding-top:clamp(90px,14vh,180px)">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">Enquiry received</p>
      <h2 class="disp">Thank you.<br>It is in.</h2>
      <p class="lede">Someone will come back to you shortly &mdash; usually the same working day, and by the next one at the latest. If it is urgent, call rather than wait.</p>
      <div class="btns" style="margin-top:26px">
        <a class="btn btn-p" href="tel:+13059698754">(305) 969-8754</a>
        <a class="btn btn-s" href="index.html">Back to the site</a>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">While you wait</p>
      <h2 class="disp">Anything else<br>worth sending</h2>
    </div>
    <dl class="rows rv">
      <div class="row"><dt>More photos</dt><dd>If you had more than three, or something too large for the form, email them to <a href="mailto:info@elighting.org" style="color:var(--brand)">info@elighting.org</a> and we will put them with your enquiry.</dd></div>
      <div class="row"><dt>Drawings</dt><dd>A lease plan, a survey or an architect's set, if one exists and you did not attach it.</dd></div>
      <div class="row"><dt>Hours</dt><dd>Monday to Friday, 8am &ndash; 5pm. Messages left outside those hours are picked up the next morning.</dd></div>
    </dl>
  </div>
</section>
"""

page("thanks.html",
     "Thank you — Worldwide Distributors",
     "Your enquiry has been received. Someone from Worldwide Distributors will be in touch shortly.",
     thanks,
     noindex=True)
