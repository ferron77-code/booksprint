/**
 * Downloads the book as a real PDF.
 *
 * Page size: 6 × 9 inches (most popular trade book size)
 *   - At 96 dpi: 576 × 864 px
 *   - In jsPDF pt: 432 × 648 pt
 *
 * Strategy:
 * 1. Page 1: cover image full-bleed 6×9.
 * 2. Pages 2+: body content in a fixed-width container rendered as one tall
 *    canvas, then tiled across pages.
 *
 * Key fix: the rendered canvas is ALWAYS clipped to exactly PG_W_PX * scale
 * wide before slicing. Prevents the dark right-side bar artifact.
 */
export async function downloadBookAsPdf(bookId: string, title: string, marginIn = 1, marginTBIn = 1): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  // Fetch HTML
  const res = await fetch(`/api/edit/${bookId}/download?format=pdf`);
  if (!res.ok) throw new Error("Could not fetch book content");
  const fullHtml = await res.text();

  // Extract styles + body — strip body/cover/max-width rules that would override our layout
  const styleMatch = fullHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? [];
  const rawStyles = styleMatch.map(s => s.replace(/<\/?style[^>]*>/gi, "")).join("\n");
  // Remove entire rule blocks for body, .cover, .cover img — they fight our margin params
  const styles = rawStyles
    .replace(/\bbody\s*\{[^}]*\}/gi, "")          // body padding/max-width overrides our margins
    .replace(/\.cover\s*img\s*\{[^}]*\}/gi, "")   // cover img max-width:400px kills full-bleed
    .replace(/\.cover\s*\{[^}]*\}/gi, "");         // cover div margin/alignment
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : fullHtml;

  // 6×9 inch page at 96 dpi
  const PG_W_PX  = 576;   // 6 in × 96
  const PG_H_PX  = 864;   // 9 in × 96
  const SCALE    = 2;     // retina render
  const CANVAS_W = PG_W_PX * SCALE;  // 1152px — hard clip target

  // Margins: LR from marginIn, top/bottom from marginTBIn (inches → px at 96dpi)
  const MARGIN    = Math.round(marginIn   * 96);
  const MARGIN_TB = Math.round(marginTBIn * 96);

  /* ── STEP 1: extract cover src ───────────────────────────────────────── */
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, "text/html");
  const coverImg = doc.querySelector(".cover img") as HTMLImageElement | null;
  const coverSrc = coverImg?.getAttribute("src") ?? null;

  /* ── STEP 2: render body (no cover div) ──────────────────────────────── */
  const contentDoc = parser.parseFromString(bodyContent, "text/html");
  contentDoc.querySelector(".cover")?.remove();
  const bodyWithoutCover = contentDoc.body.innerHTML;

  // Outer clip wrapper — overflow:hidden prevents right-side bleed
  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position:absolute",
    "left:-99999px",
    "top:0",
    `width:${PG_W_PX}px`,
    "overflow:hidden",
    "background:white",
  ].join(";");

  const container = document.createElement("div");
  container.style.cssText = [
    `width:${PG_W_PX}px`,
    "box-sizing:border-box",
    `padding:${MARGIN_TB}px ${MARGIN}px`,
    "background:white",
    "font-family:Georgia,serif",
    "font-size:13px",
    "line-height:1.75",
    "color:#1a1a1a",
    "word-break:break-word",
    "overflow-wrap:break-word",
    "overflow:hidden",
  ].join(";");

  container.innerHTML = `<style>
    * { box-sizing: border-box !important; }
    body, div, section, article, blockquote {
      max-width: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    img { max-width: 100% !important; height: auto !important; display: block; }
    h1 { font-size: 1.6em;  font-weight: bold; margin: 1.4em 0 0.5em; line-height: 1.2; }
    h2 { font-size: 1.25em; font-weight: bold; margin: 1.3em 0 0.4em; line-height: 1.25; }
    h3 { font-size: 1.05em; font-weight: bold; margin: 1.1em 0 0.35em; }
    p  { margin: 0 0 0.8em; }
    ul, ol { padding-left: 1.4em; margin: 0.5em 0 0.8em; }
    li { margin: 0.2em 0; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
    blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin: 1em 0; color: #555; font-style: italic; }
    ${styles}
  </style>${bodyWithoutCover}`;

  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  await Promise.all(
    Array.from(container.querySelectorAll("img")).map(img =>
      img.complete ? Promise.resolve()
        : new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); })
    )
  );
  await new Promise(r => setTimeout(r, 300));

  const rawCanvas = await html2canvas(container, {
    scale: SCALE,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    width: PG_W_PX,
    windowWidth: PG_W_PX,
    x: 0,
    scrollX: 0,
    scrollY: 0,
  });

  // Collect safe cut positions BEFORE removing from DOM (needs layout)
  // Also collect forced page-break positions from div.page-break nodes
  const blockEls = Array.from(
    container.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, hr, blockquote")
  );
  const forceBreakEls = Array.from(container.querySelectorAll("div.page-break"));
  const containerTop = container.getBoundingClientRect().top + window.scrollY;

  const safeCuts: number[] = blockEls.map(el => {
    const r = el.getBoundingClientRect();
    return (r.bottom + window.scrollY - containerTop) * SCALE;
  }).filter(y => y > 0).sort((a, b) => a - b);

  // Forced breaks — top of the page-break element = start of new page
  const forcedBreaks: Set<number> = new Set(
    forceBreakEls.map(el => {
      const r = el.getBoundingClientRect();
      return Math.round((r.top + window.scrollY - containerTop) * SCALE);
    }).filter(y => y > 0)
  );

  document.body.removeChild(wrapper);

  /* ── STEP 3: hard-clip canvas to exactly CANVAS_W ────────────────────── */
  let canvas = rawCanvas;
  if (rawCanvas.width !== CANVAS_W) {
    const clipped = document.createElement("canvas");
    clipped.width  = CANVAS_W;
    clipped.height = rawCanvas.height;
    const ctx2 = clipped.getContext("2d")!;
    ctx2.fillStyle = "#ffffff";
    ctx2.fillRect(0, 0, CANVAS_W, rawCanvas.height);
    ctx2.drawImage(rawCanvas, 0, 0, CANVAS_W, rawCanvas.height, 0, 0, CANVAS_W, rawCanvas.height);
    canvas = clipped;
  }

  /* ── STEP 4: build PDF at 6×9 inches ─────────────────────────────────── */
  // 6 in = 432pt, 9 in = 648pt
  const pdf = new jsPDF({ unit: "pt", format: [432, 648] });
  const PAGE_W_PT = pdf.internal.pageSize.getWidth();   // 432
  const PAGE_H_PT = pdf.internal.pageSize.getHeight();  // 648

  // ── Page 1: Cover full-bleed ──
  if (coverSrc && coverSrc.startsWith("data:")) {
    const coverImage = new Image();
    coverImage.src = coverSrc;
    await new Promise<void>(r => {
      if (coverImage.complete) r();
      else { coverImage.onload = () => r(); coverImage.onerror = () => r(); }
    });

    const coverCanvas = document.createElement("canvas");
    coverCanvas.width  = CANVAS_W;
    coverCanvas.height = PG_H_PX * SCALE;
    const ctx = coverCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, coverCanvas.width, coverCanvas.height);

    // object-fit: cover — fill page, center crop
    const imgAspect  = coverImage.naturalWidth / coverImage.naturalHeight;
    const pageAspect = coverCanvas.width / coverCanvas.height;
    let drawW = coverCanvas.width, drawH = coverCanvas.height, drawX = 0, drawY = 0;
    if (imgAspect > pageAspect) {
      drawH = coverCanvas.height;
      drawW = drawH * imgAspect;
      drawX = (coverCanvas.width - drawW) / 2;
    } else {
      drawW = coverCanvas.width;
      drawH = drawW / imgAspect;
      drawY = (coverCanvas.height - drawH) / 2;
    }
    ctx.drawImage(coverImage, drawX, drawY, drawW, drawH);

    const coverJpeg = coverCanvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(coverJpeg, "JPEG", 0, 0, PAGE_W_PT, PAGE_H_PT);
  }

  // ── Pages 2+: tiled content, snapping cuts to safe gaps ──
  const canvasW = canvas.width;
  const canvasH = canvas.height;

  const scaleFactor     = PAGE_W_PT / canvasW;
  const canvasPxPerPage = PAGE_H_PT / scaleFactor; // canvas px that fit one PDF page

  // Walk pages, snapping cuts to safe gaps or forced breaks
  const slices: { srcY: number; srcH: number }[] = [];
  let cursor = 0;
  while (cursor < canvasH) {
    // Check if there's a forced break between cursor and the next hard limit
    const hardLimit = cursor + canvasPxPerPage;
    const nextForced = [...forcedBreaks]
      .filter(y => y > cursor && y <= hardLimit)
      .sort((a, b) => a - b)[0];

    if (nextForced !== undefined) {
      // Forced break takes priority — cut right here
      slices.push({ srcY: cursor, srcH: nextForced - cursor });
      cursor = nextForced;
      continue;
    }

    if (hardLimit >= canvasH) {
      slices.push({ srcY: cursor, srcH: canvasH - cursor });
      break;
    }

    // Snap to nearest safe (paragraph boundary) cut near the hard limit
    const slack = canvasPxPerPage * 0.03;
    const best = safeCuts
      .filter(y => y > cursor && y <= hardLimit + slack)
      .pop();

    const cutAt = best ?? hardLimit;
    slices.push({ srcY: cursor, srcH: cutAt - cursor });
    cursor = cutAt;
  }

  for (const { srcY, srcH } of slices) {
    pdf.addPage();

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width  = canvasW;
    pageCanvas.height = Math.ceil(srcH);
    const ctx = pageCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, srcY, canvasW, srcH, 0, 0, canvasW, srcH);

    const imgData     = pageCanvas.toDataURL("image/jpeg", 0.92);
    const imgHeightPt = srcH * scaleFactor;
    pdf.addImage(imgData, "JPEG", 0, 0, PAGE_W_PT, imgHeightPt);
  }

  pdf.save(`${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`);
}
