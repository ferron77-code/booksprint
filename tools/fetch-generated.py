#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pull the generated imagery into the site and put it in the right shape.

    python3 tools/fetch-generated.py           # fetch what is missing
    python3 tools/fetch-generated.py --force   # re-fetch everything
    python3 tools/fetch-generated.py --check   # reachability only, no writes

Reads docs/production/generated-manifest.json — a list of
{url, as, w, h, note} — downloads each, centre-crops to the target aspect,
resizes and writes a JPEG into site/assets/img/. Idempotent: a file already
on disk is left alone unless --force.

WHERE THIS RUNS MATTERS. A Claude session on claude.ai/code runs in a
container whose egress goes through a policy-enforcing proxy, and that proxy
refuses the Higgsfield CDN with a 403 at CONNECT. Run this from a session on
your own machine — the Claude Code CLI in this repo, or Cowork — and it uses
your network, where the CDN resolves normally. --check tells you which one
you are in before you wait on a download.

After a successful run: python3 tools/build.py
"""
import io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(ROOT, "site", "assets", "img")
MAN  = os.path.join(ROOT, "docs", "production", "generated-manifest.json")


def fit(im, w, h):
    """Centre-crop to the target aspect, then resize. Never squashes."""
    from PIL import Image
    sw, sh = im.size
    want, have = w / float(h), sw / float(sh)
    if have > want:                      # too wide: trim the sides
        new = int(round(sh * want))
        left = (sw - new) // 2
        im = im.crop((left, 0, left + new, sh))
    elif have < want:                    # too tall: trim top and bottom
        new = int(round(sw / want))
        top = (sh - new) // 2
        im = im.crop((0, top, sw, top + new))
    return im.convert("RGB").resize((w, h), Image.LANCZOS)


def get(url, timeout=60):
    try:
        from urllib.request import urlopen
    except ImportError:                  # python 2, just in case
        from urllib2 import urlopen
    return urlopen(url, timeout=timeout).read()


def main(argv):
    force = "--force" in argv
    check = "--check" in argv
    items = json.load(io.open(MAN, encoding="utf-8"))

    if check:
        host = items[0]["url"].split("/")[2]
        sys.stdout.write("reaching %s ... " % host)
        sys.stdout.flush()
        try:
            get(items[0]["url"], timeout=15)
            print("ok — this session can fetch; run without --check")
        except Exception as e:
            print("BLOCKED (%s)" % e)
            print("  A 403 here is the egress policy on a claude.ai/code sandbox,")
            print("  not a broken link. Run this from a session on your own machine.")
            return 1
        return 0

    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        print("Pillow is needed:  pip install pillow")
        return 1

    done = skipped = failed = 0
    for it in items:
        dest = os.path.join(OUT, it["as"])
        if os.path.exists(dest) and not force:
            print("  skip   %-26s already here" % it["as"])
            skipped += 1
            continue
        try:
            raw = get(it["url"])
        except Exception as e:
            print("  FAIL   %-26s %s" % (it["as"], e))
            failed += 1
            continue
        from PIL import Image
        im = Image.open(io.BytesIO(raw))
        src = im.size
        fit(im, it["w"], it["h"]).save(dest, "JPEG", quality=86, optimize=True)
        print("  wrote  %-26s %sx%s -> %dx%d  %6.1f KB  (%s)"
              % (it["as"], src[0], src[1], it["w"], it["h"],
                 os.path.getsize(dest) / 1024.0, it.get("note", "")))
        done += 1

    print("\n%d written, %d already present, %d failed" % (done, skipped, failed))
    if failed:
        return 1
    if done:
        print("Now run:  python3 tools/build.py")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
