# Site tooling

The site in `../site/` is plain static HTML. It has **no build step** — you can
edit the files directly and upload them. These scripts exist only so the
repeated chrome (head, header, time rail, footer) stays identical across pages
when copy changes.

## One command

```sh
python3 tools/build.py
```

Regenerates every interior page from the shared chrome and validates the
result. `index.html` is hand-written and is **not** regenerated — if you change
the header or footer in `chrome.py`, make the same change in `index.html`.

## Adding a project to the portfolio

1. Drop `<slug>-day.jpg` and `<slug>-night.jpg` into `site/assets/img/`,
   shot from the same position.
2. Add a row to `PROJECTS` in `portfolio.py`.
3. `python3 tools/build.py`

`portfolio.py` only publishes projects whose two images actually exist, so a
row you have not photographed yet is skipped rather than showing a broken tile.

## The pieces

| file | what it does |
|---|---|
| `build.py` | runs everything below, in order |
| `chrome.py` | shared `<head>`, header, time rail, footer, closing CTA |
| `pages_common.py` | the interior-page hero helper |
| `pages.py` `pages2.py` `pages3.py` `page404.py` | one or two pages each |
| `portfolio.py` | the portfolio grid and case studies |
| `kroom.py` | swaps the colour-temperature illustration into pages that use it |
| `check.py` | markup nesting, local `src`/`href` resolution, cross-page anchors, duplicate ids |
| `linkcheck.py` | full link audit: every href, anchor, tel, mailto, and which pages are reachable |
| `artifact.py` | bundles the whole site into one file for review; not needed to publish |
