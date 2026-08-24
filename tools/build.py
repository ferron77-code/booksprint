#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rebuild the interior pages of site/ from the shared chrome.

    python3 tools/build.py

The site is plain static HTML and needs no build step to run — this exists
only so the repeated header, time rail and footer stay identical across
pages when copy changes. index.html is hand-written and is not regenerated.

Adding project photography: drop matching <slug>-day.jpg and <slug>-night.jpg
into site/assets/img/, add a row to PROJECTS in portfolio.py, re-run this.
"""
import os, subprocess, sys

# Python invalidates a .pyc by comparing mtime in WHOLE SECONDS. Edit a
# generator and rebuild inside the same second — ordinary when a script does
# both — and the stale bytecode still looks current, so the build quietly
# emits the previous values. That is how a licence number that had been
# changed went on carrying its old value through several rebuilds here.
sys.dont_write_bytecode = True
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"

HERE = os.path.dirname(os.path.abspath(__file__))
STEPS = [
    ("pages.py",     "commercial, residential"),
    ("pages2.py",    "property managers"),
    ("pages3.py",    "contact"),
    ("page404.py",   "404"),
    ("portfolio.py", "portfolio"),
    ("kroom.py",     "colour-temperature illustration"),
    ("licences.py",  "licence numbers into index.html"),
    ("sitemap.py",   "robots.txt and sitemap.xml"),
    ("assetver.py",  "cache-bust the stylesheet and scripts"),
    ("check.py",     "validate"),
]

fail = 0
for script, what in STEPS:
    r = subprocess.run([sys.executable, os.path.join(HERE, script)],
                       capture_output=True, text=True)
    if r.returncode:
        fail += 1
        print("FAILED  %-14s %s" % (script, what))
        print(r.stdout + r.stderr)
    else:
        tail = [l for l in r.stdout.strip().split("\n") if l.strip()]
        print("ok      %-14s %s" % (script, what))
        if script == "check.py":
            for l in tail[-9:]:
                print("        " + l)

sys.exit(1 if fail else 0)
