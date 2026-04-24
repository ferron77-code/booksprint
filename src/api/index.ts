import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";
import { booksRoutes } from "./routes/books";
import { generateRoutes } from "./routes/generate";
import { ordersRoutes } from "./routes/orders";
import { assetsRoutes } from "./routes/assets";
import { adminRoutes } from "./routes/admin";
import { editRoutes } from "./routes/edit";
import { readerRoutes } from "./routes/reader";
import { subscriptionsRoutes } from "./routes/subscriptions";
import { webhooksRoutes } from "./routes/webhooks";

type Variables = {
  user: { id: string; name: string; email: string; role?: string } | null;
  session: unknown | null;
};

const app = new Hono<{ Variables: Variables }>();

app.use(cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"] }));

// Auth routes
app.all("/api/auth/*", async (c) => {
  const auth = createAuth(`${new URL(c.req.url).protocol}//${new URL(c.req.url).host}`);
  return auth.handler(c.req.raw);
});

// API routes
app.route("/api/books", booksRoutes);
app.route("/api/generate", generateRoutes);
app.route("/api/orders", ordersRoutes);
app.route("/api/assets", assetsRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/edit", editRoutes);
app.route("/api/reader", readerRoutes);
app.route("/api/subscriptions", subscriptionsRoutes);
app.route("/api/webhook", webhooksRoutes);

// User profile
app.get("/api/me", async (c) => {
  const auth = createAuth(`${new URL(c.req.url).protocol}//${new URL(c.req.url).host}`);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json(null);
  return c.json(session.user);
});

app.get("/api/ping", (c) => c.json({ message: `Pong! ${Date.now()}` }));

// Fallback to frontend for non-API routes (handled by Cloudflare Assets)
app.all("*", (c) => {
  return c.notFound();
});

export default app;
