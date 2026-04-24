# Token System Implementation Plan

## Changes to Make

### 1. Database Schema
- Add `token_balance` to users (integer)
- Add `token_packages` table (for purchase packages)
- Add `token_transactions` table (for audit log)

### 2. Subscription Updates
- Add `monthly_token_allowance` to subscriptions:
  - Starter: 150,000 tokens
  - Creator: 500,000 tokens
  - Pro: 2,000,000 tokens
- Track `tokens_used_this_month` (resets monthly)
- Add `available_tokens` (allowance - used + purchased)

### 3. Token Deduction Logic
- When generating book (in `/api/generate/start`):
  - Check `available_tokens >= 50000`
  - If yes: Generate, deduct 50k from balance
  - If no: Return 402 "Insufficient tokens" + upgrade link

### 4. Stripe Integration
- Create token package checkout (`/api/tokens/checkout`)
- Stripe webhook adds tokens on payment success
- Log transaction with timestamp

### 5. UI Components
- Dashboard: Show token balance + usage
- Generation page: Show token cost before generating
- Error message: "Tokens running low, buy more"
- Token shop: `/dashboard/tokens` with packages

## Timeline
- Database: 10 mins
- API endpoints: 20 mins
- Generate integration: 10 mins
- UI: 30 mins
- Testing: 10 mins
**Total: ~80 minutes**

Ready?
