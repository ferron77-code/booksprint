# Brand — what was supplied, what was traced, what is still needed

## What the client supplied

Three rounds. The last one is what the site runs on.

| Round | File | What it is |
| --- | --- | --- |
| 1 | `supplied-original.png`, 1536x585 | both lockups on one canvas, screen-grab resolution |
| 2 | `lockup-elighting-master.png`, 2089x547 | the eLighting lockup on its own, with alpha |
| 2 | `lockup-ebuilt-master.png`, 2116x634 | the eBuilt lockup on its own, with alpha |
| 3 | `sting.mp4` / `.webm` | a 6s logo animation, 1280x720, built on black |

The artwork is **chrome with navy outlines and a blue drop shadow** — not flat
white, which is what the first low-resolution file suggested. That matters:
the dark outlines carry the letterforms on a light background and the chrome
carries them on a dark one, so **one set of artwork reads on both surfaces**.
It was measured on the day surface and the night surface before being placed;
no ink variant is needed and the one that was made has been deleted.

The alpha channels are clean throughout — 44-58% fully transparent, 35-44%
fully opaque, the rest an antialiased edge.

## The brand colour

Sampled from the flat, unshaded areas — the SOLUTIONS wordmark and the eBuilt
roof:

    #003FD6

The sphere is a gradient running roughly #002088 -> #0060F6 and was left out
of the measurement.

## What is on the site, and where it came from

**The marks** are traced from the artwork, not redrawn. The blue of each mark
was isolated by colour and the shell by luminance, each mask cleaned and
vectorised with potrace, then centred in a 100x100 viewBox.
`tools/trace-logo.py` regenerates them from `supplied-original.png`.

**The lockups** are the client's own artwork, resized. No tracing, no redraw.

| File | Where it is used |
| --- | --- |
| `mark-e.svg` | the monogram — inline in the site header, and in the Supply panel |
| `mark-elighting.svg`, `mark-ebuilt.svg` | reusable copies of the two marks; the site itself now leads with the full lockups instead |
| `favicon.svg` | monogram on the dark ground |
| `lockup-elighting.png`, `lockup-ebuilt.png` | 180px tall, PNG8/192, ~28KB each — the eLighting and eBuilt division panels |
| `lockup-*-master.png` | full-resolution originals, for print and anything larger |
| `img/sting.mp4`, `.webm`, `sting-poster.jpg` | the logo animation, on the homepage |

The 180px files are quantised to 192 colours. At the 52px they display, that
is a 3.5x downsample and the quantisation is not visible; it takes them from
140KB to 28KB.

The marks stay **inline** in the header so the shell takes `currentColor` and
the monogram takes `var(--brand)` — both follow the clock. The lockups cannot,
being raster, which is why they only sit where the artwork works on both
surfaces.

### The shape of the e

Worth knowing, because it is easy to get wrong: their **e** is not a disc with
a letter knocked out of it. It is a single spiral — the counter opens into the
aperture at the lower right, and the crossbar is thick and angled, running out
to the sphere's edge. Filling it as if it had an enclosed counter produces the
wrong shape.

### The logo animation

Six seconds: the bulb fades up, the wordmark wipes in behind a light sweep,
then the glow settles. Motion is finished by about 4.5s, so it is trimmed
there and holds on its last frame.

It sits in a black band above the closing block on the homepage only — not in
the shared chrome, and not on a page where it would be the second video
competing for attention. It runs **once**, the first time it scrolls into
view; replaying it on every pass would turn a brand moment into a tic. Under
reduced motion, or with no JavaScript, the poster is the whole of it.

Two things were needed to make it sit on the page rather than in a box:

- The source's black ground is a flat 8/255, not true black, so the video's
  rectangle showed an edge. `colorlevels` crushes anything below 0.055 to
  zero at encode time, and the band is `#000`, so `mix-blend-mode: screen`
  makes the video's ground exactly the band's.
- Crushing the blacks cost VP9 a lot of its efficiency (250KB -> 696KB), so a
  light `hqdn3d` pass goes in ahead of it. Final weights: 132KB H.264,
  257KB VP9, 40KB poster. MP4 is listed first, so nearly every browser only
  fetches the 132KB.

Regenerate with:

    ffmpeg -i <source> -t 4.6 -map 0:0 -an \
      -vf "crop=1280:624:0:0,colorlevels=rimin=0.055:gimin=0.055:bimin=0.055,\
           hqdn3d=3:2:6:6,scale=900:-2" \
      -c:v libx264 -crf 30 -preset slow -movflags +faststart sting.mp4

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
   marks are traced and so are resolution-independent, but they are traces of
   a raster and carry a fraction of a pixel of softening real curves would
   not. The wordmark type is **not** vectorised at all — the lockups on the
   page are images, which is why they cannot follow the clock and why they
   need a fixed pixel height.
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
