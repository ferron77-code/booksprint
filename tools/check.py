# -*- coding: utf-8 -*-
import io, os, re, sys, glob
from html.parser import HTMLParser

SITE = "/home/user/booksprint/site"
VOID = set("area base br col embed hr img input link meta param source track wbr".split())

class P(HTMLParser):
    def __init__(s, f):
        HTMLParser.__init__(s, convert_charrefs=True)
        s.f = f; s.stack = []; s.err = []
    def handle_starttag(s, t, a):
        if t not in VOID: s.stack.append((t, s.getpos()[0]))
    def handle_endtag(s, t):
        if t in VOID: return
        if not s.stack:
            s.err.append("stray </%s> line %d" % (t, s.getpos()[0])); return
        if s.stack[-1][0] == t: s.stack.pop()
        else:
            for i in range(len(s.stack) - 1, -1, -1):
                if s.stack[i][0] == t:
                    for bad in s.stack[i+1:]:
                        s.err.append("unclosed <%s> opened line %d" % bad)
                    del s.stack[i:]; return
            s.err.append("stray </%s> line %d" % (t, s.getpos()[0]))

bad = 0
pages = sorted(glob.glob(os.path.join(SITE, "*.html")))
for f in pages:
    src = io.open(f, encoding="utf-8").read()
    p = P(f); p.feed(src); p.close()
    for t, ln in p.stack: p.err.append("never closed <%s> line %d" % (t, ln))
    # asset + link refs
    for m in re.finditer(r'(?:src|href)="([^"#][^"]*)"', src):
        u = m.group(1)
        if u.startswith(("http", "mailto:", "tel:", "data:")): continue
        target, _, frag = u.partition("#")
        target = target.split("?")[0]
        path = os.path.join(SITE, target)
        if not os.path.exists(path):
            p.err.append("missing ref: " + u)
        elif frag and target.endswith(".html"):
            # the fragment has to be something on that page: an element id, or
            # a portfolio filter key, which scroll.js applies on arrival
            dst = io.open(path, encoding="utf-8").read()
            if ('id="%s"' % frag) not in dst and ('data-f="%s"' % frag) not in dst:
                p.err.append("dead anchor: " + u)
    name = os.path.basename(f)
    if p.err:
        bad += 1
        print("FAIL %s" % name)
        for e in p.err[:14]: print("   ", e)
    else:
        print("ok   %-24s %6d bytes" % (name, len(src)))

# ids that site.js hooks
HOOKS = ["track", "grad", "knob", "live"]
for f in pages:
    src = io.open(f, encoding="utf-8").read()
    miss = [h for h in HOOKS if ('id="%s"' % h) not in src]
    if miss: print("WARN %s missing hooks %s" % (os.path.basename(f), miss))
    for dup in re.findall(r'id="([^"]+)"', src):
        if src.count('id="%s"' % dup) > 1:
            print("WARN %s duplicate id %s" % (os.path.basename(f), dup)); break

# ── social cards ──────────────────────────────────────────────────────
# index.html is hand-written and not regenerated, so it is the one that can
# drift away from what chrome.py emits. An empty og:description slipped
# through once already.
REQUIRED = ["og:type", "og:site_name", "og:url", "og:title", "og:description",
            "og:image", "og:image:width", "og:image:height", "og:image:alt",
            "twitter:card"]
origins = set()
for f in pages:
    name = os.path.basename(f)
    src = io.open(f, encoding="utf-8").read()
    meta = dict(re.findall(r'<meta (?:property|name)="((?:og|twitter):[a-z_:]+)" content="([^"]*)"', src))
    bad_meta = []
    for k in REQUIRED:
        if k not in meta:
            bad_meta.append("no " + k)
        elif not meta[k].strip():
            bad_meta.append("empty " + k)
    if 'rel="canonical"' not in src:
        bad_meta.append("no canonical")
    img = meta.get("og:image", "")
    if img:
        origins.add(img.split("/assets/")[0])
        local = os.path.join(SITE, "assets", img.split("/assets/")[-1])
        if not os.path.exists(local):
            bad_meta.append("og:image not on disk: " + os.path.basename(img))
    url = meta.get("og:url", "")
    if url:
        origins.add(url.rsplit("/", 1)[0])
        if not url.endswith("/" + name):
            bad_meta.append("og:url points at %s, not %s" % (url.rsplit("/", 1)[-1], name))
    if bad_meta:
        bad += 1
        print("FAIL %s social" % name)
        for e in bad_meta: print("   ", e)
if len(origins) > 1:
    bad += 1
    print("FAIL mixed origins in social tags: %s" % sorted(origins))
elif origins:
    print("     social cards on %s" % origins.pop())

# ── licence numbers ───────────────────────────────────────────────────
# Florida requires the real number in advertising. The placeholders are all
# X on purpose so they cannot pass for one, and this fails the build while
# any is still standing, so the site cannot go live carrying them.
#
# This reads the BUILT PAGES, not chrome.py. An earlier version imported the
# module and a stale __pycache__ served it the previous values — the gate
# passed while the source said otherwise, which is exactly how something like
# this ships by accident. What is on the page is the only thing that matters,
# so that is what gets checked.
stale = {}
for f in pages:
    src = io.open(f, encoding="utf-8").read()
    for m in re.findall(r'[A-Z]{2,4}-X{4,}', src):
        stale.setdefault(os.path.basename(f), set()).add(m)
if stale:
    bad += 1
    print("FAIL licence placeholders are still on the pages")
    for name in sorted(stale):
        print("     %-24s %s" % (name, ", ".join(sorted(stale[name]))))
    print("     Set LICENCES in tools/chrome.py, then rebuild.")
    print("     Drop any the company does not hold rather than leaving a stand-in.")

# Social profiles are optional in a way a licence number is not — a company
# with no Facebook page is not a company with a problem — so this reports
# rather than fails. It still has to be said out loud on every build, or the
# placeholder sits there until someone happens to look.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import SOCIAL_LINKS
waiting = [n for n, u, _ in SOCIAL_LINKS if not u or "YOUR-" in u]
if waiting:
    print("NOTE  no URL yet for: %s" % ", ".join(waiting))
    print("      The footer and contact rows render nothing until SOCIAL_LINKS")
    print("      in tools/chrome.py has a real profile URL. Delete any account")
    print("      the company does not run rather than leaving it pointing nowhere.")

print("\n%d page(s) with problems" % bad)
