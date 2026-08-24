#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Stamp the stylesheet and scripts with a hash of their own contents.

Three times today a change was deployed correctly and could not be seen,
because a browser was still holding the previous site.css or scroll.js. The
HTML is served must-revalidate so it is always fresh, which means the fix is
to make the HTML point at a different URL whenever the file behind it
changes: assets/site.css?v=a1b2c3d4. A browser cannot serve a stale copy of
a URL it has never seen.

Short hash of the file contents, so the query only moves when the file does
and an unchanged deploy does not bust anyone's cache for nothing.
"""
import io, os, re, sys, hashlib, glob

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(os.path.dirname(HERE), "site")
ASSETS = ["site.css", "site.js", "scroll.js"]


def digest(name):
    p = os.path.join(SITE, "assets", name)
    return hashlib.sha256(io.open(p, "rb").read()).hexdigest()[:10]


def main():
    vs = {n: digest(n) for n in ASSETS}
    pat = re.compile(r'(assets/(%s))(\?v=[0-9a-f]+)?' %
                     "|".join(n.replace(".", r"\.") for n in ASSETS))
    total = 0
    for f in sorted(glob.glob(os.path.join(SITE, "*.html"))):
        s = io.open(f, encoding="utf-8").read()
        s2, n = pat.subn(lambda m: "%s?v=%s" % (m.group(1), vs[m.group(2)]), s)
        if s2 != s:
            io.open(f, "w", encoding="utf-8").write(s2)
        total += n
    print("stamped %d reference(s): %s"
          % (total, ", ".join("%s=%s" % (k, v) for k, v in sorted(vs.items()))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
