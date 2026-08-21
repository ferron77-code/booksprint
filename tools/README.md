# Site tooling

The site in `../site/` is plain static HTML — it needs no build step and can be
uploaded as-is. These scripts exist only so the repeated chrome (head, header,
time rail, footer) stays identical across pages when copy changes.

| script | what it does |
|---|---|
| `chrome.py` | shared `<head>`, header, time rail, footer, and the closing CTA block |
| `pages_common.py` | the interior-page hero helper |
| `pages.py` | writes `commercial.html`, `residential.html` |
| `pages2.py` | writes `property-managers.html`, `projects.html` |
| `pages3.py` | writes `contact.html` |
| `page404.py` | writes `404.html` |
| `kroom.py` | swaps the colour-temperature room illustration into every page that has one |
| `check.py` | validates markup nesting, resolves every local `src`/`href`, checks for duplicate ids |
| `artifact.py` | bundles the whole site into one self-contained HTML file for review |

`index.html` is hand-written, not generated. If you change the header or footer
in `chrome.py`, apply the same change to `index.html`.

Run order after a copy change:

```sh
python3 tools/pages.py && python3 tools/pages2.py && python3 tools/pages3.py \
  && python3 tools/page404.py && python3 tools/kroom.py && python3 tools/check.py
```

Paths inside the scripts are absolute; adjust if the repo moves.
