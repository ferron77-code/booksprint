# -*- coding: utf-8 -*-
"""Bundles the static site into one self-contained HTML file for review.
Assets are stored once as data URIs; each page is composed into an iframe
on navigation, so the real site.js runs unchanged per page."""
import io, os, re, json, base64, mimetypes

SITE = "/home/user/booksprint/site"
OUT  = "/home/user/booksprint/docs/prototype/website-preview.html"
PAGES = ["index", "commercial", "residential", "property-managers", "portfolio", "contact"]

css = io.open(os.path.join(SITE, "assets/site.css"), encoding="utf-8").read()
js  = io.open(os.path.join(SITE, "assets/site.js"),  encoding="utf-8").read()
scr = io.open(os.path.join(SITE, "assets/scroll.js"), encoding="utf-8").read()

# ── assets, base64'd once ────────────────────────────────────────────

# The preview inlines every asset as base64, which is 4/3 of the file, and the
# whole document has to stay under the 16 MB artifact ceiling. Photographs get
# recompressed on the way in — 1000px wide at quality 72 is indistinguishable
# at review size and takes the flat JPEGs from 7.7 MB to 4.0 MB. THE SITE
# ITSELF IS UNTOUCHED; this only ever affects the bundled copy. PNGs are left
# alone: the brand lockups carry alpha, and the scrub frames are left alone so
# scrubbing stays smooth.
FRAME_W, FRAME_H = 720, 405


def shrink_frame(raw):
    """Scrub frames are 960x540 on the site. The preview only has to be
    scrubbable, not sharp, and there are two folders of them now."""
    try:
        from PIL import Image
    except ImportError:
        return raw
    out = io.BytesIO()
    Image.open(io.BytesIO(raw)).convert("RGB").resize(
        (FRAME_W, FRAME_H), Image.LANCZOS).save(out, "JPEG", quality=72, optimize=True)
    return out.getvalue() if out.tell() < len(raw) else raw


PREVIEW_MAXW = 1000
PREVIEW_Q = 72


def shrink(fn, raw):
    if not fn.lower().endswith((".jpg", ".jpeg")):
        return raw
    try:
        from PIL import Image
    except ImportError:
        return raw
    im = Image.open(io.BytesIO(raw))
    if im.width > PREVIEW_MAXW:
        h = int(round(im.height * PREVIEW_MAXW / float(im.width)))
        im = im.resize((PREVIEW_MAXW, h), Image.LANCZOS)
    out = io.BytesIO()
    im.convert("RGB").save(out, "JPEG", quality=PREVIEW_Q, optimize=True)
    return out.getvalue() if out.tell() < len(raw) else raw


assets, total = {}, 0
# assets/brand carries the logo artwork; the -master and supplied- files are
# there for the client, are megabytes each and are not referenced by any page,
# so they stay out of the bundle
IMG_DIRS = ["assets/img", "assets/brand"]
# og-*.jpg are the social cards: meta only, never displayed, and the
# preview strips the tags that point at them.
SKIP = ("-master.png", "supplied-original.png")
for d in IMG_DIRS:
  for fn in sorted(os.listdir(os.path.join(SITE, d))):
    path = os.path.join(SITE, d, fn)
    # the scrub frame folder is desktop-only progressive enhancement; the
    # preview keeps the plain video instead of inlining 121 stills
    # Every real browser plays H.264, so the VP9 twin of a clip is pure weight
    # here — two full copies of the same seconds. Dropped from the bundle, and
    # its <source> line is stripped below so nothing points at a missing asset.
    if fn.endswith(".webm") and os.path.exists(path[:-5] + ".mp4"):
        continue
    if os.path.isdir(path) or fn.endswith(SKIP) or fn.startswith("og-"):
        continue
    mime = mimetypes.guess_type(fn)[0] or "application/octet-stream"
    raw = io.open(path, "rb").read()
    raw = shrink(fn, raw)
    total += len(raw)
    assert fn not in assets, "asset name collides across folders: " + fn
    assets[fn] = "data:%s;base64,%s" % (mime, base64.b64encode(raw).decode("ascii"))
# Scrub frames live in folders, so they cannot be tokenised like the other
# assets. Bundle each folder on demand as a list of data URIs and hand it
# straight to the engine. Every second frame still scrubs smoothly and halves
# the weight of this file.
_frame_cache = {}
def frame_src(base):
    """base is the page's data-base, e.g. 'assets/img/estate-fly/'."""
    global total
    if base in _frame_cache:
        return _frame_cache[base]
    d = os.path.join(SITE, base.strip("/"))
    out = ""
    if os.path.isdir(d):
        names = sorted(f for f in os.listdir(d) if f.endswith(".jpg"))[::3]
        uris = []
        for fn in names:
            raw = shrink_frame(io.open(os.path.join(d, fn), "rb").read())
            total += len(raw)
            uris.append("data:image/jpeg;base64," + base64.b64encode(raw).decode("ascii"))
        out = json.dumps(uris).replace("<", "\\u003c")
        print("  %-26s %3d frames bundled" % (base, len(uris)))
    _frame_cache[base] = out
    return out

ico = ico = io.open(os.path.join(SITE, "assets/favicon.svg"), "rb").read()
assets["favicon.svg"] = "data:image/svg+xml;base64," + base64.b64encode(ico).decode("ascii")

BRIDGE = u"""
<script>
/* preview shell bridge: route in-site links up to the parent */
document.addEventListener("click", function (e) {
  var a = e.target.closest ? e.target.closest("a[href]") : null;
  if (!a) return;
  /* page, or page plus a fragment — the headline links carry one, and an
     "ends with .html" test misses those and lets the iframe navigate
     about:srcdoc to a file that is not there */
  var m = (a.getAttribute("href") || "").match(/^([A-Za-z0-9_-]+)\.html(?:#(.*))?$/);
  if (!m) return;
  e.preventDefault();
  parent.postMessage({ wwdGo: m[1], wwdHash: m[2] || "" }, "*");
});
document.addEventListener("submit", function (e) {
  e.preventDefault();
  var n = document.getElementById("sent");
  if (n) { n.hidden = false; n.scrollIntoView({ block: "center" }); }
  e.target.reset();
});
</script>
"""

docs, frames = {}, {}
for slug in PAGES:
    s = io.open(os.path.join(SITE, slug + ".html"), encoding="utf-8").read()
    # inline stylesheet and script
    s = s.replace('<link rel="stylesheet" href="assets/site.css">',
                  "<style>\n" + css + "\n</style>")
    s = s.replace('<script src="assets/site.js"></script>',
                  "<script>\n" + js + "\n</script>")
    s = s.replace('<script src="assets/scroll.js" defer></script>',
                  "<script>\n" + scr + "\n</script>" + BRIDGE)
    # asset refs become tokens the shell substitutes at navigation time
    s = re.sub(r'assets/(?:img/|brand/)?([A-Za-z0-9._-]+\.(?:jpg|png|mp4|webm|svg))', r'@@\1@@', s)
    # the PHP endpoint does not exist in a preview
    s = s.replace('action="contact.php"', 'action="#"')
    # Social tags name a live origin and are invisible here. Left in, the
    # asset rewrite below would turn their absolute URLs into data URIs and
    # drag every share card into the bundle.
    s = re.sub(r'<link rel="canonical".*?<meta name="theme-color"[^>]*>\n', '', s, flags=re.S)
    # by this point asset paths are already @@tokens@@, so match on the type
    s = re.sub(r'\n[ \t]*<source [^>]*type="video/webm">', '', s)
    # A page can carry more than one scrub; give each its own frames. The
    # frames go in behind their own token rather than inline, because a phone
    # never runs the scrub and megabytes of stills it will not look at are the
    # difference between a page that appears and a page that hangs. The shell
    # decides, at navigation time, whether this viewport gets them.
    for m in re.finditer(r'(<section class="scrub"[^>]*data-base=")([^"]+)(")', s):
        fs = frame_src(m.group(2))
        if fs:
            key = m.group(2).strip("/").split("/")[-1]
            frames[key] = fs
            s = s.replace(m.group(0),
                          m.group(0) + " data-frame-src='@@f:" + key + "@@'", 1)
    missing = set(re.findall(r"@@([A-Za-z0-9._-]+)@@", s)) - set(assets)
    assert not missing, (slug, missing)
    docs[slug] = s

def j(o):
    """JSON that is safe to embed inside a <script> block: the page HTML we
    are carrying contains its own </script> tags."""
    return json.dumps(o).replace("<", "\\u003c").replace(">", "\\u003e")

SHELL = u"""<title>Worldwide Distributors</title>
<!-- Without this a phone lays the shell out at 980px, the site inside
     believes it is on a desktop, and every mobile layout in it is
     skipped. The pages themselves carry one; the shell needs its own. -->
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html,body{margin:0;padding:0;height:100%%;background:#0B0E13;overflow:hidden}
  #f{border:0;width:100%%;height:100%%;display:block}
</style>
<iframe id="f" title="Worldwide Distributors website preview"></iframe>
<script>
var DOCS = %s, ASSETS = %s, FRAMES = %s;
var f = document.getElementById("f");

/* Appended to a page when it is opened at a fragment. A srcdoc document has
   no address, so the fragment cannot arrive in the URL — this does what
   landing on it would have done. The closing tag is split so it cannot end
   the block it is written inside. */
var ACTIVATE =
  "<scr" + "ipt>(function(){var h=__FRAG__;" +
  "var b=document.querySelector('.filt button[data-f=' + JSON.stringify(h) + ']');" +
  "if(b){b.click();return;}" +
  "var el=document.getElementById(h);" +
  "if(el){el.scrollIntoView();}" +
  "})();</scr" + "ipt>";
function show(slug, frag) {
  if (!DOCS[slug]) slug = "index";
  var html = DOCS[slug].replace(/@@([A-Za-z0-9._-]+)@@/g, function (m, k) { return ASSETS[k] || m; });
  /* The scrub is desktop-only. On a phone the section falls back to its
     video, so handing that phone a few megabytes of stills buys nothing and
     costs it the seconds before anything appears at all. */
  var wide = innerWidth >= 900 &&
             !(matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  html = html.replace(/@@f:([A-Za-z0-9._-]+)@@/g, function (m, k) {
    return wide ? (FRAMES[k] || "null") : "null";
  });
  /* A fragment cannot ride in on the URL here — the page is srcdoc, it has
     no address of its own. Append a step that runs after the page scripts
     and does what arriving at that fragment would have done. */
  if (frag) {
    html += ACTIVATE.replace("__FRAG__", JSON.stringify(frag));
  }
  f.srcdoc = html;
  var want = "#" + slug + (frag ? "/" + frag : "");
  if (location.hash !== want) history.replaceState(null, "", want);
}
function route(h) {
  var parts = h.replace(/^#/, "").split("/");
  show(parts[0] || "index", parts[1] || "");
}
addEventListener("message", function (e) {
  if (e.data && e.data.wwdGo) show(e.data.wwdGo, e.data.wwdHash || "");
});
addEventListener("hashchange", function () { route(location.hash); });
route(location.hash);
</script>
""" % (j(docs), j(assets), j(frames))

io.open(OUT, "w", encoding="utf-8").write(SHELL)
print("source assets: %.1f MB" % (total / 1048576.0))
print("preview file:  %.1f MB  -> %s" % (os.path.getsize(OUT) / 1048576.0, OUT))
