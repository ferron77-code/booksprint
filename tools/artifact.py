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
            raw = io.open(os.path.join(d, fn), "rb").read()
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
    s = re.sub(r'assets/(?:img/)?([A-Za-z0-9._-]+\.(?:jpg|png|mp4|webm|svg))', r'@@\1@@', s)
    # the PHP endpoint does not exist in a preview
    s = s.replace('action="contact.php"', 'action="#"')
    m = re.search(r'id="scrub"[^>]*data-base="([^"]+)"', s)
    if m:
        fs = frame_src(m.group(1))
        if fs:
            s = s.replace('id="scrub"', 'id="scrub" data-frame-src=\'' + fs + "'", 1)
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
""" % (j(docs), j(assets))

io.open(OUT, "w", encoding="utf-8").write(SHELL)
print("source assets: %.1f MB" % (total / 1048576.0))
print("preview file:  %.1f MB  -> %s" % (os.path.getsize(OUT) / 1048576.0, OUT))
