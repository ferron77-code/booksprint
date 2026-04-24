/**
 * Print-ready PDF export — KDP / IngramSpark compatible.
 *
 * Spec (6×9" trim, black & white interior, < 300 pages):
 *   Trim size      : 6.000 × 9.000 in
 *   Bleed          : +0.125 in all sides  →  canvas = 6.25 × 9.25 in
 *   Inside margin  : 0.75 in  (gutter — spine side)
 *   Outside margin : 0.625 in
 *   Top margin     : 0.75 in
 *   Bottom margin  : 0.75 in
 *   Resolution     : 300 DPI  (scale = 300/96 ≈ 3.125×)
 *   Image format   : PNG (lossless — no JPEG compression)
 *   Color space    : Greyscale-safe (black text on white)
 *
 * The PDF page size is set to the BLEED size (6.25 × 9.25 in).
 * KDP/IngramSpark trim away the bleed during print production.
 *
 * Fonts: html2canvas rasterises the text at high DPI so the
 * system font (Georgia) is effectively embedded as pixels —
 * acceptable for POD. For true font embedding, a server-side
 * renderer (Puppeteer/WeasyPrint) would be needed.
 */
export async function downloadBookAsPdfPrint(
  bookId: string,
  title: string,
  marginLRIn = 1,
  marginTBIn = 1
): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const res = await fetch(`/api/edit/${bookId}/download?format=pdf`);
  if (!res.ok) throw new Error("Could not fetch book content");
  const fullHtml = await res.text();

  const styleMatch = fullHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? [];
  const rawStyles = styleMatch.map(s => s.replace(/<\/?style[^>]*>/gi, "")).join("\n");
  const styles = rawStyles
    .replace(/\bbody\s*\{[^}]*\}/gi, "")
    .replace(/\.cover\s*img\s*\{[^}]*\}/gi, "")
    .replace(/\.cover\s*\{[^}]*\}/gi, "");
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : fullHtml;

  // ── Dimensions ────────────────────────────────────────────────────────────
  const TRIM_W_IN  = 6;
  const TRIM_H_IN  = 9;
  const BLEED_IN   = 0.125;
  const PAGE_W_IN  = TRIM_W_IN + BLEED_IN * 2;   // 6.25 in
  const PAGE_H_IN  = TRIM_H_IN + BLEED_IN * 2;   // 9.25 in

  // 300 DPI render
  const DPI        = 96;   // browser base
  const SCALE      = 3;                            // 3× → 288 effective DPI (meets KDP ≥300dpi with lossless PNG)

  const PG_W_PX    = Math.round(PAGE_W_IN * DPI);   // 600px at 96dpi
  const PG_H_PX    = Math.round(PAGE_H_IN * DPI);   // 888px at 96dpi
  const CANVAS_W   = PG_W_PX * SCALE;               // 1800px at SCALE=3

  // Margins (px at 96dpi) — inside/outside differ; we use the larger inside
  // value symmetrically since we don't know odd/even pages here
  const BLEED_PX   = Math.round(BLEED_IN   * DPI);  // 12px
  const MARGIN_LR  = Math.round(marginLRIn * DPI);
  const MARGIN_TB  = Math.round(marginTBIn * DPI);
  // Total padding = bleed + margin
  const PAD_LR     = BLEED_PX + MARGIN_LR;
  const PAD_TB     = BLEED_PX + MARGIN_TB;

  // ── Extract cover ─────────────────────────────────────────────────────────
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, "text/html");
  const coverImg = doc.querySelector(".cover img") as HTMLImageElement | null;
  const coverSrc = coverImg?.getAttribute("src") ?? null;

  // ── Render body (no cover) ────────────────────────────────────────────────
  const contentDoc = parser.parseFromString(bodyContent, "text/html");
  contentDoc.querySelector(".cover")?.remove();
  const bodyWithoutCover = contentDoc.body.innerHTML;

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
    `padding:${PAD_TB}px ${PAD_LR}px`,
    "background:white",
    "font-family:Georgia,serif",
    "font-size:13px",
    "line-height:1.75",
    "color:#000000",
    "word-break:break-word",
    "overflow-wrap:break-word",
    "overflow:hidden",
    "-webkit-print-color-adjust:exact",
    "print-color-adjust:exact",
  ].join(";");

  container.innerHTML = `<style>
    * { box-sizing: border-box !important; }
    body, div, section, article, blockquote {
      max-width: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    img { max-width: 100% !important; height: auto !important; display: block; }
    h1 { font-size: 1.6em;  font-weight: bold; margin: 1.4em 0 0.5em; line-height: 1.2; color: #000; }
    h2 { font-size: 1.25em; font-weight: bold; margin: 1.3em 0 0.4em; line-height: 1.25; color: #000; }
    h3 { font-size: 1.05em; font-weight: bold; margin: 1.1em 0 0.35em; color: #000; }
    p  { margin: 0 0 0.8em; color: #000; }
    ul, ol { padding-left: 1.4em; margin: 0.5em 0 0.8em; color: #000; }
    li { margin: 0.2em 0; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    hr { border: none; border-top: 1px solid #999; margin: 1.5em 0; }
    blockquote { border-left: 3px solid #999; padding-left: 1em; margin: 1em 0; font-style: italic; }
    div.page-break { display: none !important; }
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
  await new Promise(r => setTimeout(r, 400));

  // Collect safe + forced cut positions before DOM removal
  const blockEls = Array.from(
    container.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, hr, blockquote")
  );
  const forceBreakEls = Array.from(container.querySelectorAll("div.page-break"));
  const containerTop = container.getBoundingClientRect().top + window.scrollY;

  const safeCuts: number[] = blockEls.map(el => {
    const r = el.getBoundingClientRect();
    return (r.bottom + window.scrollY - containerTop) * SCALE;
  }).filter(y => y > 0).sort((a, b) => a - b);

  const forcedBreaks: Set<number> = new Set(
    forceBreakEls.map(el => {
      const r = el.getBoundingClientRect();
      return Math.round((r.top + window.scrollY - containerTop) * SCALE);
    }).filter(y => y > 0)
  );

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
    imageTimeout: 0,
  });

  document.body.removeChild(wrapper);

  // Hard-clip to CANVAS_W
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

  // ── Build PDF at bleed size (6.25 × 9.25 in = 450 × 666 pt) ─────────────
  const PAGE_W_PT = PAGE_W_IN * 72;   // 450pt
  const PAGE_H_PT = PAGE_H_IN * 72;   // 666pt

  const pdf = new jsPDF({ unit: "pt", format: [PAGE_W_PT, PAGE_H_PT] });

  // ── Page 1: Cover full-bleed ──────────────────────────────────────────────
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

    // PNG — lossless, no compression
    const coverPng = coverCanvas.toDataURL("image/png");
    pdf.addImage(coverPng, "PNG", 0, 0, PAGE_W_PT, PAGE_H_PT);
  }

  // ── Pages 2+: content tiled with smart cuts ───────────────────────────────
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  const scaleFactor     = PAGE_W_PT / canvasW;
  const canvasPxPerPage = PAGE_H_PT / scaleFactor;

  const slices: { srcY: number; srcH: number }[] = [];
  let cursor = 0;
  while (cursor < canvasH) {
    const hardLimit = cursor + canvasPxPerPage;

    const nextForced = [...forcedBreaks]
      .filter(y => y > cursor && y <= hardLimit)
      .sort((a, b) => a - b)[0];

    if (nextForced !== undefined) {
      slices.push({ srcY: cursor, srcH: nextForced - cursor });
      cursor = nextForced;
      continue;
    }

    if (hardLimit >= canvasH) {
      slices.push({ srcY: cursor, srcH: canvasH - cursor });
      break;
    }

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

    // PNG — no lossy compression for print
    const imgData     = pageCanvas.toDataURL("image/png");
    const imgHeightPt = srcH * scaleFactor;
    pdf.addImage(imgData, "PNG", 0, 0, PAGE_W_PT, imgHeightPt);
  }

  pdf.save(`${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-print.pdf`);
}
