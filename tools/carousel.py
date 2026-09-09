# -*- coding: utf-8 -*-
"""Writes the homepage carousel from the shared project list.

index.html is hand-written, so the nine tiles under "Finished work, after
dark" were a second copy of names that also live in projects.py. Renaming
the portfolio page left the homepage saying "Specimen Palm Uplighting" and
"Parking Deck Retrofit", and the client found it by reading the two pages
next to each other. A second copy that has already drifted once will drift
again, so the names come from one place now and this rewrites the block.

The ORDER below stays here rather than in projects.py: which nine of the ten
photographs open the homepage, and in what sequence, is an editorial choice
about the homepage. Only the naming is shared. A slug that is not in
projects.REAL, or whose photograph is not on disk, is skipped rather than
rendering a broken tile.

Same approach as licences.py: locate the block by its own markup and replace
between the markers, so nothing else in the page is touched.
"""
import io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from projects import REAL

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
IMG = os.path.join(SITE, "assets/img")

ORDER = ["walls", "pool", "lot", "palm", "planting",
         "hedge", "deck", "highbay", "interior"]

# Alt text describes the photograph for a screen reader; the visible title
# sits right beside it, so this says what is in the frame instead of
# repeating the name.
ALT = {
    "walls":    "Sculptural garden wall panels lit from the grass at night",
    "pool":     "A pool, hedge and covered terrace lit at night",
    "lot":      "An office building and its parking lot after dark, from the air",
    "palm":     "A mature date palm lit from its base at night",
    "planting": "A planting bed and palms lit at night",
    "hedge":    "A hedge line along a lawn, lit just after sunset",
    "deck":     "The drive lane of a parking garage, lit",
    "highbay":  "High-bay pendants over an open commercial floor",
    "interior": "Pendants over a kitchen island, lit at night",
}

TILE = u"""        <article class="carou-item">
          <a class="tile" href="portfolio.html">
            <img src="assets/img/%s.jpg" alt="%s" loading="lazy">
          </a>
          <div class="carou-body"><span class="k">%s</span><h3>%s</h3></div>
        </article>"""


def main():
    by_slug = {r[0]: r for r in REAL}
    tiles = []
    for slug in ORDER:
        row = by_slug.get(slug)
        if not row or not os.path.exists(os.path.join(IMG, slug + ".jpg")):
            print("  ! skipped, no such project or photograph: %s" % slug)
            continue
        _, _, kind, title, _ = row
        tiles.append(TILE % (slug, ALT.get(slug, title.replace("&amp;", "and")),
                             kind, title))

    path = os.path.join(SITE, "index.html")
    s = io.open(path, encoding="utf-8").read()
    new = ('<div class="carou-track">\n' + "\n".join(tiles) + "\n      </div>")
    s2, n = re.subn(r'<div class="carou-track">.*?</div>\s*(?=<div class="carou-ui">)',
                    lambda m: new + "\n      ", s, flags=re.S)
    if n != 1:
        raise SystemExit("carousel: expected 1 track, found %d" % n)
    io.open(path, "w", encoding="utf-8").write(s2)
    print("index.html: %d carousel tile(s) written" % len(tiles))


if __name__ == "__main__":
    main()
