# -*- coding: utf-8 -*-
import io, re, glob, os

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

pat = re.compile(r'<svg class="kroom".*?</svg>', re.S)
for f in sorted(glob.glob("/home/user/booksprint/site/*.html")):
    s = io.open(f, encoding="utf-8").read()
    if 'class="kroom"' not in s: continue
    s2 = pat.sub(lambda m: SVG, s, count=1)
    io.open(f, "w", encoding="utf-8").write(s2)
    print("kroom replaced in", os.path.basename(f))
