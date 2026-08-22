# Generated imagery — what it is, where it goes, how to add more

The client's decision, taken knowingly: the new visual material is generated
rather than photographed.

## The one rule this follows

Generated work sits under its own heading — **Lighting studies** — below the
photographed portfolio, never mixed into it. That is not a disclaimer.
Renderings are ordinary practice in lighting and architectural work; what is
not ordinary is presenting one as a finished job at a named property. Keeping
them apart means a prospect can always tell which is which, and nobody can ask
"whose house is that?" and get silence.

The word "Concept" is not used anywhere — it was removed at the client's
instruction and has not come back.

## What has been generated

Eight images, `nano_banana_2` at 2k, 4:3 (2400x1792), 16 credits total.

Each pair is made in two passes: the unlit frame first, then the lit frame
generated **from that image as a reference** with an instruction not to move
the camera or change anything built or planted. Two separate text prompts
would produce two different houses, which is no use to a before/after.

| Pair | Before | After |
| --- | --- | --- |
| Live oak uplighting | luxury residence, midday, no fixtures | same house at night, trunk and canopy lit, facade grazed |
| Palm row and facade | six royal palms down a coral drive, midday | same row at night, one fixture per palm, matched heights |
| Garden path and beds | planted beds and path, midday | same garden at night, in-bed fixtures, palms backlit |
| Buildout | bare retail shell, studs and open ceiling | same space finished and lit |

## Where they go

| File | Slot |
| --- | --- |
| `study-oak-day.jpg` / `study-oak-night.jpg` | Lighting studies, portfolio |
| `study-palms-day.jpg` / `study-palms-night.jpg` | Lighting studies, portfolio |
| `study-garden-day.jpg` / `study-garden-night.jpg` | Lighting studies, portfolio |
| the buildout pair | not yet placed — belongs on the commercial page, labelled Shell / Finished |

All at **1100x821**, matching the existing pairs.

`STUDIES` in `tools/portfolio.py` drives the section. Each entry carries a
slug, title, blurb and the two seam labels. **An entry whose images are not on
disk is skipped**, so the list can run ahead of the artwork and the site never
ships a broken figure. Drop the files in, run `python3 tools/build.py`, and
the study appears.

## The seam now takes any number of instances

`site.js` drove a single `#split`. It now drives every `.split` on the page,
each with its own position, sharing one set of pointer handlers rather than
every instance binding its own to the window. Verified with four seams on one
page: dragging any one leaves the other three where they were, and each stays
keyboard-operable.

## Getting generated files into the repo

**This session cannot download them.** The egress proxy refuses the Higgsfield
CDN at CONNECT with a 403, which is an organization policy denial — the README
at `/root/.ccr/README.md` says to report such a host rather than route around
it, so that is what this note does.

The working route is the one already used for the photographs, the drone
footage and the logo artwork: download from Higgsfield, upload into the
conversation. Files land in `/root/.claude/uploads/` and can be placed from
there. A zip of the set is one step instead of eight.

**Or skip the hand-carry entirely.** `tools/fetch-generated.py` reads
`docs/production/generated-manifest.json`, downloads every entry, centre-crops
to the target aspect, resizes and writes the JPEG straight into
`site/assets/img/`. It is idempotent and safe to re-run.

    python3 tools/fetch-generated.py --check    # is this session able to fetch?
    python3 tools/fetch-generated.py            # do it
    python3 tools/build.py

The catch is *where the session runs*, not what it is. A session on
claude.ai/code runs in a container behind the egress proxy and `--check` will
say BLOCKED. The same command from a session on your own machine — the Claude
Code CLI in this repo, or Cowork — uses your network and simply works. Nothing
about the script changes between the two.

## Adding another study

1. Generate the unlit frame.
2. Generate the lit frame **with the first as a reference image**, instructing
   no camera movement and no change to anything built or planted.
3. Resize both to 1100x821 and name them `study-<slug>-day.jpg` and
   `study-<slug>-night.jpg`.
4. Add a row to `STUDIES` in `tools/portfolio.py`.
5. `python3 tools/build.py`.

The prompts that produced the current set are recorded in the Higgsfield job
history and are worth reusing — the "do not move the camera, change only the
lighting" clause is what holds the pair in register.

## Ground-up study — five stages of one building

Generated after the pairs, and the strongest of the set because it ends on the
lighting: the last frame is the part of a job that normally belongs to a
different company, which is the argument the whole site is making.

The five stages were **all generated from the finished building as the
reference**, not chained one to the next. Chaining drifts — by the fifth
generation it is a different building. Anchoring every stage to one frame
keeps the footprint, the roofline, the horizon and the neighbouring context
in place across all five.

| Stage | File | What it shows |
| --- | --- | --- |
| 01 Foundation | `stage-site.jpg` | slab, footings, stub-ups, safety fence |
| 02 Structure | `stage-shell.jpg` | walls to height, bond beam, joists, open holes |
| 03 Dried in | `stage-dryin.jpg` | roof on, glazing in, asphalt down, no finishes |
| 04 Finished | `stage-finished.jpg` | finish coat, canopy clad, kerbs, bays, planting |
| 05 Switched on | `stage-night.jpg` | the same view at night, lit |

`STAGES` and `groundup_html()` in `tools/pages.py` drive it, on the commercial
page. The whole section is skipped unless **all five** are on disk — a
part-built sequence is worse than none. Five across on a wide screen; a
snapping horizontal strip under 900px, where five stacked would bury the last
one, which is the one that matters.

## The drone orbit

Seedance 2.5 takes a `start_image` and an `end_image`, so the shot is anchored
at both ends rather than described and hoped for: the aerial slab at one end,
an aerial night frame at the other. The model has to get from one to the
other, so the camera comes round and the building rises across one take.

**The first pass read as AI and the reason was specific.** It put up solid
walls and then subtracted the windows and doors from them. No building is ever
built that way, and the eye catches it without being able to name it. Every
prompt since says how a tilt-up building actually goes up — panels cast flat
on the slab with their openings already formed, craned upright and braced, so
an opening exists from the moment the wall does — and forbids the failure
outright. The structure stage goes in as a reference image because it *shows*
walls standing with the openings still open, which is a state worth showing
rather than describing.

A full 360 needs its end frame matched to the start frame's camera, or the
circle does not close where it opened.

| Take | Length | Notes |
| --- | --- | --- |
| `buildfly-src.mp4` | 20s | full 360, the keeper |
| `buildfly-quarter.mp4` | 15s | quarter turn, same fix, comparison only |

## Cutting a take into the scrub

    python3 tools/fetch-generated.py     # brings the mp4 down (raw, unresized)
    python3 tools/scrub-frames.py site/assets/img/buildfly-src.mp4 buildfly
    python3 tools/build.py

`scrub-frames.py` writes `f001.jpg…` at 960x540 — the size the engine already
uses — plus an H.264 and a VP9 fallback and a poster. `groundup_html()` counts
the folder itself, so `data-frames` needs no editing.

**The section upgrades itself.** With fewer than 20 frames on disk it stays the
five-card static strip; with the frames present it becomes the scroll-scrubbed
orbit, carrying the same five stage labels as its step list. Nothing to switch
by hand, and no way to ship a half-built version.

`filmScrub()` drove a single `#scrub` by id. It now drives every `.scrub` on
the page, each with its own frame array, loader and scene. Verified with both
scrubs live on the commercial page: four distinct frames across four scroll
positions on each, independently, no errors. The preview bundler was injecting
frames into the first scrub only, and now does each.

## Still outstanding

- The buildout pair needs placing on the commercial page.
- A drone arc or 360 orbit of a finished property, and a ground-up
  construction time-lapse, are both still wanted and neither is generated yet.
- Licence numbers. Unchanged, and still the thing that blocks launch.
