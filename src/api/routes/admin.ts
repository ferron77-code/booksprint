import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc, count, sum } from "drizzle-orm";
import { books, orders, users } from "../database/schema";
import { authMiddleware, authenticatedOnly } from "../middleware/authentication";
import { createMiddleware } from "hono/factory";

const adminRoutes = new Hono();
adminRoutes.use(authMiddleware);

const adminOnly = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user || (user as { role?: string }).role !== "admin") {
    return c.json({ message: "Admin access required" }, 403);
  }
  return next();
});

adminRoutes.use(authenticatedOnly);
adminRoutes.use(adminOnly);

// GET /api/admin/stats
adminRoutes.get("/stats", async (c) => {
  const db = drizzle(c.env.DB);

  const [totalBooks] = await db.select({ count: count() }).from(books);
  const [totalOrders] = await db.select({ count: count() }).from(orders).where(eq(orders.status, "completed"));
  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [revenue] = await db.select({ total: sum(orders.amount) }).from(orders).where(eq(orders.status, "completed"));

  return c.json({
    totalBooks: totalBooks.count,
    totalOrders: totalOrders.count,
    totalUsers: totalUsers.count,
    totalRevenue: revenue.total || 0,
  });
});

// GET /api/admin/books
adminRoutes.get("/books", async (c) => {
  const db = drizzle(c.env.DB);
  const allBooks = await db.select().from(books).orderBy(desc(books.createdAt));
  return c.json(allBooks);
});

// GET /api/admin/users
adminRoutes.get("/users", async (c) => {
  const db = drizzle(c.env.DB);
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.createdAt));
  return c.json(allUsers);
});

// PATCH /api/admin/users/:id/role
adminRoutes.patch("/users/:id/role", async (c) => {
  const db = drizzle(c.env.DB);
  const { id } = c.req.param();
  const { role } = await c.req.json();

  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
  return c.json({ success: true });
});

// DELETE /api/admin/books/:id
adminRoutes.delete("/books/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const { id } = c.req.param();
  await db.delete(books).where(eq(books.id, id));
  return c.json({ success: true });
});

// GET /api/admin/orders
adminRoutes.get("/orders", async (c) => {
  const db = drizzle(c.env.DB);
  const allOrders = await db.select({
    id: orders.id,
    amount: orders.amount,
    status: orders.status,
    createdAt: orders.createdAt,
    bookTitle: books.title,
  })
  .from(orders)
  .innerJoin(books, eq(orders.bookId, books.id))
  .orderBy(desc(orders.createdAt));
  
  return c.json(allOrders);
});

export { adminRoutes };
