import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { orders } from "../database/schema";
import { authMiddleware, authenticatedOnly } from "../middleware/authentication";

const assetsRoutes = new Hono();
assetsRoutes.use(authMiddleware);

// GET /api/assets/:key* — serve R2 assets (covers public, books protected)
assetsRoutes.get("/:key{.+}", async (c) => {
  const key = c.req.param("key");
  
  // Book content requires auth and purchase
  if (key.startsWith("books/")) {
    const user = c.get("user");
    if (!user) return c.json({ message: "Unauthorized" }, 401);
    
    // Extract bookId from key like "books/UUID/ebook.html"
    const bookId = key.split("/")[1];
    const db = drizzle(c.env.DB);
    
    const [order] = await db.select().from(orders)
      .where(eq(orders.buyerId, user.id));
    
    const hasAccess = order && order.bookId === bookId && order.status === "completed";
    
    if (!hasAccess) {
      // Check if they are the seller
      const { books } = await import("../database/schema");
      const [book] = await db.select().from(books).where(eq(books.id, bookId));
      if (!book || book.sellerId !== user.id) {
        return c.json({ message: "Access denied" }, 403);
      }
    }
  }

  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.json({ message: "Not found" }, 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  // Covers are regenerated in-place — never let the browser serve a stale cached version
  if (key.startsWith("covers/")) {
    headers.set("Cache-Control", "no-cache, must-revalidate");
  }
  
  return new Response(obj.body, { headers });
});

export { assetsRoutes };
