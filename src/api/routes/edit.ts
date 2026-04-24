import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { books } from "../database/schema";
import { authMiddleware, authenticatedOnly } from "../middleware/authentication";
import OpenAI from "openai";
import { generateCoverBuffer } from "../lib/coverGen";

const editRoutes = new Hono();
editRoutes.use(authMiddleware);

// GET /api/edit/:bookId — get raw ebook HTML + coverUrl for editing
editRoutes.get("/:bookId", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { bookId } = c.req.param();

  const [book] = await db.select().from(books).where(
    and(eq(books.id, bookId), eq(books.sellerId, user.id))
  );
  if (!book) return c.json({ message: "Not found" }, 404);

  const htmlKey = `books/${bookId}/ebook.html`;
  const obj = await c.env.BUCKET.get(htmlKey);
  if (!obj) return c.json({ message: "Content not found" }, 404);

  const html = await obj.text();
  return c.json({ html, title: book.title, coverUrl: book.coverUrl || "", status: book.status || "draft" });
});

// PUT /api/edit/:bookId — save edited content
editRoutes.put("/:bookId", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { bookId } = c.req.param();
  const { html, title } = await c.req.json() as { html: string; title?: string };

  const [book] = await db.select().from(books).where(
    and(eq(books.id, bookId), eq(books.sellerId, user.id))
  );
  if (!book) return c.json({ message: "Not found" }, 404);

  const htmlKey = `books/${bookId}/ebook.html`;
  await c.env.BUCKET.put(htmlKey, html, {
    httpMetadata: { contentType: "text/html" }
  });

  if (title && title !== book.title) {
    await db.update(books).set({ title, updatedAt: new Date() })
      .where(eq(books.id, bookId));
  }

  return c.json({ success: true });
});

// POST /api/edit/:bookId/regenerate-cover — regenerate the book cover
editRoutes.post("/:bookId/regenerate-cover", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { bookId } = c.req.param();

  const [book] = await db.select().from(books).where(
    and(eq(books.id, bookId), eq(books.sellerId, user.id))
  );
  if (!book) return c.json({ message: "Not found" }, 404);

  const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });

  try {
    const imgBuffer = await generateCoverBuffer(openai, book.title, book.keyword);
    const coverKey = `covers/${bookId}.png`;
    await c.env.BUCKET.put(coverKey, imgBuffer, {
      httpMetadata: { contentType: "image/png" }
    });
    const coverUrl = `/api/assets/${coverKey}?t=${Date.now()}`;

    // Embed the new cover into the stored HTML so downloads always have it
    await updateHtmlCover(c.env.BUCKET, bookId, imgBuffer, "image/png");

    await db.update(books).set({ coverUrl, updatedAt: new Date() })
      .where(eq(books.id, bookId));

    return c.json({ coverUrl });
  } catch (err) {
    console.error("Cover regen failed:", err);
    return c.json({ message: "Cover generation failed" }, 500);
  }
});

// Helper: embed new cover image as base64 into the stored ebook HTML
async function updateHtmlCover(bucket: R2Bucket, bookId: string, imgBuffer: ArrayBuffer, mime: string): Promise<void> {
  const htmlKey = `books/${bookId}/ebook.html`;
  const obj = await bucket.get(htmlKey);
  if (!obj) return;

  let html = await obj.text();
  const arr = new Uint8Array(imgBuffer);
  let b64 = "";
  for (let i = 0; i < arr.length; i += 8192) {
    b64 += String.fromCharCode(...arr.subarray(i, i + 8192));
  }
  const dataUrl = `data:${mime};base64,${btoa(b64)}`;

  if (html.includes('class="cover"')) {
    // Replace src on the img inside the cover div — use a split approach to avoid regex issues with long base64 strings
    const coverStart = html.indexOf('class="cover"');
    const coverEnd = html.indexOf('</div>', coverStart);
    if (coverStart !== -1 && coverEnd !== -1) {
      const coverSection = html.slice(coverStart, coverEnd);
      if (coverSection.includes('<img')) {
        // Replace src= inside this section only
        const newCoverSection = coverSection.replace(/src="[^"]*"/, `src="${dataUrl}"`);
        html = html.slice(0, coverStart) + newCoverSection + html.slice(coverEnd);
      } else {
        // No img yet — inject one right after the opening div
        const insertAt = html.indexOf('>', coverStart) + 1;
        html = html.slice(0, insertAt) + `\n    <img src="${dataUrl}" alt="Cover" />` + html.slice(insertAt);
      }
    }
  } else {
    // No cover div — prepend one after <body>
    html = html.replace(/<body[^>]*>/, `<body>\n  <div class="cover">\n    <img src="${dataUrl}" alt="Cover" />\n  </div>`);
  }

  await bucket.put(htmlKey, html, { httpMetadata: { contentType: "text/html" } });
}

// Helper: fetch cover from R2 and return as base64 data URL
async function getCoverDataUrl(bucket: R2Bucket, coverUrl: string): Promise<string | null> {
  try {
    // Handle both "/api/assets/covers/ID.png" and "https://domain/api/assets/covers/ID.png"
    const urlPath = coverUrl.split("?")[0];
    const assetIdx = urlPath.indexOf("/api/assets/");
    const coverKey = assetIdx !== -1 ? urlPath.slice(assetIdx + "/api/assets/".length) : urlPath.replace(/^\//, "");
    const obj = await bucket.get(coverKey);
    if (!obj) return null;
    const bytes = await obj.arrayBuffer();
    const arr = new Uint8Array(bytes);
    let b64 = "";
    // chunk to avoid call stack overflow on large images
    for (let i = 0; i < arr.length; i += 8192) {
      b64 += String.fromCharCode(...arr.subarray(i, i + 8192));
    }
    const mime = obj.httpMetadata?.contentType ?? "image/png";
    return `data:${mime};base64,${btoa(b64)}`;
  } catch { return null; }
}

// GET /api/edit/:bookId/download?format=pdf|word
editRoutes.get("/:bookId/download", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { bookId } = c.req.param();
  const format = c.req.query("format") ?? "pdf";

  const [book] = await db.select().from(books).where(
    and(eq(books.id, bookId), eq(books.sellerId, user.id))
  );
  if (!book) return c.json({ message: "Not found" }, 404);

  const htmlKey = `books/${bookId}/ebook.html`;
  const obj = await c.env.BUCKET.get(htmlKey);
  if (!obj) return c.json({ message: "Content not found" }, 404);

  // HTML already has cover embedded as base64 (stored that way since generation / cover update)
  const html = await obj.text();
  const slug = book.title.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  if (format === "word") {
    const { Document, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, PageBreak, Packer, SectionType } = await import("docx");

    // ── Extract cover data URL ──────────────────────────────────────────────
    const coverDivStart = html.indexOf('class="cover"');
    const coverDivEnd = coverDivStart !== -1 ? html.indexOf('</div>', coverDivStart) : -1;
    const coverSection = coverDivStart !== -1 && coverDivEnd !== -1 ? html.slice(coverDivStart, coverDivEnd) : "";
    const coverMatch = coverSection.match(/src="(data:[^"]+)"/);
    const coverDataUrl = coverMatch ? coverMatch[1] : (book.coverUrl ? await getCoverDataUrl(c.env.BUCKET, book.coverUrl) : null);

    // ── Build content paragraphs ────────────────────────────────────────────
    const contentParagraphs: InstanceType<typeof Paragraph>[] = [];

    // Title heading
    contentParagraphs.push(new Paragraph({
      text: book.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }));

    // Strip cover div from body, then parse remaining HTML into paragraphs
    const bodyHtml = html
      .replace(/[\s\S]*<body[^>]*>/i, "")
      .replace(/<\/body>[\s\S]*/i, "")
      .replace(/<div[^>]*class="cover"[^>]*>[\s\S]*?<\/div>/i, "");

    const blocks = bodyHtml.split(/(?=<h[1-3][^>]*>)|(?=<p[^>]*>)|(?=<li[^>]*>)/i).filter(Boolean);
    for (const block of blocks) {
      const text = block
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
        .trim();
      if (!text) continue;
      if (/<h1/i.test(block)) contentParagraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 } }));
      else if (/<h2/i.test(block)) contentParagraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } }));
      else if (/<h3/i.test(block)) contentParagraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 240, after: 100 } }));
      else if (/<li/i.test(block)) contentParagraphs.push(new Paragraph({ text: `• ${text}`, indent: { left: 360 }, spacing: { after: 80 } }));
      else contentParagraphs.push(new Paragraph({ children: [new TextRun({ text, size: 24 })], spacing: { after: 160, line: 336 } }));
    }

    // ── 6×9 inch page dimensions ────────────────────────────────────────────
    // 1 inch = 1440 twips, 1 inch = 914400 EMU
    // 6 in = 8640 twips, 9 in = 12960 twips
    const PG_W_TWIPS = 8640;
    const PG_H_TWIPS = 12960;
    // Margins: 0.75 in LR = 1080 twips, 1 in TB = 1440 twips
    const PAGE_MARGINS = { top: 1440, bottom: 1440, left: 1080, right: 1080 };
    // Cover EMU: 6 in × 914400 = 5486400, 9 in × 914400 = 8229600
    // transformation takes pixels (docx lib converts px → EMU internally: 1px = 9525 EMU)
    const PG_W_PX = 576;  // 6 in × 96 dpi
    const PG_H_PX = 864;  // 9 in × 96 dpi

    // ── Build sections ──────────────────────────────────────────────────────
    const docSections: Parameters<typeof Document>[0]["sections"] = [];

    if (coverDataUrl) {
      const base64Data = coverDataUrl.split(",")[1];
      const mime = coverDataUrl.match(/data:([^;]+)/)?.[1] ?? "image/png";
      const imgType = mime.includes("jpeg") ? "jpg" : "png";
      const binaryStr = atob(base64Data);
      const imgBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) imgBytes[i] = binaryStr.charCodeAt(i);

      // Section 1: Cover page — zero margins, image fills full 6×9 page
      docSections.push({
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            size: { width: PG_W_TWIPS, height: PG_H_TWIPS },
          },
        } as any,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0, line: 240, lineRule: "auto" as any },
            indent: { left: 0, right: 0 },
            children: [
              new ImageRun({
                data: imgBytes.buffer as ArrayBuffer,
                transformation: { width: PG_W_PX, height: PG_H_PX },
                type: imgType as "png" | "jpg",
              }),
            ],
          }),
        ],
      });
    }

    // Section 2 (or 1 if no cover): Content with margins, 6×9 page
    docSections.push({
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          margin: PAGE_MARGINS,
          size: { width: PG_W_TWIPS, height: PG_H_TWIPS },
        },
      } as any,
      children: contentParagraphs,
    });

    const doc = new Document({ sections: docSections });
    const buffer = await Packer.toBuffer(doc);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${slug}.docx"`,
      }
    });
  }

  // PDF — ensure cover is base64, then sanitize CSS before handing to client renderer
  let pdfHtml = html;
  const pdfCoverDivStart = html.indexOf('class="cover"');
  if (pdfCoverDivStart !== -1) {
    const pdfCoverDivEnd = html.indexOf('</div>', pdfCoverDivStart);
    const pdfCoverSection = pdfCoverDivEnd !== -1 ? html.slice(pdfCoverDivStart, pdfCoverDivEnd) : "";
    const hasCoverBase64 = pdfCoverSection.includes('src="data:');
    if (!hasCoverBase64 && book.coverUrl) {
      const fallbackDataUrl = await getCoverDataUrl(c.env.BUCKET, book.coverUrl);
      if (fallbackDataUrl) {
        const before = html.slice(0, pdfCoverDivStart);
        const after = html.slice(pdfCoverDivEnd);
        const fixedSection = pdfCoverSection.replace(/src="[^"]*"/, `src="${fallbackDataUrl}"`);
        pdfHtml = before + fixedSection + after;
      }
    }
  } else if (book.coverUrl) {
    const fallbackDataUrl = await getCoverDataUrl(c.env.BUCKET, book.coverUrl);
    if (fallbackDataUrl) {
      pdfHtml = html.replace(/<body[^>]*>/i, (m) =>
        `${m}\n  <div class="cover">\n    <img src="${fallbackDataUrl}" alt="Cover" />\n  </div>`
      );
    }
  }

  // Strip stored CSS rules that fight the client-side PDF renderer's margin/cover logic
  pdfHtml = pdfHtml
    .replace(/\bbody\s*\{[^}]*\}/gi, "body {}")
    .replace(/\.cover\s+img\s*\{[^}]*\}/gi, "")
    .replace(/\.cover\s*\{[^}]*\}/gi, "");

  return new Response(pdfHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    }
  });
});

// POST /api/edit/:bookId/upload-cover — upload a custom cover image
editRoutes.post("/:bookId/upload-cover", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { bookId } = c.req.param();

  const [book] = await db.select().from(books).where(
    and(eq(books.id, bookId), eq(books.sellerId, user.id))
  );
  if (!book) return c.json({ message: "Not found" }, 404);

  const body = await c.req.parseBody();
  const file = body["cover"] as File | undefined;
  if (!file) return c.json({ message: "No file provided" }, 400);

  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) return c.json({ message: "Must be PNG, JPG, or WebP" }, 400);
  if (file.size > 10 * 1024 * 1024) return c.json({ message: "File too large (max 10MB)" }, 400);

  const buffer = await file.arrayBuffer();
  const coverKey = `covers/${bookId}.png`;
  await c.env.BUCKET.put(coverKey, buffer, {
    httpMetadata: { contentType: file.type }
  });
  const coverUrl = `/api/assets/${coverKey}?t=${Date.now()}`;

  // Embed the uploaded cover into the stored HTML
  await updateHtmlCover(c.env.BUCKET, bookId, buffer, file.type);

  await db.update(books).set({ coverUrl, updatedAt: new Date() })
    .where(eq(books.id, bookId));

  return c.json({ coverUrl });
});

// POST /api/edit/:bookId/export-docx
editRoutes.post("/:bookId/export-docx", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { bookId } = c.req.param();

  const [book] = await db.select().from(books).where(
    and(eq(books.id, bookId), eq(books.sellerId, user.id))
  );
  if (!book) return c.json({ message: "Not found" }, 404);

  const htmlKey = `books/${bookId}/ebook.html`;
  const obj = await c.env.BUCKET.get(htmlKey);
  if (!obj) return c.json({ message: "Content not found" }, 404);

  const html = await obj.text();
  const docxKey = `books/${bookId}/ebook.docx.html`;
  await c.env.BUCKET.put(docxKey, html, {
    httpMetadata: { contentType: "text/html" }
  });

  await db.update(books).set({
    valueEnhancerUrl: `/api/assets/${docxKey}`,
    updatedAt: new Date()
  }).where(eq(books.id, bookId));

  return c.json({ success: true, docxUrl: `/api/assets/${docxKey}` });
});

export { editRoutes };
