# Photography provenance

Source: 14 images pulled from worldwidedistributorsinc.com on 2026-08-21,
supplied as `original-photo-manifest.csv` (native dimensions, byte sizes,
SHA-256, original URLs).

## In use — the company's own work

Seven images, all shot at night. These are almost certainly their own
photographer's: sequential `DSC01xxx-HDR` filenames from one session, plus one
phone shot. They carry the site.

| site file | source | used for |
|---|---|---|
| `hero-wide.jpg` | `03_DSC01443-HDR.jpg` | homepage hero |
| `walls.jpg` / `scene-walls.jpg` | `01_DSC01438-HDR.jpg` | portfolio, homepage carousel, portfolio case study |
| `palm.jpg` | `02_DSC01423-HDR.jpg` | portfolio, homepage carousel |
| ~~`garden.jpg`~~ | `06_DSC01433-HDR.jpg` | **removed** — see below |
| `hedge.jpg` | `05_DSC01373-HDR.jpg` | portfolio, property-managers hero |
| `pool.jpg` | `04_IMG_7266.jpeg` | portfolio, homepage tile |
| `interior.jpg` | `08_DSC01213-HDR-Edit.jpg` | portfolio |

## Second batch (18-image manifest)

Four more images, all served from the same site host.

| site file | source | used for |
|---|---|---|
| `lot.jpg` / `scene-lot.jpg` | `15_PARKING_LOT_DOWNLOADED.jpeg` | portfolio; the property-managers relight scene |
| `deck.jpg` | `16_garage_DOWNLOAD.jpeg` | portfolio |
| `deck-wide.jpg` | `17_garage_light_yw.jpeg` | available, not yet placed |
| `planting.jpg` | `18_untitled_81_of_301_.jpg` | portfolio |

`18_untitled (81 of 301).jpg` is frame 81 of a 301-frame shoot, so it belongs
to the same professional session as the DSC set. Treat it as their own.

## One property, three photographs

`01`, `02` and `06` are all the same estate garden: the same white sculptural
panels on the same lawn, shot from three angles. Run as three portfolio
entries they read as padding — the client spotted two of them side by side and
said so.

- `06` (`garden.jpg`) was **`01` from a step back** and is removed from the
  site entirely, along with `scene-garden.jpg` derived from it.
- `01` and `02` stay, because the compositions genuinely differ, but they are
  now labelled **Estate Garden · Wall Grazing** and **Estate Garden ·
  Specimen Trees**, and the second one's copy opens "The same garden, looking
  the other way." One job, two techniques, stated plainly.

Worth checking the rest of any future batch the same way: adjacent tiles that
share a background read as repetition even when the subject differs.

## Provenance — confirmed

**All parking and garage photographs are the company's own work**, confirmed by
the client 2026-08-22.

`15_PARKING_LOT_DOWNLOADED`, `16_garage_DOWNLOAD` and `17_garage_light_yw`
carry "DOWNLOAD" in their filenames, which normally suggests an image pulled
from a manufacturer or stock library. In this case it does not — the owners
confirmed these are their installs. Recorded here because the filenames will
raise the same question for the next person who looks.

One left open: `07_HIGHBAY.jpeg`, in use on the Commercial page and in the
portfolio. Its filename also sits outside the DSC set and it was not part of
the confirmation above, so it is worth a separate word with the owners.


## Not used

| source | why |
|---|---|
| `12_shutterstock_698609293-800x430.jpg` | Shutterstock stock. The licence belongs to whoever bought it and may not cover a new site. Also only 800x430 — too small. |
| `14_10-Specializations-Comm-Electricians.jpeg` | Stock photograph of an electrician at a panel, the kind that ships with a blog template. |
| `13_thumbnail_WS-W92313.jpg` | Manufacturer catalogue shot of a WAC Lighting wall sconce. Fine on a product page, wrong as portfolio work. |
| `11_blob-8a99f3b.png` | Marketing graphic with a "SMART HOME" phone UI burned into it. |
| `09_blob-f2ae67c.png`, `10_blob-731a700.png` | Staged interiors that read as manufacturer lifestyle shots, not their installs. |

## How the two sets sit together

The renderings are additive, not replaced. Every page that existed before the
photographs arrived is unchanged: the hero cross-fade, the drag-the-seam
slider on four pages, the three concept tiles on the homepage, and both
relight scenes all run on the same images they always did.

The photographs appear where they add rather than displace:

| where | what |
|---|---|
| homepage, "Finished work, after dark" | a new section, three photographed projects |
| portfolio grid | seven photographed entries, ahead of the four badged Concept |
| portfolio case studies | all three run on photographs |

One rule learned the hard way: the relight scenes carry copy about the
specific property they show — a parking deck's overlapping pools, an estate's
fixtures coming on one at a time. Swapping the photograph without rewriting
the copy leaves the page describing a deck while showing a garden. If a scene
image changes, its copy changes with it.

The owners have reviewed the renderings and confirmed they represent the kind
of work the company does. They stay until real photography replaces them,
badged throughout.

## The drone footage

`Elighting_Drone_Video_3_720p.mp4` — 74.4s, 1280x720, from
https://vimeo.com/915644789/c823512cee

A flight over a finished residential project at dusk. It now drives the
homepage scroll-scrub, which replaced the generated corridor clip there.

Only part of it is usable, for two reasons a scrub is fussy about:

- **Cuts.** There are three, at 8.7s, 11.6s and 18.5s. A cut looks broken when
  the viewer scrolls backward through it, so the segment has to be continuous.
- **Exposure.** After roughly 48s the drone is high enough that mean luminance
  drops below 30 and the frames read as black.

**The segment in use is 19s to 48s** — continuous, well exposed, and the best
part of the flight: out of the courtyard, along the pool, up over the roof to
a top-down of the whole lit property. 87 frames at 860px, 2.4MB, with a 960px
clip as the mobile and reduced-motion fallback.

**The opening approach is now the homepage hero.** 0.6s to 8.5s, stopping short
of the first cut: a slow pull-back from the lit entry out to the whole facade
against a dusk sky. Silent, looping, and paused whenever it scrolls off screen.

It ships as both `hero-fly.mp4` (H.264, 916KB) and `hero-fly.webm` (VP9, 508KB),
mp4 listed first so every mainstream browser takes it. The webm exists because
Chromium builds without proprietary codecs cannot play H.264 at all — including
the one used to test this site, which is how the gap was found. Under
`prefers-reduced-motion` neither plays and `hero-still.jpg` carries the hero
on its own.

With the hero now being real footage, the "Concept imagery" label that sat on
it has been removed. The other five page heroes are still renderings and keep
theirs.

Roughly 26 seconds of the flight remain unused — the stretch after 48s, where
the drone is too high for the frames to read.

## Gaps

Parking is now covered by photography. Still carrying renderings: commercial
buildouts, medical fit-outs and retail. See `shot-list.html` for what to shoot.

## Portfolio grid: which tiles are generated

The grid mixes ten photographs of the company's own work with five generated
day/night pairs. Until 2026-08-24 nothing on the page said which was which —
the provenance lived only in this file. For a licensed contractor bidding
commercial work that is one question away from an awkward answer, so every
generated tile now carries a small **Visualisation** credit in its body. The
photographs carry nothing, which is the point: the unlabelled ones are the
real jobs.

Generated tiles, all `CONCEPT` rows in `tools/portfolio.py`:

| tile | images | note |
|---|---|---|
| Medical Office Fit-Out | `medical-day/night.jpg` | |
| Two-Storey Commercial Shell | `groundup-day/night.jpg` | added 2026-08-24 |
| Estate Uplighting | `estate-day/night.jpg` | |
| Parking Structure Retrofit | `garage-day/night.jpg` | |
| Court & Grounds Lighting | `court-day/night.jpg` | |

`groundup-day.jpg` and `groundup-night.jpg` are copies of `stage-finished.jpg`
and `stage-night.jpg` — the final two frames of the ground-up sequence on the
Commercial page, so the portfolio tile and the drone orbit are the same
building. That is deliberate: it reads as one project seen twice rather than
two unrelated visualisations.

The Buildouts filter had exactly one entry before this and left two empty
columns of grid background beside it. Two things fixed it: this second tile,
and inert filler cells that finish any short last row.
