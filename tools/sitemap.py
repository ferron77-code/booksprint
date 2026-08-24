#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate robots.txt and sitemap.xml from SITE_URL.

Both were hand-written and both said worldwidedistributorsinc.com while the
canonical tags said www.worldwidedistributorsinc.com. To a search engine
those are two different sites, and the sitemap was telling it to index the
half the pages themselves disown. Generating them removes the chance of that
drifting again: the domain is decided in exactly one place.

The home page is listed as "/" rather than "/index.html" because that is the
address people link to, and it is what the canonical resolves to on any sane
host. Everything else uses the filename the site actually serves.
"""
import io, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True
from chrome import SITE_URL

OUT = os.path.join(os.path.dirname(HERE), "site")

# path, priority. 404 is deliberately absent — it is not a destination.
PAGES = [
    ("/",                       "1.0"),
    ("/commercial.html",        "0.8"),
    ("/residential.html",       "0.8"),
    ("/property-managers.html", "0.8"),
    ("/portfolio.html",         "0.7"),
    ("/contact.html",           "0.9"),
]


def main():
    rows = "\n".join(
        '  <url><loc>%s%s</loc><priority>%s</priority></url>' % (SITE_URL, p, pr)
        for p, pr in PAGES)
    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n'
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
               + rows + '\n</urlset>\n')
    io.open(os.path.join(OUT, "sitemap.xml"), "w", encoding="utf-8").write(sitemap)

    robots = ("User-agent: *\n"
              "Allow: /\n\n"
              "Sitemap: %s/sitemap.xml\n" % SITE_URL)
    io.open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8").write(robots)

    print("robots.txt and sitemap.xml written for %s (%d pages)"
          % (SITE_URL, len(PAGES)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
