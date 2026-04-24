import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { users, subscriptions, tokenPackages, tokenTransactions } from "../database/schema";
import { authMiddleware, authenticatedOnly } from "../middleware/authentication";
import Stripe from "stripe";

const subscriptionsRoutes = new Hono();
subscriptionsRoutes.use(authMiddleware);

const PLANS = {
  starter: { price: 1900, books: 5, tokens: 150000, name: "Starter" },
  creator: { price: 3900, books: 15, tokens: 500000, name: "Creator" },
  pro: { price: 7900, books: 999, tokens: 2000000, name: "Pro" },
};

// GET /api/subscriptions/current — get user's current subscription
subscriptionsRoutes.get("/current", authenticatedOnly, async (c) => {
  const user = c.get("user")!;
  const db = drizzle(c.env.DB);

  let [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id));

  // Auto-create starter subscription if doesn't exist
  if (!sub) {
    const now = new Date();
    const monthReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    sub = {
      id: crypto.randomUUID(),
      userId: user.id,
      tier: "starter",
      stripeSubscriptionId: null,
      monthlyBookLimit: 5,
      booksGeneratedThisMonth: 0,
      monthlyTokenAllowance: 150000,
      tokensUsedThisMonth: 0,
      monthResetDate: monthReset,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(subscriptions).values(sub);
  }

  // Reset monthly counter if month has passed
  if (sub.monthResetDate && new Date() > new Date(sub.monthResetDate)) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    await db
      .update(subscriptions)
      .set({ booksGeneratedThisMonth: 0, monthResetDate: nextMonth })
      .where(eq(subscriptions.userId, user.id));
    sub.booksGeneratedThisMonth = 0;
  }

  // Get user's token balance
  const [user_data] = await db.select({ tokenBalance: users.tokenBalance }).from(users).where(eq(users.id, user.id));
  const purchasedTokens = user_data?.tokenBalance || 0;
  const remainingAllowance = sub.monthlyTokenAllowance - sub.tokensUsedThisMonth;
  const totalAvailableTokens = remainingAllowance + purchasedTokens;

  return c.json({
    tier: sub.tier,
    monthlyLimit: sub.monthlyBookLimit,
    booksUsedThisMonth: sub.booksGeneratedThisMonth,
    booksRemainingThisMonth: sub.monthlyBookLimit - sub.booksGeneratedThisMonth,
    monthlyTokenAllowance: sub.monthlyTokenAllowance,
    tokensUsedThisMonth: sub.tokensUsedThisMonth,
    tokensRemainingThisMonth: remainingAllowance,
    purchasedTokens,
    totalAvailableTokens,
    active: sub.active,
  });
});

// POST /api/subscriptions/checkout — create Stripe checkout for plan upgrade
subscriptionsRoutes.post("/checkout", authenticatedOnly, async (c) => {
  const user = c.get("user")!;
  const { tier } = await c.req.json() as { tier: keyof typeof PLANS };

  if (!PLANS[tier]) return c.json({ message: "Invalid plan" }, 400);

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  const origin = new URL(c.req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `BookSprint ${PLANS[tier].name} Plan` },
            unit_amount: PLANS[tier].price,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/dashboard?subscription=cancelled`,
      metadata: { userId: user.id, tier },
    });

    return c.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    return c.json({ message: "Checkout failed" }, 500);
  }
});

// POST /api/subscriptions/increment — increment books this month (called when book is created)
subscriptionsRoutes.post("/increment", authenticatedOnly, async (c) => {
  const user = c.get("user")!;
  const db = drizzle(c.env.DB);

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id));
  if (!sub) return c.json({ message: "No subscription found" }, 404);

  // Check if already at limit
  if (sub.booksGeneratedThisMonth >= sub.monthlyBookLimit) {
    return c.json({ message: "Monthly book limit reached" }, 403);
  }

  await db
    .update(subscriptions)
    .set({ booksGeneratedThisMonth: sub.booksGeneratedThisMonth + 1 })
    .where(eq(subscriptions.userId, user.id));

  return c.json({ ok: true });
});

// GET /api/subscriptions/tokens/packages — get available token packages
subscriptionsRoutes.get("/tokens/packages", async (c) => {
  // Return default packages (table may not exist in dev, that's ok)
  return c.json([
    { id: "1", name: "Starter Pack", tokens: 100000, priceInCents: 999, stripeProductId: null },
    { id: "2", name: "Creator Pack", tokens: 350000, priceInCents: 2999, stripeProductId: null },
    { id: "3", name: "Pro Pack", tokens: 1000000, priceInCents: 9999, stripeProductId: null },
  ]);
});

// POST /api/subscriptions/tokens/checkout — create checkout for token package
subscriptionsRoutes.post("/tokens/checkout", authenticatedOnly, async (c) => {
  const user = c.get("user")!;
  const { packageId } = await c.req.json() as { packageId: string };

  // Hardcoded packages (no DB needed)
  const packages: Record<string, { name: string; tokens: number; priceInCents: number }> = {
    "1": { name: "Starter Pack", tokens: 100000, priceInCents: 999 },
    "2": { name: "Creator Pack", tokens: 350000, priceInCents: 2999 },
    "3": { name: "Pro Pack", tokens: 1000000, priceInCents: 9999 },
  };

  const pkg = packages[packageId];
  if (!pkg) return c.json({ message: "Package not found" }, 404);

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  const origin = new URL(c.req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${pkg.name} (${pkg.tokens.toLocaleString()} tokens)` },
            unit_amount: pkg.priceInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?tokens=success`,
      cancel_url: `${origin}/dashboard?tokens=cancelled`,
      metadata: { userId: user.id, packageId, tokens: pkg.tokens.toString() },
    });

    return c.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    return c.json({ message: "Checkout failed" }, 500);
  }
});

export { subscriptionsRoutes };
