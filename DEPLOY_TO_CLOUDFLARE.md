# Deploy BookSprint to Cloudflare Pages

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create new repo: `booksprint` (or your preferred name)
3. **DO NOT** initialize with README
4. Click "Create repository"

## Step 2: Push Code to GitHub

```bash
cd /home/user/booksprint

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/booksprint.git

# Push to main branch
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 3: Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Pages** (left sidebar)
3. Click **Create a project**
4. Select **Connect to Git**
5. Authorize GitHub (if not already done)
6. Find and select your `booksprint` repository
7. Click **Begin setup**

## Step 4: Configure Build Settings

**Framework preset**: None
**Build command**: `bun run build`
**Build output directory**: `dist`

## Step 5: Set Environment Variables

Before deploying, add secrets:

Click **Environment variables** and add:

```
STRIPE_PUBLIC_KEY = pk_live_...
STRIPE_SECRET_KEY = sk_live_...
STRIPE_WEBHOOK_SECRET = whsec_...
OPENAI_API_KEY = sk_...
BETTER_AUTH_SECRET = (already in code)
AI_GATEWAY_API_KEY = me8mA010bK6BBTJzTZlNK
AI_GATEWAY_BASE_URL = https://api.runable.com/api/gateway/v1
AUTUMN_SECRET_KEY = am_sk_test_...
```

All these are in your `.env.local`. Just copy them.

## Step 6: Deploy

Click **Save and Deploy**

Cloudflare will:
1. Pull your code from GitHub
2. Run `bun run build`
3. Deploy to `https://your-project.pages.dev`

Takes ~2-3 minutes.

## Step 7: Set Custom Domain (Optional)

1. In Cloudflare Pages project settings
2. Click **Custom domains**
3. Add your domain (e.g., booksprint.com)
4. Follow DNS setup instructions

## Step 8: Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/developers/webhooks)
2. Update webhook endpoint URL:
   - **Before**: http://localhost:6997/api/webhook/stripe
   - **After**: https://your-project.pages.dev/api/webhook/stripe (or your custom domain)
3. Click **Update endpoint**

## Step 9: Verify Deployment

1. Visit your deployed site: https://your-project.pages.dev
2. Sign up with test email
3. Create a book
4. Try subscribing (use test card: 4242 4242 4242 4242)
5. Buy tokens
6. Check Stripe Dashboard → Webhooks → Recent deliveries

## Troubleshooting

**Build fails?**
- Check build logs in Cloudflare Pages dashboard
- Verify `bun run build` works locally first

**Env vars not working?**
- Make sure they're added BEFORE deploy
- Or redeploy after adding vars

**Webhook not working?**
- Verify webhook URL is correct in Stripe
- Check Cloudflare Pages logs
- Check Stripe webhook delivery logs

## What's Deployed

✅ Full BookSprint SaaS platform
✅ All APIs working
✅ Database connected (D1)
✅ Storage connected (R2)
✅ Authentication working
✅ Stripe payments working
✅ Webhooks working

## Next: Monitor

After deployment:
- Watch server logs for errors
- Monitor Stripe webhook deliveries
- Check user signups/conversions
- Monitor token purchases

## Live! 🎉

Your BookSprint platform is now live and accepting customers!

Celebrate 🚀
