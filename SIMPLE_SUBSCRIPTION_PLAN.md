# Simple Subscription Implementation

## What We're Adding (Minimal)

1. **Subscription table in DB** — Track which plan each user has
2. **Plan selection at sign-up** — Choose Starter/Creator/Pro
3. **Stripe Checkout for recurring billing** — Monthly charges
4. **Book generation limit check** — Enforce limits on creation
5. **Dashboard shows plan + limit** — "You have 3/5 books this month"
6. **Upgrade/downgrade** — Allow plan changes anytime

## What We're NOT changing

- ✅ Keep shared storefront (books.com/store works for all)
- ✅ Keep 15% commission on sales (auto-splits at Stripe)
- ✅ Keep existing auth flow
- ✅ Keep dashboard mostly the same
- ✅ Keep book creation flow mostly the same

## Files to Create/Modify

1. **Database schema** — Add `subscription` table
2. **API routes** — `/api/subscription/*` endpoints
3. **Sign-up page** — Add plan selection
4. **Dashboard** — Show current plan + usage
5. **Book creation** — Check limits before allowing creation

## Timeline
- Database schema: 15 mins
- API endpoints: 20 mins
- UI (sign-up + dashboard): 30 mins
- Testing: 15 mins
**Total: ~80 minutes**

Ready to go?
