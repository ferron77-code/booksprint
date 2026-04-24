# BookSprint Subscription Model

## Plans

### Starter ($19/month)
- Up to 5 PDF books per month
- Access to basic templates
- Built-in storefront (/store/{username})
- Simple UI (no API setup)
- Token usage: Hidden
- Commission: 15% (standard)

### Creator ($39/month)
- Up to 15 PDF books per month
- Premium templates
- Custom storefront branding
- Faster generation
- Token usage: Hidden
- Commission: 15%

### Pro ($79/month)
- Unlimited books (fair usage)
- Bulk generation
- API key connection (optional)
- Advanced storefront features
- Token usage: Visible
- Commission: 15%

### Enterprise (Custom)
- White-label platform
- Team accounts
- Requires user API key
- Custom pricing

## Implementation

### Database Changes
- Add `subscription_tier` to users (starter|creator|pro|enterprise)
- Add `subscription_active` (boolean)
- Add `stripe_subscription_id`
- Add `books_generated_this_month` counter
- Add `storefront_settings` (branding, theme)
- Add `api_key` (for Pro/Enterprise)

### Token Tracking (Backend Only)
- Track tokens used per generation in `generation_logs`
- Do NOT expose to Starter/Creator users
- Show in Pro user dashboard

### Payment Flow
1. User signs up → Stripe checkout for plan
2. Stripe manages recurring billing
3. On generation → Check plan limits
4. On book sale → Split payment (user gets 85%, you get 15%)
5. Automatic payouts via Stripe Connect

### Features to Build
1. Plan selection screen (sign-up)
2. Stripe Checkout for subscriptions
3. Plan limit enforcement (books/month)
4. Storefront customization panel
5. Revenue dashboard
6. Upgrade/downgrade flows
