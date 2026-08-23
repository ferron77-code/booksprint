#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Write into index.html the things chrome.py knows and it does not.

The interior pages are generated, so they pick LICENCES up from chrome.py on
every build. index.html is hand-written and does not, which meant setting the
real numbers would have quietly left the homepage — the page carrying the
"Licensed & Insured" proof strip — still showing placeholders.

Slots are marked with data-licence in the markup; data-licence="br" is the
proof strip, which stacks rather than running inline. data-social is the
footer's row of profile icons, filled from SOCIAL_LINKS the same way.

The absolute URLs in its canonical and share tags are rewritten from
SITE_URL too. Changing the domain in chrome.py moved every generated page
and left the home page pointing at the old origin — the one page whose
share card gets posted most.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True
from chrome import licence_line, social_links, SITE_URL

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

    # Only the absolute self-references: the canonical, og:url and the two
    # card images. Deliberately not a blanket origin swap — info@elighting.org
    # is their actual mailbox and the font preconnects are not ours to touch.
    s2, o = re.subn(
        r'(<(?:link|meta)\b[^>]*?(?:href|content)=")https?://[^"]*?'
        r'(/index\.html|/assets/img/og-[a-z0-9-]+\.jpg)(")',
        lambda m: m.group(1) + SITE_URL + m.group(2) + m.group(3), s2)

    if s2 != s:
        io.open(INDEX, "w", encoding="utf-8").write(s2)
    print("index.html: %d licence slot(s), %d social slot(s), %d URL(s) written"
          % (n, m, o))
    return 0 if n else 1


if __name__ == "__main__":
    sys.exit(main())
