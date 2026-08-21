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
    var n = +wrap.dataset.frames, base = wrap.dataset.base;
    var imgs = new Array(n), loaded = 0, ready = false, cur = -1;
    var bar = wrap.querySelector(".scrub-bar i");
    var steps = [].slice.call(wrap.querySelectorAll(".scrub-steps li"));

    function src(i) { return base + "f" + String(i + 1).padStart(3, "0") + ".jpg"; }

    function draw(i) {
      var im = imgs[i];
      if (!im || !im.complete || !im.naturalWidth) return;
      var cw = cv.width, ch = cv.height;
      var sc = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      var w = im.naturalWidth * sc, hh = im.naturalHeight * sc;
      ctx.drawImage(im, (cw - w) / 2, (ch - hh) / 2, w, hh);
      cur = i;
    }
    function size() {
      var dpr = Math.min(devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      var i = cur; cur = -1; draw(i < 0 ? 0 : i);
    }

    /* Load frame 0 first so something is on screen immediately, then the
       rest in order. */
    function load(i, cb) {
      var im = new Image();
      im.decoding = "async";
      im.onload = im.onerror = function () { loaded++; if (cb) cb(); };
      im.src = src(i);
      imgs[i] = im;
    }
    load(0, function () { size(); draw(0); wrap.dataset.mode = "canvas"; });
    var i = 1;
    (function next() {
      if (i >= n) { ready = true; return; }
      load(i++, next);
    })();

    addEventListener("resize", size);

    scene(wrap, function (p) {
      var i = Math.round(smooth(p) * (n - 1));
      if (i !== cur) draw(i);
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

  /* ── 3. Pinned sequence ──────────────────────────────────────────────
     Six stages advance one at a time while the section holds the viewport.
     Without JS the same markup reads as a normal stacked list. */
  function sequence() {
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
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.dataset.f;
        btns.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        var n = 0;
        items.forEach(function (it) {
          var hit = k === "all" || (" " + it.dataset.cat + " ").indexOf(" " + k + " ") > -1;
          it.hidden = !hit;
          if (hit) n++;
        });
        if (live) live.textContent = n + (n === 1 ? " project" : " projects");
      });
    });
  }

  filmScrub();
  relight();
  filters();
  sequence();
  parallax();
  counters();
})();
