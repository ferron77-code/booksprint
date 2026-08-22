# Brand — what was supplied, what was drawn, what is still needed

## What the client supplied

One raster image, 1536 × 585, carrying two lockups:

| Lockup | Mark | Wordmark | Strapline |
| --- | --- | --- | --- |
| eLighting | bulb enclosing a blue sphere with a lowercase **e** | LIGHTING | WE HAVE **SOLUTIONS** |
| eBuilt | location pin enclosing the same sphere | BUILT, with a roof over the I and L | COMMERCIAL AND RESIDENTIAL |

The file is a screenshot that has been keyed off a background: the edges carry
black speckle and colour fringing, and there is no transparency channel worth
reusing. It is a reference, not an asset.

## The brand colour

Sampled from the flat areas of the supplied image — the SOLUTIONS wordmark and
the eBuilt roof, both of which are unshaded:

    #003FD6

The sphere itself is a gradient running roughly #002088 → #0060F6, so it was
not used for the measurement.

## What was drawn

Redraws, not the client's files. Every one of these should be replaced the
moment the original vector artwork turns up.

| File | What it is |
| --- | --- |
| `site/assets/brand/mark-e.svg` | the monogram alone — blue disc, **e** knocked out as a real hole so it reads on either surface |
| `site/assets/brand/mark-elighting.svg` | bulb lockup |
| `site/assets/brand/mark-ebuilt.svg` | pin lockup |
| `site/assets/favicon.svg` | monogram on the dark ground |

The header and the division panels carry the same geometry inline, so the
monogram takes `var(--brand)` and follows the clock instead of sitting at one
fixed blue.

## How blue and amber divide the site

The site already ran on a tungsten amber that is the colour of light itself —
it carries the fixture glow, the before/after seam, the scrub and relight
scenes, the sun on the time rail. Replacing it wholesale would have taken the
lit-at-night idea out with it.

So the two colours were given jobs:

- **Blue `--brand` — the company speaking.** Logo, navigation, buttons, form
  focus and the required-field marks, portfolio filters, eyebrows, project
  metadata labels, the "our own crew" badges, focus rings.
- **Amber `--accent` — light in the picture.** Fixture glow, the split-state
  seam, the drone scrub and the relight scenes, the colour-temperature demo,
  the sun on the time rail, the accent word in the hero headline.

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

1. **The original vector artwork** (`.ai`, `.eps` or a clean `.svg`) for both
   lockups. Everything above is a redraw from a screenshot.
2. **Confirmation of the parent lockup.** The supplied file shows the two
   division marks. Whether Worldwide Distributors has a mark of its own, or
   whether the wordmark is the whole of it, is unanswered — the header
   currently pairs the monogram with the Worldwide Distributors wordmark.
3. **The exact brand blue,** if they hold a spec. `#003FD6` is measured off a
   compressed screenshot; a brand sheet would beat a sample.

## Known, unrelated

For roughly sixteen minutes a day, around 7:00–7:16 PM, the whole palette
crosses between its day and night values and everything on the page — body
copy included — passes through low contrast. Body text drops to about 2.7:1 in
that window; amber to 1.33:1; blue to 1.71:1. This predates the brand work and
is a property of the dusk curve in `surfaceAt()`, not of the blue. Narrowing
`smooth(18.6, 19.7, hr)` to something like `smooth(19.0, 19.35, hr)` would cut
the window to a few minutes, at the cost of a more abrupt dusk. Not changed
here, because the slow dusk is a deliberate part of the design.
