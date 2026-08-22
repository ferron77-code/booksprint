/* ==========================================================================
   Worldwide Distributors — scroll scenes

   Progressive enhancement, layered on top of site.js. Every scene here has
   a static fallback: if this file never loads, if the browser is small, or
   if the visitor asked for reduced motion, the page still reads correctly.

   One rAF loop drives every scene, and it only runs while a scene is on
   screen. Scenes report progress as 0..1 across their own scroll range.
   ========================================================================== */
(function () {
  "use strict";

  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var scenes = [];
  var running = false;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  /* Register a scene. `el` is the tall outer section; progress runs 0 at the
     moment its top hits the top of the viewport, 1 when its bottom does. */
  function scene(el, onProgress) {
    if (!el) return;
    var s = { el: el, fn: onProgress, live: false, last: -1 };
    scenes.push(s);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        s.live = e.isIntersecting;
        if (s.live) start();
        /* A jump-scroll (anchor link, restored position, keyboard End) can
           carry a scene out of view before a single frame ran, freezing it
           part-lit. Settle it to its true end state on the way out. */
        else settle(s);
      });
    }, { rootMargin: "120px 0px" });
    io.observe(el);
    return s;
  }

  function settle(s) {
    var r = s.el.getBoundingClientRect();
    var p = r.top > 0 ? 0 : 1;
    if (p !== s.last) { s.last = p; s.fn(p, s.el); }
  }

  function frame() {
    var any = false, h = innerHeight;
    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i];
      if (!s.live) continue;
      any = true;
      var r = s.el.getBoundingClientRect();
      var span = r.height - h;
      var p = span > 0 ? clamp(-r.top / span, 0, 1) : (r.top < h * 0.5 ? 1 : 0);
      if (Math.abs(p - s.last) > 0.0004) { s.last = p; s.fn(p, s.el); }
    }
    running = any;
    if (any) requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; requestAnimationFrame(frame); } }

  /* A scene that is jumped clean over never fires an observer transition, so
     it would sit frozen at its start state. When no scene is on screen, take
     one cheap pass and settle anything the viewport has already passed. */
  var queued = false;
  addEventListener("scroll", function () {
    if (running || queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      for (var i = 0; i < scenes.length; i++) if (!scenes[i].live) settle(scenes[i]);
    });
  }, { passive: true });

  /* ── 1. Film scrub ───────────────────────────────────────────────────
     A canvas plays the buildout clip frame by frame under the scroll
     wheel. Desktop only: below 900px, and under reduced motion, the plain
     <video> already in the markup stays and this never initialises. */
  function filmScrub() {
    var wrap = document.getElementById("scrub");
    if (!wrap) return;
    if (reduce || innerWidth < 900) { wrap.dataset.mode = "video"; return; }

    var cv = wrap.querySelector("canvas"), ctx = cv.getContext("2d", { alpha: false });
    var bar = wrap.querySelector(".scrub-bar i");
    var steps = [].slice.call(wrap.querySelectorAll(".scrub-steps li"));

    /* The bundled single-file preview has no folder to fetch from, so it
       passes the frames in directly as data URIs. */
    var srcs;
    try { srcs = JSON.parse(wrap.dataset.frameSrc || "null"); } catch (e) { srcs = null; }
    var n = srcs ? srcs.length : +wrap.dataset.frames;
    var base = wrap.dataset.base;
    function src(i) { return srcs ? srcs[i] : base + "f" + String(i + 1).padStart(3, "0") + ".jpg"; }

    var imgs = new Array(n), cur = -1;
    function ready(i) { var m = imgs[i]; return m && m.complete && m.naturalWidth; }

    /* Scrolling must never look frozen. If the exact frame has not arrived
       yet, draw the closest one that has — the picture is briefly coarse
       instead of stuck, and sharpens as the rest land. */
    function nearest(i) {
      if (ready(i)) return i;
      for (var d = 1; d < n; d++) {
        if (i - d >= 0 && ready(i - d)) return i - d;
        if (i + d < n && ready(i + d)) return i + d;
      }
      return -1;
    }

    function paint(i) {
      var k = nearest(i);
      if (k < 0 || k === cur) return;
      var im = imgs[k], cw = cv.width, ch = cv.height;
      var sc = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      var w = im.naturalWidth * sc, h = im.naturalHeight * sc;
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
      cur = k;
    }

    var want = 0;
    function size() {
      var dpr = Math.min(devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
      if (!r.width) return;
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      cur = -1; paint(want);
    }

    /* Load coarsely first — every 16th frame, then every 8th, and so on —
       so the whole range is roughly covered within the first moments and
       any scroll position has something near it to show. */
    var order = [], seen = new Array(n);
    for (var step = 16; step >= 1; step = step >> 1) {
      for (var i = 0; i < n; i += step) { if (!seen[i]) { seen[i] = 1; order.push(i); } }
    }

    var next = 0, INFLIGHT = 6;
    function pump() {
      while (next < order.length && INFLIGHT > 0) {
        INFLIGHT--;
        (function (i) {
          var im = new Image();
          im.decoding = "async";
          im.onload = im.onerror = function () {
            INFLIGHT++;
            if (cur < 0) { size(); }
            else if (Math.abs(i - want) < Math.abs(cur - want)) paint(want);
            pump();
          };
          im.src = src(i);
          imgs[i] = im;
        })(order[next++]);
      }
    }
    pump();
    wrap.dataset.mode = "canvas";
    addEventListener("resize", size);

    scene(wrap, function (p) {
      want = Math.round(smooth(p) * (n - 1));
      paint(want);
      if (bar) bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      var k = Math.min(steps.length - 1, Math.floor(p * steps.length));
      for (var j = 0; j < steps.length; j++) steps[j].classList.toggle("on", j <= k);
    });
  }

  /* ── 2. Progressive lighting ─────────────────────────────────────────
     The night photograph is revealed through a soft-edged mask made of one
     radial gradient per fixture. The gradients grow in sequence, so scrolling
     switches the property on a fixture at a time and each pool has a feathered
     edge rather than a hard circle. Reduced motion gets a plain crossfade. */
  function relight() {
    [].slice.call(document.querySelectorAll(".relight")).forEach(function (el) {
      var night = el.querySelector(".rl-night");
      var count = el.querySelector(".rl-count b");
      var pts;
      try { pts = JSON.parse(el.dataset.points); } catch (e) { pts = []; }
      if (!night || !pts.length) return;

      if (reduce) {
        night.style.webkitMaskImage = "none";
        night.style.maskImage = "none";
        night.style.opacity = 0;
        scene(el, function (p) {
          night.style.opacity = p.toFixed(3);
          if (count) count.textContent = Math.round(p * pts.length);
        });
        return;
      }

      var span = 1 / pts.length;   /* each fixture owns a slice of the scroll */
      scene(el, function (p) {
        var lit = 0, layers = [];
        for (var i = 0; i < pts.length; i++) {
          var pt = pts[i];
          var t = smooth(clamp((p - i * span * 0.86) / (span * 1.9), 0, 1));
          if (t > 0.45) lit++;
          var r = (t * pt[2]).toFixed(2);
          layers.push("radial-gradient(ellipse " + r + "% " + r + "% at " +
                      pt[0] + "% " + pt[1] + "%, #000 0%, #000 38%, rgba(0,0,0,0) 100%)");
        }
        var m = layers.join(",");
        night.style.webkitMaskImage = m;
        night.style.maskImage = m;
        if (count) count.textContent = lit;
      });
    });
  }

  /* ── Hero fixture ────────────────────────────────────────────────────
     One object holds the screen while the six stages change around it.
     Drawn entirely in canvas 2D from a small orthographic projection, so
     there is no model to load, no image sequence, and nothing to keep in
     sync with a CDN. It costs about 4KB of code and no network at all.

     The barrel is a cylinder: two circles joined by their tangents. Seen
     orthographically, a circle whose normal is `axis` becomes an ellipse
     with semi-major R across the axis and semi-minor R * |axis.z| along
     it — which is the whole trick to the rotation. */
  function heroFixture() {
    var cv = document.getElementById("fixture");
    if (!cv) return;
    var host = cv.closest(".seq");
    if (!host) return;

    var ctx = cv.getContext("2d");
    var W = 0, H = 0, DPR = 1;

    function size() {
      DPR = Math.min(devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * DPR);
      cv.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    /* read the live palette so the fixture is lit by the same clock as
       everything else on the page */
    function token(n, fallback) {
      var v = getComputedStyle(root).getPropertyValue(n).trim();
      return v || fallback;
    }

    function ellipse(cx, cy, rx, ry, rot) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, .01), Math.max(ry, .01), rot, 0, Math.PI * 2);
    }

    function draw(p) {
      /* the canvas is display:none until sequence() marks the section pinned,
         so the first measurement can land at zero */
      if (!W || !H) { size(); if (!W || !H) return; }
      var accent = token("--accent", "#B9741A");
      var line   = token("--line", "#D8DEE5");
      var mute   = token("--text-mute", "#5B6672");

      ctx.clearRect(0, 0, W, H);

      var S = Math.min(W, H);
      var cx = W * 0.5, cy = H * 0.40;
      var R = S * 0.116;             /* barrel radius */
      var L = S * 0.30;              /* barrel length */

      /* ── orientation ─────────────────────────────────────────────── */
      var yaw = -0.30 + p * Math.PI * 2.15;
      var tilt = 0.60;                             /* aimed downward */
      var ax = Math.sin(yaw) * Math.cos(tilt);
      var ay = Math.sin(tilt);
      var az = Math.cos(yaw) * Math.cos(tilt);

      var pl = Math.hypot(ax, ay) || 1e-4;         /* projected length */
      var ux = ax / pl, uy = ay / pl;              /* unit along axis, screen */
      var px = -uy, py = ux;                       /* perpendicular, screen */
      var squash = Math.abs(az);                   /* ellipse foreshortening */
      var rot = Math.atan2(py, px);

      var half = L * 0.5 * pl;
      var fx = cx + ux * half, fy = cy + uy * half;   /* front (aperture) */
      var bx = cx - ux * half, by = cy - uy * half;   /* back */

      /* ── power and colour ────────────────────────────────────────── */
      var power = smooth(clamp((p - 0.50) / 0.16, 0, 1));
      var warm  = "255,197,122";

      /* Light only reads against dark. On the daylight palette lay a soft
         pool of shade under the object; after dark --glow is already 1 and
         the page has done it for us, so this fades out. */
      var day = 1 - parseFloat(token("--glow", "0"));
      var shade = day * (0.13 + 0.30 * power);
      if (shade > 0.004) {
        /* kept tight around the object: any wider and it greys down the
           body copy in the columns either side */
        var sy = cy + S * 0.14, sr = S * 0.60;
        var sg = ctx.createRadialGradient(cx, sy, 0, cx, sy, sr);
        sg.addColorStop(0,    "rgba(9,11,15," + shade.toFixed(3) + ")");
        sg.addColorStop(0.42, "rgba(9,11,15," + (shade * 0.52).toFixed(3) + ")");
        sg.addColorStop(1,    "rgba(9,11,15,0)");
        ctx.fillStyle = sg;
        ellipse(cx, sy, sr, sr, 0);
        ctx.fill();
      }

      /* ── beam, behind the body ───────────────────────────────────── */
      if (power > 0.01) {
        var reach = S * 0.62;
        var spread = 2.5;
        var tx = fx + ux * reach, ty = fy + uy * reach;
        var fr = R * squash, far = R * spread;

        var g = ctx.createLinearGradient(fx, fy, tx, ty);
        g.addColorStop(0,   "rgba(" + warm + "," + (0.50 * power).toFixed(3) + ")");
        g.addColorStop(0.55,"rgba(" + warm + "," + (0.15 * power).toFixed(3) + ")");
        g.addColorStop(1,   "rgba(" + warm + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(fx + px * fr,  fy + py * fr);
        ctx.lineTo(tx + px * far, ty + py * far);
        ctx.lineTo(tx - px * far, ty - py * far);
        ctx.lineTo(fx - px * fr,  fy - py * fr);
        ctx.closePath();
        ctx.fill();

        /* the pool where the beam lands */
        var pg = ctx.createRadialGradient(tx, ty, 0, tx, ty, far * 1.5);
        pg.addColorStop(0, "rgba(" + warm + "," + (0.34 * power).toFixed(3) + ")");
        pg.addColorStop(1, "rgba(" + warm + ",0)");
        ctx.fillStyle = pg;
        ellipse(tx, ty, far * 1.5, far * 0.52, rot);
        ctx.fill();
      }

      /* ── barrel ──────────────────────────────────────────────────── */
      var body = ctx.createLinearGradient(cx - px * R, cy - py * R, cx + px * R, cy + py * R);
      body.addColorStop(0,    "#0E1218");
      body.addColorStop(0.34, "#2B333F");
      body.addColorStop(0.52, "#333B47");
      body.addColorStop(1,    "#11161C");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(bx + px * R, by + py * R);
      ctx.lineTo(fx + px * R, fy + py * R);
      ctx.lineTo(fx - px * R, fy - py * R);
      ctx.lineTo(bx - px * R, by - py * R);
      ctx.closePath();
      ctx.fill();

      /* back cap */
      ctx.fillStyle = "#0B0E13";
      ellipse(bx, by, R, R * squash, rot);
      ctx.fill();

      /* heat-sink fins, tracking the rotation */
      ctx.strokeStyle = "rgba(0,0,0,.30)";
      ctx.lineWidth = Math.max(1, S * 0.0028);
      for (var i = 1; i <= 3; i++) {
        var t = i / 4;
        var ex = bx + (fx - bx) * t * 0.46, ey = by + (fy - by) * t * 0.46;
        ellipse(ex, ey, R * 1.015, R * 1.015 * squash, rot);
        ctx.stroke();
      }

      /* ── aperture ────────────────────────────────────────────────── */
      var facing = az < 0;   /* the front is turned toward the viewer */
      ctx.fillStyle = "#161B22";
      ellipse(fx, fy, R * 1.1, R * 1.1 * squash, rot);
      ctx.fill();

      if (facing || squash > 0.06) {
        var lens = ctx.createRadialGradient(fx, fy, 0, fx, fy, R);
        var on = power * (facing ? 1 : 0.35);
        lens.addColorStop(0,    "rgba(255,252,244," + (0.99 * on).toFixed(3) + ")");
        lens.addColorStop(0.34, "rgba(255,236,200," + (0.92 * on).toFixed(3) + ")");
        lens.addColorStop(0.72, "rgba(" + warm + "," + (0.55 * on).toFixed(3) + ")");
        lens.addColorStop(1,    "rgba(96,58,14," + (0.22 * on + 0.10).toFixed(3) + ")");
        ctx.fillStyle = lens;
        ellipse(fx, fy, R * 0.84, R * 0.84 * squash, rot);
        ctx.fill();
      }

      /* trim ring */
      ctx.strokeStyle = "rgba(190,200,212,.5)";
      ctx.lineWidth = Math.max(1, S * 0.004);
      ellipse(fx, fy, R * 1.1, R * 1.1 * squash, rot);
      ctx.stroke();

      /* halo once it is on */
      if (power > 0.01) {
        var hg = ctx.createRadialGradient(fx, fy, 0, fx, fy, R * 3.4);
        hg.addColorStop(0, "rgba(" + warm + "," + (0.30 * power).toFixed(3) + ")");
        hg.addColorStop(1, "rgba(" + warm + ",0)");
        ctx.fillStyle = hg;
        ellipse(fx, fy, R * 3.4, R * 3.4, 0);
        ctx.fill();
      }

      /* ── stage 02: the drawing ───────────────────────────────────── */
      var spec = smooth(clamp((p - 0.17) / 0.10, 0, 1)) * (1 - smooth(clamp((p - 0.32) / 0.10, 0, 1)));
      if (spec > 0.01) {
        ctx.save();
        ctx.globalAlpha = spec;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        /* beam angle arc off the aperture */
        var a0 = Math.atan2(uy, ux);
        ctx.beginPath();
        ctx.arc(fx, fy, S * 0.20, a0 - 0.42, a0 + 0.42);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + Math.cos(a0 - 0.42) * S * 0.24, fy + Math.sin(a0 - 0.42) * S * 0.24);
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + Math.cos(a0 + 0.42) * S * 0.24, fy + Math.sin(a0 + 0.42) * S * 0.24);
        ctx.stroke();

        /* overall length dimension */
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(bx - px * R * 1.9, by - py * R * 1.9);
        ctx.lineTo(fx - px * R * 1.9, fy - py * R * 1.9);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = accent;
        ctx.font = "500 10px ui-monospace,Menlo,monospace";
        ctx.textAlign = "center";
        ctx.fillText("48°", fx + Math.cos(a0) * S * 0.235, fy + Math.sin(a0) * S * 0.235);
        ctx.fillText("2700K", bx - px * R * 3.0, by - py * R * 3.0);
        ctx.restore();
      }

      /* ── stage 06: the service tick ──────────────────────────────── */
      var care = smooth(clamp((p - 0.88) / 0.08, 0, 1));
      if (care > 0.01) {
        ctx.save();
        ctx.globalAlpha = care * 0.9;
        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(1, S * 0.003);
        ctx.setLineDash([5, 5]);
        ellipse(fx, fy, R * 1.32, R * 1.32 * Math.max(squash, 0.14), rot);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = accent;
        ctx.font = "500 9.5px ui-monospace,Menlo,monospace";
        ctx.textAlign = "center";
        ctx.fillText("RE-AIM \u00B7 CLEAN", fx, fy + R * 1.32 * Math.max(squash, 0.14) + S * 0.038);
        ctx.restore();
      }
    }

    size();
    addEventListener("resize", function () { size(); draw(host.dataset.p || 0); });
    host.dataset.p = 0;
    draw(0);

    /* redraw on palette change as well as on scroll, so the fixture keeps
       up with the clock while the page is sitting still */
    var lastPaint = "";
    setInterval(function () {
      var k = token("--surface", "") + token("--accent", "");
      if (k !== lastPaint) { lastPaint = k; draw(parseFloat(host.dataset.p) || 0); }
    }, 400);

    return draw;
  }

  /* ── 3. Pinned sequence ──────────────────────────────────────────────
     Six stages advance one at a time while the section holds the viewport.
     Without JS the same markup reads as a normal stacked list. */
  function sequence(paint) {
    [].slice.call(document.querySelectorAll(".seq")).forEach(function (el) {
      var items = [].slice.call(el.querySelectorAll(".seq-item"));
      var index = [].slice.call(el.querySelectorAll(".seq-ix"));
      var bar = el.querySelector(".seq-bar i");
      if (!items.length) return;
      el.classList.add("seq-on");
      scene(el, function (p) {
        var k = clamp(Math.floor(p * items.length), 0, items.length - 1);
        items.forEach(function (it, i) { it.classList.toggle("on", i === k); });
        index.forEach(function (it, i) {
          it.classList.toggle("on", i === k);
          it.classList.toggle("done", i < k);
        });
        if (bar) bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
        el.dataset.p = p;
        if (paint) paint(p);
      });
    });
  }

  /* ── 5. Parallax ─────────────────────────────────────────────────────
     Cheap depth on section imagery. Skipped entirely under reduced motion. */
  function parallax() {
    if (reduce) return;
    [].slice.call(document.querySelectorAll("[data-par]")).forEach(function (el) {
      var amt = parseFloat(el.dataset.par) || 12;
      var host = el.closest(".par-host") || el.parentNode;
      scene(host, function (p) {
        el.style.transform = "translate3d(0," + ((p - 0.5) * amt * 2).toFixed(1) + "%,0)";
      });
    });
  }

  /* ── 6. Counters ─────────────────────────────────────────────────────
     Numbers count up once as they arrive. */
  function counters() {
    var els = [].slice.call(document.querySelectorAll("[data-count]"));
    if (!els.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var to = parseFloat(e.target.dataset.count), t0 = 0;
        if (reduce) { e.target.textContent = to; return; }
        (function step(ts) {
          if (!t0) t0 = ts;
          var p = clamp((ts - t0) / 900, 0, 1);
          e.target.textContent = Math.round(smooth(p) * to);
          if (p < 1) requestAnimationFrame(step);
        })(0);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ── 7. Filters ──────────────────────────────────────────────────────
     Category filtering for the portfolio grid. Every item is visible in the
     markup, so without JS the page is simply an unfiltered grid. */
  function filters() {
    var bar = document.querySelector(".filt");
    if (!bar) return;
    var grid = document.querySelector(bar.dataset.target);
    if (!grid) return;
    var items = [].slice.call(grid.children);
    var btns = [].slice.call(bar.querySelectorAll("button"));
    var live = document.querySelector(".filt-live");

    bar.hidden = false;

    function apply(k, push) {
      var known = false;
      btns.forEach(function (o) {
        var on = o.dataset.f === k;
        o.setAttribute("aria-pressed", String(on));
        if (on) known = true;
      });
      if (!known) return false;
      var n = 0;
      items.forEach(function (it) {
        var hit = k === "all" || (" " + it.dataset.cat + " ").indexOf(" " + k + " ") > -1;
        it.hidden = !hit;
        if (hit) n++;
      });
      if (live) live.textContent = n + (n === 1 ? " project" : " projects");
      if (push && history.replaceState) {
        /* Throws in an opaque-origin document — a sandboxed iframe, or the
           page opened straight off a file:// path. The filter itself has
           already been applied by here, so losing the URL update is the
           whole cost. */
        try { history.replaceState(null, "", k === "all" ? "#grid" : "#" + k); }
        catch (e) {}
      }
      return true;
    }

    /* Links elsewhere point straight at a category — the headline's
       "Lighting." is portfolio.html#lighting — so a hash that names a filter
       applies it on arrival rather than only scrolling past it. */
    function fromHash() {
      var k = location.hash.slice(1);
      if (k && apply(k, false)) {
        var g = document.getElementById("grid");
        if (g) g.scrollIntoView({ block: "start" });
      }
    }

    btns.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.dataset.f, true); });
    });
    addEventListener("hashchange", fromHash);
    fromHash();
  }

  /* ── 8. Background clips ─────────────────────────────────────────────
     Autoplaying background video pauses whenever it scrolls off screen —
     there is no reason to decode frames nobody is looking at — and fades
     in over its own poster once it has something to show. */
  function autoplayClips() {
    var vids = [].slice.call(document.querySelectorAll("video[data-autopause]"));
    if (!vids.length) return;
    if (reduce) { vids.forEach(function (v) { v.pause(); v.removeAttribute("autoplay"); }); return; }

    vids.forEach(function (v) {
      var show = function () { v.classList.add("on"); };
      if (v.readyState >= 2) show(); else v.addEventListener("loadeddata", show, { once: true });
      v.play().catch(function () { /* autoplay refused: the still stands in */ });
    });

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) e.target.play().catch(function () {});
        else e.target.pause();
      });
    }, { threshold: 0.05 });
    vids.forEach(function (v) { io.observe(v); });
  }


  /* ── Logo sting ─────────────────────────────────────────
     Their logo animation runs once, the first time it comes into view, and
     then holds on its last frame. Replaying it on every pass would turn a
     brand moment into a tic. Under reduced motion, or with no JavaScript at
     all, the poster is the whole of it. */
  function sting() {
    var v = document.querySelector("video[data-sting]");
    if (!v || reduce) return;
    var io = new IntersectionObserver(function (es) {
      for (var i = 0; i < es.length; i++) {
        if (!es[i].isIntersecting) continue;
        io.disconnect();
        v.play().catch(function () { /* refused: the poster stands in */ });
        return;
      }
    }, { threshold: 0.4 });
    io.observe(v);
  }

  /* ── 9. Carousel ─────────────────────────────────────────────────────
     Drives the scroll-snapping row from arrows and dots. The row already
     works by swipe or trackpad on its own, so the controls are revealed
     only once this runs — no dead buttons if the script never loads. */
  function carousels() {
    [].slice.call(document.querySelectorAll(".carou")).forEach(function (el) {
      var track = el.querySelector(".carou-track");
      var items = [].slice.call(el.querySelectorAll(".carou-item"));
      var prev = el.querySelector('[data-dir="-1"]');
      var next = el.querySelector('[data-dir="1"]');
      var dots = el.querySelector(".carou-dots");
      var count = el.querySelector(".carou-count");
      if (!track || items.length < 2) return;

      /* how many fit at once, so the last page is not a partial one */
      function perView() {
        var w = items[0].getBoundingClientRect().width + 2;
        return Math.max(1, Math.round(track.clientWidth / w));
      }
      function pages() { return Math.max(1, items.length - perView() + 1); }

      if (dots) {
        items.forEach(function (_, i) {
          var d = document.createElement("button");
          d.type = "button";
          d.className = "carou-dot";
          d.setAttribute("role", "tab");
          d.setAttribute("aria-label", "Go to project " + (i + 1));
          d.addEventListener("click", function () { to(i); });
          dots.appendChild(d);
        });
      }

      function index() {
        var x = track.scrollLeft, w = items[0].getBoundingClientRect().width + 2;
        return clamp(Math.round(x / w), 0, items.length - 1);
      }
      function to(i) {
        i = clamp(i, 0, pages() - 1);
        track.scrollTo({ left: i * (items[0].getBoundingClientRect().width + 2) });
      }
      function sync() {
        var i = index(), last = pages() - 1;
        if (prev) prev.disabled = i <= 0;
        if (next) next.disabled = i >= last;
        if (dots) [].slice.call(dots.children).forEach(function (d, k) {
          d.setAttribute("aria-selected", String(k === i));
          d.hidden = k > last;
        });
        if (count) count.textContent = (i + 1) + " / " + (last + 1);
      }

      if (prev) prev.addEventListener("click", function () { to(index() - 1); });
      if (next) next.addEventListener("click", function () { to(index() + 1); });
      track.addEventListener("scroll", function () {
        clearTimeout(track._t);
        track._t = setTimeout(sync, 90);
      }, { passive: true });
      addEventListener("resize", sync);

      el.classList.add("ready");
      sync();
    });
  }

  carousels();
  autoplayClips();
  sting();
  filmScrub();
  relight();
  filters();
  sequence(heroFixture());
  parallax();
  counters();
})();
