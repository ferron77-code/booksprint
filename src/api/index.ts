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

const app = new Hono<{ Variables: Variables }>().basePath("api");

app.use(cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"] }));

// Auth routes
app.all("/auth/*", async (c) => {
  const auth = createAuth(`${new URL(c.req.url).protocol}//${new URL(c.req.url).host}`);
  return auth.handler(c.req.raw);
});

// API routes
app.route("/books", booksRoutes);
app.route("/generate", generateRoutes);
app.route("/orders", ordersRoutes);
app.route("/assets", assetsRoutes);
app.route("/admin", adminRoutes);
app.route("/edit", editRoutes);
app.route("/reader", readerRoutes);
app.route("/subscriptions", subscriptionsRoutes);
app.route("/webhook", webhooksRoutes);

// User profile
app.get("/me", async (c) => {
  const auth = createAuth(`${new URL(c.req.url).protocol}//${new URL(c.req.url).host}`);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json(null);
  return c.json(session.user);
});

app.get("/ping", (c) => c.json({ message: `Pong! ${Date.now()}` }));

export default app;
