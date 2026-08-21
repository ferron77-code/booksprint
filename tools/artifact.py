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
assets, total = {}, 0
for fn in sorted(os.listdir(os.path.join(SITE, "assets/img"))):
    path = os.path.join(SITE, "assets/img", fn)
    # the scrub frame folder is desktop-only progressive enhancement; the
    # preview keeps the plain video instead of inlining 121 stills
    if os.path.isdir(path):
        continue
    mime = mimetypes.guess_type(fn)[0] or "application/octet-stream"
    raw = io.open(path, "rb").read()
    total += len(raw)
    assets[fn] = "data:%s;base64,%s" % (mime, base64.b64encode(raw).decode("ascii"))
# The scrub frames live in a folder, so they cannot be tokenised like the
# other assets. Bundle every second frame as a data URI and hand the list
# straight to the engine — 61 frames still scrub smoothly and halves the
# weight of this file.
FRAME_SRC = ""
fdir = os.path.join(SITE, "assets/img/buildout")
if os.path.isdir(fdir):
    names = sorted(f for f in os.listdir(fdir) if f.endswith(".jpg"))[::2]
    uris = []
    for fn in names:
        raw = io.open(os.path.join(fdir, fn), "rb").read()
        total += len(raw)
        uris.append("data:image/jpeg;base64," + base64.b64encode(raw).decode("ascii"))
    FRAME_SRC = json.dumps(uris).replace("<", "\\u003c")
    print("scrub frames bundled: %d" % len(uris))

ico = io.open(os.path.join(SITE, "assets/favicon.svg"), "rb").read()
assets["favicon.svg"] = "data:image/svg+xml;base64," + base64.b64encode(ico).decode("ascii")

BRIDGE = u"""
<script>
/* preview shell bridge: route in-site links up to the parent */
document.addEventListener("click", function (e) {
  var a = e.target.closest ? e.target.closest('a[href$=".html"]') : null;
  if (!a) return;
  e.preventDefault();
  parent.postMessage({ wwdGo: a.getAttribute("href").replace(".html", "") }, "*");
});
document.addEventListener("submit", function (e) {
  e.preventDefault();
  var n = document.getElementById("sent");
  if (n) { n.hidden = false; n.scrollIntoView({ block: "center" }); }
  e.target.reset();
});
</script>
"""

docs = {}
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
    s = re.sub(r'assets/(?:img/)?([A-Za-z0-9._-]+\.(?:jpg|png|mp4|svg))', r'@@\1@@', s)
    # the PHP endpoint does not exist in a preview
    s = s.replace('action="contact.php"', 'action="#"')
    if FRAME_SRC and 'id="scrub"' in s:
        s = s.replace('id="scrub"', 'id="scrub" data-frame-src=\'' + FRAME_SRC + "'", 1)
    missing = set(re.findall(r"@@([A-Za-z0-9._-]+)@@", s)) - set(assets)
    assert not missing, (slug, missing)
    docs[slug] = s

def j(o):
    """JSON that is safe to embed inside a <script> block: the page HTML we
    are carrying contains its own </script> tags."""
    return json.dumps(o).replace("<", "\\u003c").replace(">", "\\u003e")

SHELL = u"""<title>Worldwide Distributors</title>
<style>
  html,body{margin:0;padding:0;height:100%%;background:#0B0E13;overflow:hidden}
  #f{border:0;width:100%%;height:100%%;display:block}
</style>
<iframe id="f" title="Worldwide Distributors website preview"></iframe>
<script>
var DOCS = %s, ASSETS = %s;
var f = document.getElementById("f");
function show(slug) {
  if (!DOCS[slug]) slug = "index";
  f.srcdoc = DOCS[slug].replace(/@@([A-Za-z0-9._-]+)@@/g, function (m, k) { return ASSETS[k] || m; });
  if (location.hash.slice(1) !== slug) history.replaceState(null, "", "#" + slug);
}
addEventListener("message", function (e) { if (e.data && e.data.wwdGo) show(e.data.wwdGo); });
addEventListener("hashchange", function () { show(location.hash.slice(1)); });
show(location.hash.slice(1) || "index");
</script>
""" % (j(docs), j(assets))

io.open(OUT, "w", encoding="utf-8").write(SHELL)
print("source assets: %.1f MB" % (total / 1048576.0))
print("preview file:  %.1f MB  -> %s" % (os.path.getsize(OUT) / 1048576.0, OUT))
