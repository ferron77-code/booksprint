# -*- coding: utf-8 -*-
"""Static link audit: does every href/src/action resolve, and does every
in-page anchor have something to land on?"""
import io, os, re, glob
from html.parser import HTMLParser

SITE = "/home/user/booksprint/site"
pages = sorted(glob.glob(os.path.join(SITE, "*.html")))
names = {os.path.basename(p) for p in pages}

ids, refs = {}, []          # page -> set(ids);  (page, kind, value)
class P(HTMLParser):
    def __init__(s, page): HTMLParser.__init__(s); s.page = page
    def handle_starttag(s, tag, attrs):
        a = dict(attrs)
        if a.get("id"): ids.setdefault(s.page, set()).add(a["id"])
        if a.get("name") and tag == "a": ids.setdefault(s.page, set()).add(a["name"])
        for k in ("href", "src", "action", "poster"):
            if a.get(k): refs.append((s.page, tag, k, a[k]))

for f in pages:
    page = os.path.basename(f)
    ids.setdefault(page, set())
    p = P(page); p.feed(io.open(f, encoding="utf-8").read()); p.close()

problems, stats = [], {"internal":0, "anchor":0, "asset":0, "tel":0, "mailto":0, "external":0}

TEL = re.compile(r"^tel:\+?[0-9]{10,15}$")
MAIL = re.compile(r"^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$", re.I)

for page, tag, attr, val in refs:
    v = val.strip()
    if v.startswith(("http://", "https://")):
        stats["external"] += 1
    elif v.startswith("tel:"):
        stats["tel"] += 1
        if not TEL.match(v): problems.append((page, "malformed tel", v))
    elif v.startswith("mailto:"):
        stats["mailto"] += 1
        if not MAIL.match(v): problems.append((page, "malformed mailto", v))
    elif v.startswith("#"):
        stats["anchor"] += 1
        t = v[1:]
        if t and t not in ids[page]:
            problems.append((page, "anchor has no target", v))
    elif v.startswith("data:") or v.startswith("//"):
        pass
    else:
        target = v.split("#")[0].split("?")[0]
        frag = v.split("#")[1] if "#" in v else ""
        path = os.path.join(SITE, target)
        if target.endswith(".html"):
            stats["internal"] += 1
            if target not in names:
                problems.append((page, "page does not exist", v))
            elif frag and frag not in ids.get(target, set()):
                # a portfolio filter key is a real destination too — scroll.js
                # applies it on arrival
                dst = io.open(os.path.join(SITE, target), encoding="utf-8").read()
                if ('data-f="%s"' % frag) not in dst:
                    problems.append((page, "cross-page anchor missing", v))
        else:
            stats["asset"] += 1
            if not os.path.exists(path):
                problems.append((page, "file does not exist", v))

print("=== reference counts ===")
for k, n in stats.items(): print("  %-9s %d" % (k, n))

print("\n=== every page reachable from the nav? ===")
linked = {v.split("#")[0] for _, _, _, v in refs if v.endswith(".html")}
for n in sorted(names):
    mark = "linked" if n in linked else ("entry point" if n == "index.html" else "ORPHAN")
    print("  %-26s %s" % (n, mark))

print("\n=== problems ===")
if problems:
    for pg, why, v in problems: print("  %-24s %-26s %s" % (pg, why, v))
else:
    print("  none")
print("\n%d problem(s)" % len(problems))
