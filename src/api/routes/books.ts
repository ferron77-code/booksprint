import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc, and } from "drizzle-orm";
import { books, orders } from "../database/schema";
import { authMiddleware, authenticatedOnly } from "../middleware/authentication";

// Strip markdown formatting from descriptions stored before the clean-description AI call was added
function cleanDescription(desc: string | null | undefined): string | null {
  if (!desc) return null;
  // If it looks like a raw offer (contains • **X:** or --- separators), extract just readable sentences
  if (desc.includes("---") || desc.match(/•\s*\*\*/)) {
    // Pull out just plain text: remove bullets, bold markers, section labels, separators
    let clean = desc
      .replace(/•\s*\*\*[^*]+\*\*:?\s*["'""]?/g, " ")  // • **Label:** with optional opening quote
      .replace(/\*\*([^*]+)\*\*/g, "$1")                  // **bold**
      .replace(/\*([^*]+)\*/g, "$1")                      // *italic*
      .replace(/---+/g, " ")                               // --- separators
      .replace(/#{1,6}\s/g, "")                            // headings
      .replace(/^[•–—]\s*/gm, "")                         // bullet points
      .replace(/["'""][,.]?\s/g, " ")                      // inline quotes
      .replace(/\s{2,}/g, " ")                             // collapse whitespace
      .trim();
    // Take up to first 2 sentences worth (~300 chars), ending at sentence boundary
    if (clean.length > 300) {
      const cut = clean.substring(0, 350);
      const lastPeriod = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
      clean = lastPeriod > 100 ? cut.substring(0, lastPeriod + 1) : cut.substring(0, 300) + "…";
    }
    return clean;
  }
  return desc;
}

const booksRoutes = new Hono();

booksRoutes.use(authMiddleware);

// GET /api/books — public storefront (published only)
booksRoutes.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const category = c.req.query("category");
  
  let query = db.select().from(books).where(eq(books.status, "published")).orderBy(desc(books.createdAt));
  
  const results = await query;
  
  const filtered = category 
    ? results.filter(b => b.category === category)
    : results;

  return c.json(filtered.map(b => ({ ...b, description: cleanDescription(b.description) })));
});

// GET /api/books/:id — single book (public)
booksRoutes.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const { id } = c.req.param();
  
  const [book] = await db.select().from(books).where(eq(books.id, id));
  
  if (!book) return c.json({ message: "Book not found" }, 404);
  if (book.status !== "published") return c.json({ message: "Book not available" }, 404);
  
  return c.json({ ...book, description: cleanDescription(book.description) });
});

// GET /api/books/seller/mine — seller's own books
booksRoutes.get("/seller/mine", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  
  const myBooks = await db
    .select()
    .from(books)
    .where(eq(books.sellerId, user.id))
    .orderBy(desc(books.createdAt));
  
  return c.json(myBooks.map(b => ({ ...b, description: cleanDescription(b.description) })));
});

// POST /api/books/:id/publish — publish a book
booksRoutes.post("/:id/publish", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { id } = c.req.param();
  const { price, category } = await c.req.json();

  const [book] = await db.select().from(books).where(
    and(eq(books.id, id), eq(books.sellerId, user.id))
  );
  
  if (!book) return c.json({ message: "Book not found" }, 404);
  if (book.status === "generating") return c.json({ message: "Book is still generating" }, 400);
  if (!book.pdfUrl) return c.json({ message: "Book PDF not ready" }, 400);

  await db.update(books).set({
    status: "published",
    price: price || book.price,
    category: category || book.category,
    updatedAt: new Date(),
  }).where(eq(books.id, id));

  return c.json({ success: true });
});

// POST /api/books/:id/unpublish
booksRoutes.post("/:id/unpublish", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { id } = c.req.param();

  await db.update(books).set({
    status: "unpublished",
    updatedAt: new Date(),
  }).where(and(eq(books.id, id), eq(books.sellerId, user.id)));

  return c.json({ success: true });
});

// DELETE /api/books/:id
booksRoutes.delete("/:id", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { id } = c.req.param();

  await db.delete(books).where(
    and(eq(books.id, id), eq(books.sellerId, user.id))
  );

  return c.json({ success: true });
});

// POST /api/books/upload — upload an external book (PDF or Word) to sell
booksRoutes.post("/upload", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;

  const body = await c.req.parseBody();
  const file = body["book"] as File | undefined;
  const title = (body["title"] as string | undefined)?.trim();
  const description = (body["description"] as string | undefined)?.trim() ?? "";
  const category = (body["category"] as string | undefined) ?? "Other";

  if (!file) return c.json({ message: "No file provided" }, 400);
  if (!title) return c.json({ message: "Title is required" }, 400);

  const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (!allowed.includes(file.type)) return c.json({ message: "Must be PDF or Word (.doc/.docx)" }, 400);
  if (file.size > 50 * 1024 * 1024) return c.json({ message: "File too large (max 50MB)" }, 400);

  const { nanoid } = await import("nanoid");
  const bookId = nanoid();
  const ext = file.type === "application/pdf" ? "pdf" : file.name.endsWith(".docx") ? "docx" : "doc";
  const fileKey = `books/${bookId}/upload.${ext}`;

  const buffer = await file.arrayBuffer();
  await c.env.BUCKET.put(fileKey, buffer, {
    httpMetadata: { contentType: file.type }
  });

  await db.insert(books).values({
    id: bookId,
    sellerId: user.id,
    title,
    description,
    category,
    pdfUrl: `/api/assets/${fileKey}`,
    status: "draft",
    price: 0,
    salesCount: 0,
    keyword: title,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return c.json({ bookId, success: true });
});

export { booksRoutes };
