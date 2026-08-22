# Brand — what was supplied, what was traced, what is still needed

## What the client supplied

One PNG, 1536 x 585, carrying two lockups:

| Lockup | Mark | Wordmark | Strapline |
| --- | --- | --- | --- |
| eLighting | bulb enclosing a blue sphere cut as a lowercase **e** | LIGHTING | WE HAVE **SOLUTIONS** |
| eBuilt | location pin enclosing the same sphere | BUILT, roof over the I and L | COMMERCIAL AND RESIDENTIAL |

**The alpha channel is clean** — 70% fully transparent, 23% fully opaque, the
rest a 2-3px antialiased edge, and the letter strokes are solid at 252-254.
An earlier note in this file called it a bad key with black speckle; that was
wrong. The speckle was the transparent region being shown against black. It
is a proper cutout and it is good enough to work from directly.

## The brand colour

Sampled from the flat, unshaded areas — the SOLUTIONS wordmark and the eBuilt
roof:

    #003FD6

The sphere is a gradient running roughly #002088 -> #0060F6 and was left out
of the measurement.

## What is on the site, and where it came from

Every mark on the site is **traced from the supplied artwork**, not redrawn.
The blue region of each mark was isolated by colour, the white shell by
luminance, each mask cleaned and vectorised with potrace, and the result
centred in a 100x100 viewBox. `tools/../scratchpad/trace.py` did the work; the
paths are checked in below.

| File | What it is |
| --- | --- |
| `site/assets/brand/mark-e.svg` | the monogram alone — the blue **e**, traced off the eBuilt sphere, which is the least occluded of the two |
| `site/assets/brand/mark-elighting.svg` | bulb shell + monogram |
| `site/assets/brand/mark-ebuilt.svg` | pin shell + monogram |
| `site/assets/favicon.svg` | monogram on the dark ground |
| `site/assets/brand/lockup-{eLighting,eBuilt}-light.png` | the full lockup with wordmark and strapline, white artwork, for dark grounds |
| `site/assets/brand/lockup-{eLighting,eBuilt}-ink.png` | the same, remapped to dark ink with the blue preserved and the bevel intact, for light grounds |

The header and the division panels carry the traced paths **inline**, so the
shell takes `currentColor` and the monogram takes `var(--brand)` — both follow
the clock instead of sitting at one fixed value. The standalone SVGs in
`assets/brand/` are the reusable copies; nothing on the site links to them.

### The shape of the e

Worth knowing, because it is easy to get wrong: their **e** is not a disc with
a letter knocked out of it. It is a single spiral — the counter opens into the
aperture at the lower right, and the crossbar is thick and angled, running out
to the sphere's edge. Filling it with any even-odd rule as if it had an
enclosed counter produces the wrong shape.

### The full lockups are not placed on the site

The wordmark type is white with a bevel and an outer glow. It reads on a dark
ground and disappears on a light one, and the site is light by day. The ink
variant solves that, but swapping a raster between the two as the clock turns
would be worse than what is there now: the inline SVG marks are sharp at any
size and already follow the palette. So the lockups are shipped as assets and
left for a fixed-dark placement — a social preview image is the obvious one,
and the site currently has no `og:image` at all.

## How blue and amber divide the site

The site already ran on a tungsten amber that is the colour of light itself —
the fixture glow, the before/after seam, the scrub and relight scenes, the sun
on the time rail. Replacing it wholesale would have taken the lit-at-night
idea out with it. So the two colours were given jobs:

- **Blue `--brand` — the company speaking.** Logo, navigation, buttons, form
  focus and required-field marks, portfolio filters, eyebrows, project
  metadata labels, the "our own crew" badges, focus rings.
- **Amber `--accent` — light in the picture.** Fixture glow, the split-state
  seam, the drone scrub and relight scenes, the colour-temperature demo, the
  sun on the time rail, the accent word in the hero headline.

Both are driven from `setTime()` in `site.js` on the same curve as the rest of
the palette. Blue measures 7.23:1 on the day surface and 6.72:1 on the night
surface. The select-menu chevron is a data URI and cannot read a variable, so
`site.js` rewrites `--chev` alongside the other tokens.

## Naming

Their own mark sets the names **eLighting** and **eBuilt** — lowercase e, no
hyphen. The site had been writing E-Lighting and E-Built. Corrected
throughout, and those names now opt out of the uppercase their surrounding
labels use, via `.cased`.

The third division, Supply, has no supplied lockup. Its panel carries the
monogram alone rather than an invented mark.

## Still needed from the client

1. **The original vector artwork** (`.ai`, `.eps`, or a clean `.svg`). The
   traces are faithful and resolution-independent, but they are traces of a
   1536px raster: the outlines carry a fraction of a pixel of softening that
   real curves would not have, and the wordmark type has not been vectorised
   at all — it is still raster.
2. **Confirmation of the parent lockup.** The supplied file shows the two
   division marks. Whether Worldwide Distributors has a mark of its own, or
   whether the wordmark is the whole of it, is unanswered — the header
   currently pairs the monogram with the Worldwide Distributors wordmark.
3. **The exact brand blue,** if they hold a spec. `#003FD6` is measured off a
   compressed raster; a brand sheet would beat a sample.
4. **The wordmark typeface,** if they know it. It is a heavy rounded geometric
   sans; without the name, the type can only be used as an image.

## Known, unrelated

For roughly sixteen minutes a day, around 7:00-7:16 PM, the whole palette
crosses between its day and night values and everything on the page — body
copy included — passes through low contrast. Body text drops to about 2.7:1 in
that window; amber to 1.33:1; blue to 1.71:1. This predates the brand work and
is a property of the dusk curve in `surfaceAt()`, not of the blue. Narrowing
`smooth(18.6, 19.7, hr)` to something like `smooth(19.0, 19.35, hr)` would cut
the window to a few minutes, at the cost of a more abrupt dusk. Not changed
here, because the slow dusk is a deliberate part of the design.
