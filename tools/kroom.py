# -*- coding: utf-8 -*-
"""Writes the color-temperature demonstration into every page that uses it.

Two pages carry it: the homepage and residential. Both are separate copies
of the same markup, so this owns the illustration AND the control beneath
it — not the SVG alone, which is what it used to do.

That gap was a live bug. The slider moved to four fixed stops (2700, 3000,
4000, 5000K) and the input started carrying an index 0-3 instead of a kelvin
value. The homepage markup was updated by hand; residential still had
min="2700" max="5000", so every value it produced clamped to the last stop.
The reading sat on 5000K, the room stayed daylight-blue, and dragging the
handle did nothing at all — reported from the live site as "I'm not able to
get the lights to change when I move the toggle bar".

The control markup and site.js have to agree about what the input means.
Keeping one copy is the only way to be sure they do.
"""
import io, re, glob, os

# The four temperatures fixtures are actually sold at. The input carries the
# index, so the handle lands on a stop by construction and the arrow keys
# step between them; site.js maps index -> kelvin, name and use case.
KCTL = u'''<div class="kctl">
        <div class="krow">
          <span class="kval" id="kVal">3000K</span>
          <span class="kname" id="kName">Warm White</span>
        </div>
        <input type="range" id="kSlide" min="0" max="3" step="1" value="1"
               aria-label="Color temperature" list="kStops">
        <datalist id="kStops"><option value="0"></option><option value="1"></option><option value="2"></option><option value="3"></option></datalist>
        <ol class="kstops" aria-hidden="true"><li>2700K</li><li>3000K</li><li>4000K</li><li>5000K</li></ol>
        <p class="kuse" id="kUse"></p>
      </div>'''


SVG = u'''<svg class="kroom" viewBox="0 0 800 520" role="img" aria-label="Illustrated interior lit at the selected color temperature">
        <defs>
          <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="var(--k,#FFD6A8)" stop-opacity=".78"/>
            <stop offset="70%"  stop-color="var(--k,#FFD6A8)" stop-opacity=".16"/>
            <stop offset="100%" stop-color="var(--k,#FFD6A8)" stop-opacity="0"/>
          </linearGradient>
          <radialGradient id="pool" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stop-color="var(--k,#FFD6A8)" stop-opacity=".55"/>
            <stop offset="100%" stop-color="var(--k,#FFD6A8)" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="var(--k,#FFD6A8)" stop-opacity=".30"/>
            <stop offset="100%" stop-color="var(--k,#FFD6A8)" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <!-- shell -->
        <rect width="800" height="520" fill="#0B0E13"/>
        <rect x="0" y="70" width="800" height="286" fill="#141922"/>
        <path d="M0 356 L800 356 L800 520 L0 520 Z" fill="#1A1F28"/>
        <!-- perspective floor lines -->
        <path d="M232 520 L330 356 M420 520 L400 356 M608 520 L470 356" stroke="#232935" stroke-width="2" fill="none"/>
        <rect x="0" y="352" width="800" height="4" fill="#0B0E13"/>

        <!-- ceiling plane + fixtures -->
        <rect x="0" y="0" width="800" height="70" fill="#0E1219"/>
        <rect x="0" y="66" width="800" height="4" fill="#232935"/>
        <rect x="176" y="56" width="72" height="10" rx="2" fill="var(--k,#FFD6A8)"/>
        <rect x="552" y="56" width="72" height="10" rx="2" fill="var(--k,#FFD6A8)"/>

        <!-- light cones -->
        <path d="M176 66 L248 66 L340 400 L84 400 Z"  fill="url(#cone)"/>
        <path d="M552 66 L624 66 L716 400 L460 400 Z" fill="url(#cone)"/>

        <!-- pools on the floor -->
        <ellipse cx="212" cy="404" rx="150" ry="34" fill="url(#pool)"/>
        <ellipse cx="588" cy="404" rx="150" ry="34" fill="url(#pool)"/>

        <!-- back wall: recess + shelf wash -->
        <rect x="352" y="120" width="96" height="232" fill="#0E1219"/>
        <rect x="352" y="120" width="96" height="8" fill="var(--k,#FFD6A8)" opacity=".8"/>
        <rect x="352" y="128" width="96" height="120" fill="url(#wash)"/>

        <!-- counter, left -->
        <rect x="92" y="286" width="196" height="10" fill="var(--k,#FFD6A8)" opacity=".65"/>
        <rect x="92" y="296" width="196" height="60" fill="#1E2430"/>

        <!-- seating, right -->
        <rect x="512" y="300" width="150" height="8" fill="var(--k,#FFD6A8)" opacity=".55"/>
        <rect x="512" y="308" width="150" height="48" fill="#1E2430"/>
        <rect x="512" y="252" width="12" height="56" fill="#1E2430"/>
        <rect x="650" y="252" width="12" height="56" fill="#1E2430"/>

        <!-- floor bounce -->
        <rect x="0" y="356" width="800" height="3" fill="var(--k,#FFD6A8)" opacity=".28"/>
      </svg>'''

def main():
    svg_pat  = re.compile(r'<svg class="kroom".*?</svg>', re.S)
    ctl_pat  = re.compile(r'<div class="kctl">.*?</div>\s*\n\s*</div>', re.S)

    for f in sorted(glob.glob("/home/user/booksprint/site/*.html")):
        s = io.open(f, encoding="utf-8").read()
        if 'class="kroom"' not in s:
            continue
        s2, n_svg = svg_pat.subn(lambda m: SVG, s, count=1)
        # The control's own closing tag is followed by the wrapper's, which is
        # what the pattern anchors on — .kctl holds nested divs, so a lazy match
        # to the first </div> would stop inside .krow.
        s2, n_ctl = ctl_pat.subn(lambda m: KCTL + "\n    </div>", s2, count=1)
        if n_svg != 1 or n_ctl != 1:
            raise SystemExit("kroom: %s has %d illustration(s) and %d control(s), "
                             "expected 1 of each" % (os.path.basename(f), n_svg, n_ctl))
        io.open(f, "w", encoding="utf-8").write(s2)
        print("kroom + control replaced in", os.path.basename(f))


if __name__ == "__main__":
    main()
