#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Write the licence numbers and social links into index.html.

The interior pages are generated, so they pick LICENCES up from chrome.py on
every build. index.html is hand-written and does not, which meant setting the
real numbers would have quietly left the homepage — the page carrying the
"Licensed & Insured" proof strip — still showing placeholders.

Slots are marked with data-licence in the markup; data-licence="br" is the
proof strip, which stacks rather than running inline. data-social is the
footer's row of profile icons, filled from SOCIAL_LINKS the same way.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True
from chrome import licence_line, social_links

INDEX = os.path.join(os.path.dirname(HERE), "site", "index.html")


def main():
    s = io.open(INDEX, encoding="utf-8").read()
    n = 0

    def sub(m):
        nonlocal n
        n += 1
        sep = "<br>" if m.group(1) == '="br"' else " &middot; "
        return '<span class="tbd" data-licence%s>%s</span>' % (m.group(1), licence_line(sep))

    s2 = re.sub(r'<span class="tbd" data-licence(="br"|)>.*?</span>', sub, s, flags=re.S)

    m = 0

    def soc(_):
        nonlocal m
        m += 1
        return '<span data-social>%s</span>' % social_links()

    s2, _c = re.subn(r'<span data-social>.*?</span>', soc, s2, flags=re.S)
    if s2 != s:
        io.open(INDEX, "w", encoding="utf-8").write(s2)
    print("index.html: %d licence slot(s), %d social slot(s) written" % (n, m))
    return 0 if n else 1


if __name__ == "__main__":
    sys.exit(main())
