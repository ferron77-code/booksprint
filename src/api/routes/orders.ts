import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { orders, books, users } from "../database/schema";
import { authMiddleware, authenticatedOnly } from "../middleware/authentication";
import Stripe from "stripe";
import { sendDownloadEmail } from "../lib/email";

const ordersRoutes = new Hono();
ordersRoutes.use(authMiddleware);

// POST /api/orders/checkout — create stripe checkout session
ordersRoutes.post("/checkout", authenticatedOnly, async (c) => {
  const user = c.get("user")!;
  const { bookId } = await c.req.json();
  const db = drizzle(c.env.DB);

  const [book] = await db.select().from(books)
    .where(and(eq(books.id, bookId), eq(books.status, "published")));

  if (!book) return c.json({ message: "Book not found" }, 404);
  if (book.sellerId === user.id) return c.json({ message: "You cannot buy your own book" }, 400);

  // Check if already purchased
  const [existing] = await db.select().from(orders)
    .where(and(eq(orders.buyerId, user.id), eq(orders.bookId, bookId), eq(orders.status, "completed")));
  
  if (existing) return c.json({ message: "Already purchased", orderId: existing.id });

  if (!c.env.STRIPE_SECRET_KEY) {
    // Demo mode: create order directly
    const orderId = crypto.randomUUID();
    await db.insert(orders).values({
      id: orderId,
      buyerId: user.id,
      bookId,
      sellerId: book.sellerId,
      amount: book.price,
      status: "completed",
      createdAt: new Date(),
    });
    await db.update(books).set({ salesCount: (book.salesCount || 0) + 1 }).where(eq(books.id, bookId));

    // Send email if buyer opted in (always send in demo)
    try {
      const origin = c.req.header("origin") || "http://localhost:6997";
      await sendDownloadEmail({
        runableUrl: (c.env as unknown as { RUNABLE_URL?: string }).RUNABLE_URL || "",
        buyerEmail: user.email,
        buyerName: user.name,
        bookTitle: book.title,
        pdfUrl: book.pdfUrl || "",
        valueEnhancerUrl: book.valueEnhancerUrl,
        origin,
      });
    } catch (e) {
      console.error("Email send failed:", e);
    }

    return c.json({ orderId, mode: "demo" });
  }

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  const origin = c.req.header("origin") || "http://localhost:6997";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: book.title,
          description: book.description || undefined,
          images: book.coverUrl ? [`${origin}${book.coverUrl}`] : [],
        },
        unit_amount: Math.round(book.price * 100),
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${origin}/download/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/book/${bookId}`,
    metadata: { bookId, buyerId: user.id, sellerId: book.sellerId },
  });

  // Create pending order
  const orderId = crypto.randomUUID();
  await db.insert(orders).values({
    id: orderId,
    buyerId: user.id,
    bookId,
    sellerId: book.sellerId,
    amount: book.price,
    stripeSessionId: session.id,
    status: "pending",
    createdAt: new Date(),
  });

  return c.json({ checkoutUrl: session.url, orderId });
});

// POST /api/orders/webhook — stripe webhook
ordersRoutes.post("/webhook", async (c) => {
  const stripeKey = c.env.STRIPE_SECRET_KEY;
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;
  
  if (!stripeKey) return c.json({ ok: true });

  const stripe = new Stripe(stripeKey);
  const body = await c.req.text();
  const signature = c.req.header("stripe-signature");

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    return c.json({ message: "Webhook error" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id: string; metadata?: { bookId?: string } };
    const db = drizzle(c.env.DB);

    await db.update(orders).set({ status: "completed" })
      .where(eq(orders.stripeSessionId, session.id));

    const bookId = session.metadata?.bookId;
    if (bookId) {
      const [book] = await db.select().from(books).where(eq(books.id, bookId));
      if (book) {
        await db.update(books).set({ salesCount: (book.salesCount || 0) + 1 })
          .where(eq(books.id, bookId));
      }
    }
  }

  return c.json({ ok: true });
});

// GET /api/orders/verify/:sessionId — verify after stripe redirect (public, uses Stripe for auth)
ordersRoutes.get("/verify/:sessionId", async (c) => {
  const { sessionId } = c.req.param();
  const db = drizzle(c.env.DB);

  // Find order by Stripe session ID (no user check, Stripe is the auth)
  const [order] = await db.select({
    id: orders.id,
    status: orders.status,
    bookTitle: books.title,
    coverUrl: books.coverUrl,
    pdfUrl: books.pdfUrl,
    valueEnhancerUrl: books.valueEnhancerUrl,
    bookId: books.id,
  })
  .from(orders)
  .innerJoin(books, eq(orders.bookId, books.id))
  .where(eq(orders.stripeSessionId, sessionId));

  if (!order) return c.json({ message: "Order not found" }, 404);

  // If still pending, verify via Stripe and mark as completed if paid
  if (order.status === "pending" && c.env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      await db.update(orders).set({ status: "completed" }).where(eq(orders.id, order.id));
      order.status = "completed";
    }
  }

  return c.json(order);
});

// GET /api/orders/my-purchases
ordersRoutes.get("/my-purchases", authenticatedOnly, async (c) => {
  const user = c.get("user")!;
  const db = drizzle(c.env.DB);

  const myOrders = await db.select({
    id: orders.id,
    bookId: orders.bookId,
    amount: orders.amount,
    status: orders.status,
    createdAt: orders.createdAt,
    bookTitle: books.title,
    bookCoverUrl: books.coverUrl,
    pdfUrl: books.pdfUrl,
    valueEnhancerUrl: books.valueEnhancerUrl,
  })
  .from(orders)
  .innerJoin(books, eq(orders.bookId, books.id))
  .where(and(eq(orders.buyerId, user.id), eq(orders.status, "completed")));

  return c.json(myOrders);
});

// GET /api/orders/download/:orderId
ordersRoutes.get("/download/:orderId", authenticatedOnly, async (c) => {
  const user = c.get("user")!;
  const { orderId } = c.req.param();
  const db = drizzle(c.env.DB);

  const [order] = await db.select({
    id: orders.id,
    status: orders.status,
    bookTitle: books.title,
    coverUrl: books.coverUrl,
    pdfUrl: books.pdfUrl,
    valueEnhancerUrl: books.valueEnhancerUrl,
    bookId: books.id,
  })
  .from(orders)
  .innerJoin(books, eq(orders.bookId, books.id))
  .where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id)));

  if (!order) return c.json({ message: "Order not found" }, 404);
  if (order.status !== "completed") return c.json({ message: "Order not completed" }, 400);

  return c.json(order);
});

// GET /api/orders/download/:orderId/ebook — serve clean HTML ebook as download (public, order UUID acts as token)
ordersRoutes.get("/download/:orderId/ebook", async (c) => {
  const { orderId } = c.req.param();
  const db = drizzle(c.env.DB);

  const [order] = await db.select({
    id: orders.id,
    status: orders.status,
    bookTitle: books.title,
    bookId: books.id,
  })
  .from(orders)
  .innerJoin(books, eq(orders.bookId, books.id))
  .where(eq(orders.id, orderId));

  if (!order) return c.json({ message: "Order not found" }, 404);
  if (order.status !== "completed") return c.json({ message: "Order not completed" }, 400);

  const htmlKey = `books/${order.bookId}/ebook.html`;
  const obj = await c.env.BUCKET.get(htmlKey);
  if (!obj) return c.json({ message: "File not found" }, 404);

  let html = await obj.text();

  // Strip stored CSS rules that fight the PDF renderer / look bad in browser
  html = html
    .replace(/\bbody\s*\{[^}]*\}/gi, "body { font-family: Georgia, serif; font-size: 16px; line-height: 1.75; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 40px 24px; }")
    .replace(/\.cover\s+img\s*\{[^}]*\}/gi, ".cover img { width: 100%; max-width: 100%; height: auto; display: block; }")
    .replace(/\.cover\s*\{[^}]*\}/gi, ".cover { margin-bottom: 3em; page-break-after: always; }");

  const slug = order.bookTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.html"`,
      "Cache-Control": "no-store",
    }
  });
});

// GET /api/orders/download/:orderId/word — serve Word (.docx) as download (public, order UUID acts as token)
ordersRoutes.get("/download/:orderId/word", async (c) => {
  const { orderId } = c.req.param();
  const db = drizzle(c.env.DB);

  const [order] = await db.select({
    id: orders.id,
    status: orders.status,
    bookTitle: books.title,
    bookId: books.id,
    coverUrl: books.coverUrl,
  })
  .from(orders)
  .innerJoin(books, eq(orders.bookId, books.id))
  .where(eq(orders.id, orderId));

  if (!order) return c.json({ message: "Order not found" }, 404);
  if (order.status !== "completed") return c.json({ message: "Order not completed" }, 400);

  const htmlKey = `books/${order.bookId}/ebook.html`;
  const obj = await c.env.BUCKET.get(htmlKey);
  if (!obj) return c.json({ message: "File not found" }, 404);

  const html = await obj.text();
  const slug = order.bookTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  // Reuse the Word generation logic from edit.ts
  const { Document, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, PageBreak, Packer, SectionType } = await import("docx");

  // ── Extract cover data URL ──────────────────────────────────────────────
  const coverDivStart = html.indexOf('class="cover"');
  const coverDivEnd = coverDivStart !== -1 ? html.indexOf('</div>', coverDivStart) : -1;
  const coverSection = coverDivStart !== -1 && coverDivEnd !== -1 ? html.slice(coverDivStart, coverDivEnd) : "";
  const coverMatch = coverSection.match(/src="(data:[^"]+)"/);
  const coverDataUrl = coverMatch ? coverMatch[1] : (order.coverUrl ? await getCoverDataUrl(c.env.BUCKET, order.coverUrl) : null);

  // ── Build content paragraphs ────────────────────────────────────────────
  const contentParagraphs: InstanceType<typeof Paragraph>[] = [];

  // Title heading
  contentParagraphs.push(new Paragraph({
    text: order.bookTitle,
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
  const PG_W_TWIPS = 8640;
  const PG_H_TWIPS = 12960;
  const PAGE_MARGINS = { top: 1440, bottom: 1440, left: 1080, right: 1080 };
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
  const docBuffer = await Packer.toBuffer(doc);

  return new Response(docBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${slug}.docx"`,
      "Cache-Control": "no-store",
    }
  });
});

// Helper to get cover as data URL
async function getCoverDataUrl(bucket: any, coverUrl: string): Promise<string | null> {
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
    for (let i = 0; i < arr.length; i++) {
      b64 += String.fromCharCode(arr[i]);
    }
    const encoded = btoa(b64);
    return `data:image/png;base64,${encoded}`;
  } catch {
    return null;
  }
}

// GET /api/orders/download/:orderId/pdf — serve PDF-ready HTML as download (public, order UUID acts as token)
ordersRoutes.get("/download/:orderId/pdf", async (c) => {
  const { orderId } = c.req.param();
  const db = drizzle(c.env.DB);

  const [order] = await db.select({
    id: orders.id,
    status: orders.status,
    bookTitle: books.title,
    bookId: books.id,
    coverUrl: books.coverUrl,
  })
  .from(orders)
  .innerJoin(books, eq(orders.bookId, books.id))
  .where(eq(orders.id, orderId));

  if (!order) return c.json({ message: "Order not found" }, 404);
  if (order.status !== "completed") return c.json({ message: "Order not completed" }, 400);

  const htmlKey = `books/${order.bookId}/ebook.html`;
  const obj = await c.env.BUCKET.get(htmlKey);
  if (!obj) return c.json({ message: "File not found" }, 404);

  let pdfHtml = await obj.text();
  
  // Ensure cover is base64
  const pdfCoverDivStart = pdfHtml.indexOf('class="cover"');
  if (pdfCoverDivStart !== -1) {
    const pdfCoverDivEnd = pdfHtml.indexOf('</div>', pdfCoverDivStart);
    const pdfCoverSection = pdfCoverDivEnd !== -1 ? pdfHtml.slice(pdfCoverDivStart, pdfCoverDivEnd) : "";
    const hasCoverBase64 = pdfCoverSection.includes('src="data:');
    if (!hasCoverBase64 && order.coverUrl) {
      const fallbackDataUrl = await getCoverDataUrl(c.env.BUCKET, order.coverUrl);
      if (fallbackDataUrl) {
        const before = pdfHtml.slice(0, pdfCoverDivStart);
        const after = pdfHtml.slice(pdfCoverDivEnd);
        const fixedSection = pdfCoverSection.replace(/src="[^"]*"/, `src="${fallbackDataUrl}"`);
        pdfHtml = before + fixedSection + after;
      }
    }
  } else if (order.coverUrl) {
    const fallbackDataUrl = await getCoverDataUrl(c.env.BUCKET, order.coverUrl);
    if (fallbackDataUrl) {
      pdfHtml = pdfHtml.replace(/<body[^>]*>/i, (m) =>
        `${m}\n  <div class="cover">\n    <img src="${fallbackDataUrl}" alt="Cover" />\n  </div>`
      );
    }
  }

  // Strip stored CSS rules that fight client-side PDF renderer
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

export { ordersRoutes };
