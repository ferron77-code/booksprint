/* ==========================================================================
   Worldwide Distributors — site runtime
   One value drives the whole palette: the time of day.
   Everything else here is progressive enhancement; the site reads fine
   with JavaScript off.
   ========================================================================== */
(function () {
  "use strict";

  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  /* Reveal animations only hide content once we know we can show it again.
     With JavaScript off, .rv never gets hidden in the first place. */
  root.className += (root.className ? " " : "") + "js";

  /* ── palette keyframes ───────────────────────────────────────────────
     Sky drifts slowly; surfaces flip fast around dusk so body copy never
     sits at low contrast during the crossover. */
  var STOPS = [
    { h: 0,    t: "#05070B", b: "#0A0F17" },
    { h: 4.5,  t: "#05070B", b: "#0C121C" },
    { h: 6.2,  t: "#1D2C48", b: "#B2673F" },
    { h: 7.5,  t: "#5C8CC6", b: "#CFE0F0" },
    { h: 12,   t: "#4F8FD6", b: "#DCEBF7" },
    { h: 16.5, t: "#5B92CE", b: "#E8DCC4" },
    { h: 18.4, t: "#33507E", b: "#E9A85C" },
    { h: 19.3, t: "#182741", b: "#C0693C" },
    { h: 20.1, t: "#0B1220", b: "#2C3856" },
    { h: 21.2, t: "#06080D", b: "#0D1219" },
    { h: 24,   t: "#05070B", b: "#0A0F17" }
  ];
  /* mu2 is the muted ink for body copy that sits on a photograph rather than
     on a flat surface. It has to follow the clock like everything else: a
     hardcoded dark grey would be invisible on the night palette. */
  var DAY = { s: "#F4F6F8", s2: "#E9EDF1", tx: "#10151B", mu: "#5B6672", mu2: "#3C444E", ln: "#D8DEE5", ac: "#B9741A", ai: "#FFF6E8", br: "#003FD6", bi: "#FFFFFF" };
  var NGT = { s: "#12161B", s2: "#181D23", tx: "#F0EDE7", mu: "#8E9299", mu2: "#C3C8CE", ln: "#262C34", ac: "#F2C879", ai: "#14100A", br: "#6C9BFF", bi: "#071026" };

  function hx(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix(a, b, t) {
    var A = hx(a), B = hx(b);
    return "#" + [0, 1, 2].map(function (i) {
      var v = Math.round(A[i] + (B[i] - A[i]) * t);
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      return (v < 16 ? "0" : "") + v.toString(16);
    }).join("");
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

  function skyAt(hr) {
    var i = 0;
    while (i < STOPS.length - 2 && hr >= STOPS[i + 1].h) i++;
    var a = STOPS[i], b = STOPS[i + 1], t = clamp((hr - a.h) / (b.h - a.h), 0, 1);
    return { t: mix(a.t, b.t, t), b: mix(a.b, b.b, t) };
  }
  function darkAt(hr) {
    return clamp(Math.max(smooth(18.0, 20.4, hr), 1 - smooth(5.9, 7.6, hr)), 0, 1);
  }
  function surfaceAt(hr) {
    return clamp(Math.max(smooth(18.6, 19.7, hr), 1 - smooth(6.1, 7.0, hr)), 0, 1);
  }

  var applied = -999;
  function setTime(hr, force) {
    if (!force && Math.abs(hr - applied) < 0.0015) return;
    applied = hr;
    var s = skyAt(hr), d = darkAt(hr), m = surfaceAt(hr);

    root.style.setProperty("--sky-top", s.t);
    root.style.setProperty("--sky-bot", s.b);
    root.style.setProperty("--glow", d.toFixed(3));
    root.style.setProperty("--surface",   mix(DAY.s,  NGT.s,  m));
    root.style.setProperty("--surface-2", mix(DAY.s2, NGT.s2, m));
    root.style.setProperty("--text",      mix(DAY.tx, NGT.tx, m));
    root.style.setProperty("--text-mute", mix(DAY.mu, NGT.mu, m));
    root.style.setProperty("--text-mute-strong", mix(DAY.mu2, NGT.mu2, m));
    root.style.setProperty("--line",      mix(DAY.ln, NGT.ln, m));
    root.style.setProperty("--accent",    mix(DAY.ac, NGT.ac, m));
    root.style.setProperty("--accent-ink",mix(DAY.ai, NGT.ai, m));
    /* The brand blue is #003FD6 on paper. It has to lift off the dark
       surface at night or the mark goes muddy, so it rides the same
       surface curve the rest of the palette does. */
    root.style.setProperty("--brand",    mix(DAY.br, NGT.br, m));
    root.style.setProperty("--brand-ink",mix(DAY.bi, NGT.bi, m));
    root.style.setProperty("--chev", "url(\"data:image/svg+xml;charset=utf-8,"
      + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E"
      + "%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23"
      + mix(DAY.br, NGT.br, m).slice(1) + "' stroke-width='1.6'/%3E%3C/svg%3E\")");

    var hh = Math.floor(hr), mm = Math.floor((hr - hh) * 60);
    var ap = hh < 12 ? "AM" : "PM", h12 = hh % 12 || 12;
    var label = h12 + ":" + (mm < 10 ? "0" : "") + mm + " " + ap;

    var state, doing;
    if (d < 0.15)      { state = "Daylight";     doing = 'Right now, we\'re <span>building it</span>.'; }
    else if (d < 0.62) { state = "Golden hour";  doing = 'Right now, we\'re <span>switching it on</span>.'; }
    else if (d < 0.92) { state = "Dusk";         doing = 'Right now, we\'re <span>dialling it in</span>.'; }
    else               { state = "After dark";   doing = 'Right now, we\'re <span>lighting it</span>.'; }

    each(".js-clock", function (el) { el.textContent = label; });
    each(".js-state", function (el) { el.textContent = state; });
    var dz = document.querySelector(".js-doing");
    if (dz && dz.dataset.s !== state) { dz.dataset.s = state; dz.innerHTML = doing; }

    if (track) {
      track.setAttribute("aria-valuenow", Math.round(hr * 60));
      track.setAttribute("aria-valuetext", label + ", " + state);
      knobTo(hr);
    }
  }

  function each(sel, fn) { [].slice.call(document.querySelectorAll(sel)).forEach(fn); }

  /* ── time rail ─────────────────────────────────────────────────────── */
  var track = document.getElementById("track"),
      knob  = document.getElementById("knob"),
      grad  = document.getElementById("grad"),
      liveB = document.getElementById("live");

  function knobTo(hr) { if (knob) knob.style.top = (hr / 24 * 100) + "%"; }
  function buildGrad() {
    if (!grad) return;
    var parts = [];
    for (var i = 0; i <= 24; i++) parts.push(skyAt(i).b + " " + (i / 24 * 100).toFixed(1) + "%");
    grad.style.background = "linear-gradient(180deg," + parts.join(",") + ")";
  }

  function nowHour() { var n = new Date(); return n.getHours() + n.getMinutes() / 60 + n.getSeconds() / 3600; }

  var target = nowHour(), current = target, live = true, dragging = false;

  function setLive(on) {
    live = on;
    if (!liveB) return;
    liveB.dataset.on = on ? "1" : "0";
    liveB.setAttribute("aria-pressed", String(on));
    liveB.textContent = on ? "Live" : "Now";
    if (on) target = nowHour();
  }
  if (liveB) liveB.addEventListener("click", function () { setLive(!live); });

  if (track) {
    var fromPt = function (ev) {
      var r = track.getBoundingClientRect();
      var pt = ev.touches ? ev.touches[0] : ev;
      target = clamp((pt.clientY - r.top) / r.height, 0, 0.99999) * 24;
      setLive(false);
    };
    track.addEventListener("mousedown", function (e) { dragging = true; fromPt(e); e.preventDefault(); });
    addEventListener("mousemove", function (e) { if (dragging) fromPt(e); });
    addEventListener("mouseup", function () { dragging = false; });
    track.addEventListener("touchstart", function (e) { dragging = true; fromPt(e); }, { passive: true });
    addEventListener("touchmove", function (e) { if (dragging) { fromPt(e); if (e.cancelable) e.preventDefault(); } }, { passive: false });
    addEventListener("touchend", function () { dragging = false; });
    track.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 1 : 0.25;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { target = (target + step) % 24; setLive(false); e.preventDefault(); }
      if (e.key === "ArrowUp"   || e.key === "ArrowLeft")  { target = (target - step + 24) % 24; setLive(false); e.preventDefault(); }
      if (e.key === "Home") { target = 12; setLive(false); e.preventDefault(); }
      if (e.key === "End")  { target = 21; setLive(false); e.preventDefault(); }
    });
  }

  function tick() {
    if (live && !dragging) target = nowHour();
    var d = target - current;
    if (Math.abs(d) > 12) d -= Math.sign(d) * 24;
    current = (current + d * (reduce ? 1 : 0.12) + 24) % 24;
    setTime(current);
    requestAnimationFrame(tick);
  }

  /* ── header ────────────────────────────────────────────────────────── */
  var hdr = document.querySelector(".hdr");
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle("stuck", scrollY > 40); };
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
  }

  /* ── reveal ────────────────────────────────────────────────────────── */
  var rv = document.querySelectorAll(".rv");
  if (rv.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    [].slice.call(rv).forEach(function (el) { io.observe(el); });
  }

  /* ── capability spine ──────────────────────────────────────────────── */
  var spine = document.getElementById("spine");
  if (spine) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        [].slice.call(e.target.querySelectorAll(".stage")).forEach(function (s, i) {
          setTimeout(function () { s.classList.add("on"); }, reduce ? 0 : i * 130);
        });
        sio.unobserve(e.target);
      });
    }, { threshold: 0.25 });
    sio.observe(spine);
  }

  /* ── split state ─────────────────────────────────────────────────────
     More than one of these can sit on a page now — the photographed feature
     plus any number of lighting studies under it — so each keeps its own
     position, and one shared set of pointer handlers decides which is being
     dragged rather than every instance binding its own to the window. */
  var splits = [].slice.call(document.querySelectorAll(".split"));
  if (splits.length) {
    var active = null;

    var sFrom = function (el, ev) {
      var r = el.getBoundingClientRect();
      var pt = ev.touches ? ev.touches[0] : ev;
      el.wwdSeam((pt.clientX - r.left) / r.width * 100);
    };

    splits.forEach(function (el) {
      var after = el.querySelector(".after"), seam = el.querySelector(".seam");
      if (!after || !seam) return;
      var pos = 50;
      el.wwdSeam = function (p) {
        pos = clamp(p, 0, 100);
        /* The night layer occupies everything RIGHT of the seam, so the
           labels read left-to-right as as-found then lit. */
        after.style.clipPath = "inset(0 0 0 " + pos + "%)";
        seam.style.left = pos + "%";
        seam.setAttribute("aria-valuenow", Math.round(pos));
      };
      el.wwdSeam(50);
      el.addEventListener("mousedown", function (e) { active = el; sFrom(el, e); e.preventDefault(); });
      el.addEventListener("touchstart", function (e) { active = el; sFrom(el, e); }, { passive: true });
      seam.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft")  { el.wwdSeam(pos - 4); e.preventDefault(); }
        if (e.key === "ArrowRight") { el.wwdSeam(pos + 4); e.preventDefault(); }
      });
    });

    addEventListener("mousemove", function (e) { if (active) sFrom(active, e); });
    addEventListener("mouseup", function () { active = null; });
    addEventListener("touchmove", function (e) {
      if (active) { sFrom(active, e); if (e.cancelable) e.preventDefault(); }
    }, { passive: false });
    addEventListener("touchend", function () { active = null; });
  }

  /* ── film: play only while visible ─────────────────────────────────── */
  var film = document.getElementById("film");
  if (film && !reduce) {
    var fio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) film.play().catch(function () {});
        else film.pause();
      });
    }, { threshold: 0.35 });
    fio.observe(film);
  }

  /* ── colour temperature ──────────────────────────────────────────────
     Four stops rather than a continuous sweep. The slider used to run
     2700–5000K in 100K steps, which let it settle on readings like 3300K
     that nothing is actually sold at; these four are the temperatures
     printed on the box, and the names are the ones on the box too. The
     input carries an index, not a kelvin value, so the thumb lands on a
     stop by construction and the keyboard arrows step between them. */
  /* Named KELVIN, not STOPS: there is already a module-scope STOPS holding
     the sky gradient, and `var` inside this block shares that scope. A
     second `var STOPS` here overwrote it, and skyAt then read `.t` off a
     kelvin row and threw before the clock ever started. */
  var kS = document.getElementById("kSlide");
  if (kS) {
    var kV = document.getElementById("kVal"), kN = document.getElementById("kName"), kU = document.getElementById("kUse");
    var KELVIN = [
      { k: 2700, c: "#FFB25C", n: "Soft White",
        u: "<b>Restaurants, hotels, landscape, residential.</b> Warm light flatters skin, wood and stone, and it reads as hospitality. This is what almost every home exterior should be." },
      { k: 3000, c: "#FFC98A", n: "Warm White",
        u: "<b>Lobbies, offices, retail, medical waiting rooms.</b> Clean without feeling clinical — the safest choice when a space has to feel professional and comfortable at once." },
      { k: 4000, c: "#FFE7CC", n: "Bright White",
        u: "<b>Retail floors, corridors, common areas, garages.</b> Colours read accurately here, which is why it sells merchandise. Push further and a space starts to feel like a workplace." },
      { k: 5000, c: "#DCE7FA", n: "Daylight",
        u: "<b>Warehouses, parking structures, security, task areas.</b> Maximum perceived brightness. Put this on a patio and the patio feels like a loading dock — the most common lighting mistake we see." }
    ];
    var applyK = function () {
      var st = KELVIN[clamp(parseInt(kS.value, 10) || 0, 0, KELVIN.length - 1)];
      root.style.setProperty("--k", st.c);
      kV.textContent = st.k + "K";
      kN.textContent = st.n;
      kU.innerHTML = st.u;
      kS.setAttribute("aria-valuetext", st.k + "K, " + st.n);
    };
    kS.addEventListener("input", applyK);
    applyK();
  }

  /* ── boot ──────────────────────────────────────────────────────────── */
  buildGrad();
  setTime(current, true);
  addEventListener("resize", buildGrad);
  requestAnimationFrame(tick);

  /* ── enquiry attachments ───────────────────────────────────────────────
     Lists what has been picked and totals it, so an over-size batch is
     caught here rather than after a long upload on a phone. The server
     enforces the same limits regardless — this only saves the round trip. */
  (function () {
    var input = document.getElementById("files");
    if (!input) return;
    var out = document.querySelector(".filelist");
    var form = input.form;
    var MAX_FILES = 8, MAX_ONE = 10 * 1024 * 1024, MAX_TOTAL = 20 * 1024 * 1024;

    function kb(n) {
      return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
    }
    function check() {
      var fs = input.files, total = 0, bad = [], rows = [];
      for (var i = 0; i < fs.length; i++) {
        total += fs[i].size;
        var over = fs[i].size > MAX_ONE;
        if (over) bad.push(fs[i].name + " is over 10 MB");
        rows.push('<b>' + fs[i].name.replace(/[<&]/g, "") + "</b> " + kb(fs[i].size));
      }
      if (fs.length > MAX_FILES) bad.push("that is " + fs.length + " files, the limit is " + MAX_FILES);
      if (total > MAX_TOTAL) bad.push("the batch comes to " + kb(total) + ", the limit is 20 MB");
      if (out) {
        out.innerHTML = fs.length
          ? rows.join("<br>") + "<br>" + fs.length + (fs.length === 1 ? " file, " : " files, ") + kb(total)
            + (bad.length ? ' <span class="over">&mdash; ' + bad[0] + "</span>" : "")
          : "";
      }
      return bad.length === 0;
    }
    input.addEventListener("change", check);
    if (form) {
      form.addEventListener("submit", function (e) {
        if (!check()) { e.preventDefault(); if (out) out.scrollIntoView({ block: "center" }); }
      });
    }
  })();

})();
