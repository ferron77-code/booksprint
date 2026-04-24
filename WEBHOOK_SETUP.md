# Stripe Webhook Setup Guide

## What This Does

When a user buys tokens:
1. Stripe processes payment
2. Sends webhook to your `/api/webhook/stripe` endpoint
3. You add tokens to their account instantly
4. Log transaction for audit

## Setup Steps

### 1. Get Webhook Secret

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** (left sidebar)
3. Click **Webhooks**
4. Click **Add endpoint**
5. Endpoint URL: `https://yourdomain.com/api/webhook/stripe`
6. Events to listen: Check **checkout.session.completed**
7. Click **Add endpoint**
8. Click the endpoint you just created
9. Scroll down to **Signing secret**
10. Click **Reveal** 
11. Copy the secret (starts with `whsec_`)

### 2. Add to Environment

The webhook secret should be in `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

This was just added when you submitted the form above.

### 3. Configure in Code

The webhook is already configured to:
- Listen at `/api/webhook/stripe`
- Verify Stripe signature
- Extract user ID + tokens from metadata
- Add tokens to `user.tokenBalance`
- Log transaction

### 4. Test Webhook

**Local Testing (using Stripe CLI):**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhook to local server
stripe listen --forward-to localhost:6997/api/webhook/stripe

# In another terminal, trigger test event
stripe trigger checkout.session.completed
```

**Production Testing:**
1. Create test subscription/token purchase in Stripe Dashboard (use test card: 4242 4242 4242 4242)
2. Check server logs: Should see `✅ Added X tokens to user Y. New balance: Z`
3. Check user account: Tokens should appear

## Webhook Flow

```
User clicks "Buy Tokens"
    ↓
Redirects to Stripe Checkout
    ↓
User enters payment info
    ↓
User clicks "Pay"
    ↓
Stripe processes payment
    ↓
Payment succeeds
    ↓
Stripe sends webhook: POST /api/webhook/stripe
    ↓
Your server verifies signature
    ↓
Extract: userId, tokens, packageId
    ↓
UPDATE users SET tokenBalance = tokenBalance + tokens
    ↓
INSERT INTO tokenTransactions (...)
    ↓
Response: 200 OK
    ↓
User sees success message in dashboard
    ↓
Next time they generate book, new tokens are available
```

## What Happens if Webhook Fails?

If the webhook doesn't deliver:
1. Stripe retries for 3 days
2. You can manually retry in Stripe Dashboard
3. If still failing, user won't get tokens (refund required)

**Troubleshooting:**
- Check server logs for errors
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check endpoint URL is correct and public
- Verify endpoint accepts POST requests
- Check Stripe Dashboard → Webhooks → Endpoint → Event deliveries

## Security

- Webhook verifies Stripe signature (only Stripe can send)
- No user authentication needed (Stripe does the auth)
- Webhook checks for required metadata (userId, tokens)
- Ignores events without proper metadata

## Metadata in Checkout

When creating checkout, metadata includes:
```json
{
  "userId": "user_123",
  "packageId": "1",
  "tokens": "100000"
}
```

This metadata is extracted by webhook and used to:
- Identify which user bought tokens
- Know how many tokens to add
- Track which package was purchased

## Done?

✅ Webhook code written
✅ Environment variable requested
⏳ Waiting for webhook secret

Once you provide the secret:
1. It auto-saves to `.env.local`
2. Restart server
3. Webhook is live

Test with Stripe CLI locally, then deploy to production.
