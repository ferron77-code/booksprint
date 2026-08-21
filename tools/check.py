# -*- coding: utf-8 -*-
import io, os, re, glob
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
        if not os.path.exists(os.path.join(SITE, u.split("?")[0])):
            p.err.append("missing ref: " + u)
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

print("\n%d page(s) with problems" % bad)
