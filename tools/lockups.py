# -*- coding: utf-8 -*-
"""Builds the eLighting and eBuilt lockups from the artwork the company
supplied, at the size the divisions panels actually draw them.

Two variants come out of each source file. The day one is the artwork as
delivered: mid grey lettering with the brand blue. That grey is #636363,
which sits at roughly 2.9:1 on the night surface (#181D23) and goes muddy
the moment the clock passes dusk, so a night variant lifts the neutrals and
opens the blue up. Both are stacked in the panel and cross-faded on --glow,
the same property the night photographs already ride on, so the marks turn
over with the rest of the page instead of snapping.

Sources live outside the repo (supplied 2026-08-26) and are copied into
site/assets/brand/src/ on the first run so a rebuild does not depend on
them still being on this machine.
"""
import os, shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, "..", "site", "assets", "brand")
SRC  = os.path.join(OUT, "src")

# Display height is 52px; 4x gives a clean backing store on a retina panel.
H = 208

# Night targets. NGT.mu2 for the lettering, NGT.br for the blue, both taken
# straight from the palette in site.js so the marks match the page ink.
N_NEUTRAL = (0xC3, 0xC8, 0xCE)
N_BLUE    = (0x6C, 0x9B, 0xFF)

JOBS = [
    ("e-lighting_logo (1) [Recovered]-03.png", "lockup-elighting"),
    ("Logo B-01 (3).png",                      "lockup-ebuilt"),
]


def trim(im):
    """Crop to the ink. The delivered files carry a lot of empty canvas —
    eBuilt is square with the mark floating in the middle of it — and the
    panels line the lockups up on their cap height, so any padding left in
    the file shows as one mark sitting lower than its neighbour."""
    a = im.split()[3]
    box = a.getbbox()
    return im.crop(box) if box else im


def night(im):
    """Recolour for the dark surface.

    Anti-aliased edges carry the same hue as the body they belong to, so the
    blue/neutral split is made on saturation and applied at full alpha; the
    alpha channel is passed through untouched and does the blending.
    """
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            if mx - mn > 40:
                # Coloured: pull most of the way to the night blue, keeping
                # enough of the original shading that the mark is not flat.
                t = 0.62
                px[x, y] = (int(r + (N_BLUE[0] - r) * t),
                            int(g + (N_BLUE[1] - g) * t),
                            int(b + (N_BLUE[2] - b) * t), a)
            else:
                # Neutral: lift toward the light ink. White stays white, the
                # body grey lands on #C3C8CE, and the ordering of the two is
                # preserved so the drop shadows inside the artwork survive.
                t = mx / 255.0
                nr = N_NEUTRAL[0] + (255 - N_NEUTRAL[0]) * t
                ng = N_NEUTRAL[1] + (255 - N_NEUTRAL[1]) * t
                nb = N_NEUTRAL[2] + (255 - N_NEUTRAL[2]) * t
                px[x, y] = (int(nr), int(ng), int(nb), a)
    return im


def scale(im):
    w = max(1, int(round(im.width * H / float(im.height))))
    return im.resize((w, H), Image.LANCZOS)


def main():
    os.makedirs(SRC, exist_ok=True)
    for name, stem in JOBS:
        kept = os.path.join(SRC, name)
        if not os.path.exists(kept):
            for cand in ("/tmp/req", os.path.join(HERE, "..", "artwork")):
                p = os.path.join(cand, name)
                if os.path.exists(p):
                    shutil.copy2(p, kept)
                    break
        if not os.path.exists(kept):
            print("  ! artwork missing, keeping existing lockup: %s" % name)
            continue

        art = scale(trim(Image.open(kept).convert("RGBA")))
        day = os.path.join(OUT, stem + ".png")
        ngt = os.path.join(OUT, stem + "-night.png")
        art.save(day, optimize=True)
        night(art.copy()).save(ngt, optimize=True)
        print("  %s  %dx%d  day+night" % (stem, art.width, art.height))


if __name__ == "__main__":
    main()
