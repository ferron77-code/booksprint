# -*- coding: utf-8 -*-
"""Renders the social share cards.

One 1200x630 JPEG per page: the page's own photograph, a scrim, and the
Worldwide Distributors lockup. Rendered in Chromium rather than drawn with a
graphics library so the type is the site's own — Archivo and IBM Plex Mono,
same weights and widths as the pages themselves.

    python3 tools/ogcards.py
"""
import io, os, json, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SITE = os.path.join(ROOT, "site")
OUT  = os.path.join(SITE, "assets", "img")
TMP  = "/tmp/claude-0/-home-user-booksprint/4525b3a2-eb2a-5f0d-be3a-9811478151c3/scratchpad/og"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

# Every photograph below is the company's own work — see photo-provenance.md.
# The page heroes are still renderings, so they are deliberately not used
# here: the share card is the first thing an outsider sees.
CARDS = [
    ("index",             "lot.jpg",       "Lighting. Electrical.<br>Construction.",     "One contract, one company. Miami, Florida."),
    ("commercial",        "highbay.jpg",   "Empty shell<br>to open doors",              "Buildouts, electrical and lighting under one contract."),
    ("residential",       "palm.jpg",      "Nobody sees<br>the fixtures",               "Residential and landscape lighting design."),
    ("property-managers", "hedge.jpg",     "One call for<br>the whole property",        "Common areas, garages, grounds and service."),
    ("portfolio",         "walls.jpg",     "Every project has<br>a night version",      "Selected lighting, electrical and buildout work."),
    ("contact",           "pool.jpg",      "Tell us what<br>you're building",           "Call (305) 969-8754 or send the drawings."),
]

TPL = u"""<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden;background:#06080B}
  .card{position:relative;width:1200px;height:630px;overflow:hidden}
  .shot{position:absolute;inset:0;width:100%%;height:100%%;object-fit:cover}
  .scrim{position:absolute;inset:0;background:
    linear-gradient(105deg, rgba(4,6,9,.94) 0%%, rgba(4,6,9,.80) 38%%, rgba(4,6,9,.18) 74%%, rgba(4,6,9,.42) 100%%),
    linear-gradient(0deg, rgba(4,6,9,.72) 0%%, rgba(4,6,9,0) 46%%)}
  .in{position:absolute;left:72px;top:70px;right:72px;bottom:66px;
      display:flex;flex-direction:column;justify-content:space-between}
  .brand{display:flex;align-items:center;gap:16px}
  .brand svg{width:52px;height:52px;color:#4C82FF;flex:none}
  .wm b{display:block;font-family:Archivo,sans-serif;font-variation-settings:"wdth" 112,"wght" 800;
        font-size:25px;letter-spacing:.02em;text-transform:uppercase;line-height:1;color:#F6F3EE}
  .wm span{display:block;margin-top:5px;font-family:"IBM Plex Mono",monospace;font-size:11.5px;
           letter-spacing:.19em;text-transform:uppercase;color:#9AA6B4}
  /* The line breaks are authored in CARDS; a ch-based max-width would
     override them and push every headline to four lines. */
  h1{font-family:Archivo,sans-serif;font-variation-settings:"wdth" 106,"wght" 780;
     font-size:57px;line-height:1.04;letter-spacing:-.015em;text-transform:uppercase;color:#F6F3EE;
     text-shadow:0 2px 40px rgba(4,6,9,.6);max-width:680px}
  .foot{display:flex;align-items:center;gap:18px}
  .rule{width:52px;height:3px;background:#4C82FF;flex:none}
  .foot p{font-family:"IBM Plex Mono",monospace;font-size:16px;letter-spacing:.06em;color:#D6DCE4}
</style>
<div class="card">
  <img class="shot" src="%(img)s">
  <div class="scrim"></div>
  <div class="in">
    <div class="brand">
      <svg viewBox="0 0 100 100"><path fill="currentColor" d="%(mono)s"/></svg>
      <span class="wm"><b>Worldwide Distributors</b><span>Lighting &middot; Electrical &middot; Construction</span></span>
    </div>
    <div>
      <h1>%(head)s</h1>
      <div class="foot"><span class="rule"></span><p>%(line)s</p></div>
    </div>
  </div>
</div>
"""

def mono_path():
    """The monogram, lifted from the mark the header already uses."""
    svg = io.open(os.path.join(SITE, "assets/brand/mark-e.svg"), encoding="utf-8").read()
    a = svg.index(' d="') + 4
    return svg[a:svg.index('"', a)]

def main():
    if not os.path.isdir(TMP):
        os.makedirs(TMP)
    mono = mono_path()
    jobs = []
    for slug, img, head, line in CARDS:
        html = TPL % {"img": "file://" + os.path.join(OUT, img), "mono": mono,
                      "head": head, "line": line}
        page = os.path.join(TMP, slug + ".html")
        io.open(page, "w", encoding="utf-8").write(html)
        jobs.append({"page": "file://" + page,
                     "out": os.path.join(OUT, "og-" + slug + ".jpg")})

    shot = os.path.join(TMP, "shoot.mjs")
    io.open(shot, "w", encoding="utf-8").write(u"""
import { chromium } from "playwright";
const jobs = %s;
const b = await chromium.launch({ executablePath: %s });
const ctx = await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
for (const j of jobs) {
  await p.goto(j.page, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  await p.screenshot({ path: j.out, type: "jpeg", quality: 86 });
  console.log("  " + j.out.split("/").pop());
}
await b.close();
""" % (json.dumps(jobs), json.dumps(CHROME)))

    r = subprocess.run(["node", shot], capture_output=True, text=True,
                       cwd="/tmp/claude-0/-home-user-booksprint/4525b3a2-eb2a-5f0d-be3a-9811478151c3/scratchpad")
    sys.stdout.write(r.stdout)
    if r.returncode:
        sys.stderr.write(r.stderr)
        return 1
    for slug, _, _, _ in CARDS:
        p = os.path.join(OUT, "og-" + slug + ".jpg")
        print("  %-28s %6.1f KB" % (os.path.basename(p), os.path.getsize(p) / 1024.0))
    return 0

if __name__ == "__main__":
    sys.exit(main())
