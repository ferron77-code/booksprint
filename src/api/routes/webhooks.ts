import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { users, tokenTransactions } from "../database/schema";
import Stripe from "stripe";

const webhooksRoutes = new Hono();

// POST /webhook — Stripe webhook for token purchases
webhooksRoutes.post("/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) return c.json({ message: "No signature" }, 401);

  // Get from c.env (production) or process.env (local dev)
  const stripeKey = (c.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY) as string;
  const webhookSecret = (c.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET) as string;

  if (!stripeKey || !webhookSecret) {
    return c.json({ message: "Webhook not configured" }, 500);
  }

  const body = await c.req.text();
  
  let stripe: any;
  try {
    stripe = new Stripe(stripeKey);
  } catch (err: any) {
    return c.json({ message: "Webhook configuration error" }, 500);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return c.json({ message: `Webhook error: ${err.message}` }, 400);
  }

  // Handle checkout.session.completed for token purchases
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (!metadata || !metadata.userId || !metadata.tokens) {
      // Not a token purchase, ignore
      return c.json({ ok: true });
    }

    const db = drizzle(c.env.DB);
    const userId = metadata.userId;
    const tokensToAdd = parseInt(metadata.tokens, 10);
    const packageId = metadata.packageId || "unknown";

    try {
      // Get current balance
      const [userData] = await db
        .select({ tokenBalance: users.tokenBalance })
        .from(users)
        .where(eq(users.id, userId));

      const currentBalance = userData?.tokenBalance || 0;
      const newBalance = currentBalance + tokensToAdd;

      // Update user's token balance
      await db
        .update(users)
        .set({ tokenBalance: newBalance })
        .where(eq(users.id, userId));

      // Log transaction
      await db.insert(tokenTransactions).values({
        id: crypto.randomUUID(),
        userId,
        amount: tokensToAdd,
        type: "purchase",
        description: `Purchased ${tokensToAdd.toLocaleString()} tokens (Package: ${packageId})`,
        stripeSessionId: session.id,
        createdAt: new Date(),
      });

      console.log(
        `✅ Added ${tokensToAdd} tokens to user ${userId}. New balance: ${newBalance}`
      );
    } catch (err: any) {
      console.error("Webhook error:", err);
      return c.json({ message: "Failed to process tokens" }, 500);
    }
  }

  // Handle subscription.updated for plan changes (future use)
  if (event.type === "customer.subscription.updated") {
    // Could handle plan upgrades/downgrades here
  }

  return c.json({ received: true });
});

export { webhooksRoutes };
