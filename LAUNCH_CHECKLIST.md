# 🚀 BookSprint Launch Checklist

## Pre-Launch (Do These Now)

- [ ] **Create GitHub account** if you don't have one
- [ ] **Create GitHub repo** named `booksprint`
- [ ] **Push code to GitHub**:
  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/booksprint.git
  git branch -M main
  git push -u origin main
  ```

## Cloudflare Deployment (10 minutes)

- [ ] Go to Cloudflare Dashboard
- [ ] Create Pages project
- [ ] Connect GitHub repo
- [ ] Set build command: `bun run build`
- [ ] Set build output: `dist`
- [ ] Add environment variables (copy from `.env.local`):
  - STRIPE_PUBLIC_KEY
  - STRIPE_SECRET_KEY
  - STRIPE_WEBHOOK_SECRET
  - OPENAI_API_KEY
  - AI_GATEWAY_API_KEY
  - AI_GATEWAY_BASE_URL
  - AUTUMN_SECRET_KEY
  - BETTER_AUTH_SECRET
- [ ] Deploy

## Post-Deployment (5 minutes)

- [ ] Get your live URL (e.g., `https://booksprint.pages.dev`)
- [ ] Update Stripe webhook URL in Dashboard:
  - Go to Developers → Webhooks
  - Find `/api/webhook/stripe` endpoint
  - Update URL to your live site
- [ ] Visit your live site and verify it loads
- [ ] Sign up with test account

## Test Everything

- [ ] Sign up → Works?
- [ ] Sign in → Works?
- [ ] Create book → Works?
- [ ] Generate book → Works?
- [ ] Publish book → Works?
- [ ] Browse store → Works?
- [ ] Subscribe to plan (test card: 4242 4242 4242 4242) → Works?
- [ ] Buy tokens → Works?
- [ ] Check Stripe webhook deliveries → Success?

## Optional: Custom Domain

- [ ] Buy domain (or use existing)
- [ ] Add to Cloudflare Pages custom domain settings
- [ ] Update Stripe webhook URL to custom domain
- [ ] Test again

## Launch Announcement

Once verified, you're live! Consider:

- [ ] Tweet about launch
- [ ] Post on Product Hunt
- [ ] Email your list
- [ ] Share on relevant forums/communities

## Monitor Post-Launch

- [ ] Watch Cloudflare Pages logs
- [ ] Monitor Stripe transactions
- [ ] Check user signups
- [ ] Monitor token purchases
- [ ] Check webhook deliveries
- [ ] Respond to support emails

## Success Metrics (First Month)

Aim for:
- 10+ signups
- 2+ paid subscriptions ($38+/month recurring)
- 1+ token purchase ($10+)
- 0 webhook failures

If you hit these, scale marketing!

## Revenue Per Month (Projections)

```
Month 1 (10 users): $50-100
Month 2 (25 users): $150-300
Month 3 (50 users): $400-800
Month 6 (150 users): $2,000-4,000
Year 1 (500 users): $10,000-25,000/month
```

## Troubleshooting Quick Ref

**Site won't load?**
- Check Cloudflare Pages build logs
- Verify env vars are set

**Payments not working?**
- Check Stripe test/live mode
- Verify webhook URL correct
- Check Stripe dashboard logs

**Books not generating?**
- Check OpenAI API key is valid
- Check API quota/limits
- Check server logs

**Tokens not adding?**
- Check webhook URL is correct
- Check Stripe webhook deliveries
- Verify webhook secret is right

---

# 🎉 You're Ready to Launch!

Everything is built, tested, and ready.

The only thing between you and revenue is:
1. Push to GitHub
2. Connect Cloudflare Pages
3. Add env vars
4. Deploy
5. Test
6. Tell people about it

**Estimated time to live**: 20 minutes

Let's go! 🚀
