import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, or } from "drizzle-orm";
import { orders, books } from "../database/schema";
import { authMiddleware, authenticatedOnly } from "../middleware/authentication";

const readerRoutes = new Hono();
readerRoutes.use(authMiddleware);

/**
 * GET /api/reader/:bookId
 * Returns the book HTML for reading.
 * Access: the book's seller OR anyone who has a completed order for it.
 */
readerRoutes.get("/:bookId", authenticatedOnly, async (c) => {
  const user = c.get("user")!;
  const { bookId } = c.req.param();
  const db = drizzle(c.env.DB);

  // Load the book
  const [book] = await db.select().from(books).where(eq(books.id, bookId));
  if (!book) return c.json({ message: "Not found" }, 404);

  // Access check: seller OR buyer with completed order
  const isSeller = book.sellerId === user.id;
  if (!isSeller) {
    const [order] = await db.select().from(orders).where(
      and(eq(orders.bookId, bookId), eq(orders.buyerId, user.id), eq(orders.status, "completed"))
    );
    if (!order) return c.json({ message: "Purchase required" }, 403);
  }

  // Load HTML from R2
  const htmlKey = `books/${bookId}/ebook.html`;
  const obj = await c.env.BUCKET.get(htmlKey);
  if (!obj) return c.json({ message: "Content not found" }, 404);

  const html = await obj.text();

  return c.json({
    title: book.title,
    coverUrl: book.coverUrl,
    html,
  });
});

export { readerRoutes };
