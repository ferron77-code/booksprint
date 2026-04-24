# BookSprint Build Task

## Status: COMPLETE ✅

## Completed
- [x] website_init
- [x] DB schema (users, sessions, accounts, verifications, books, orders, generationJobs)
- [x] DB migration applied
- [x] auth.ts (better-auth)
- [x] .dev.vars with OpenAI key
- [x] design.md

## In Progress
- [ ] API routes (auth, books, generate, orders, admin)
- [ ] Frontend pages

## TODO

### Backend (src/api/)
- [ ] middleware/authentication.ts
- [ ] routes/books.ts — CRUD for books
- [ ] routes/generate.ts — AI pipeline (keyword → pains → offer → title → outline → cover → content → PDF)
- [ ] routes/orders.ts — Stripe checkout + webhook + download
- [ ] routes/admin.ts — admin dashboard data
- [ ] index.ts — wire all routes

### Frontend (src/web/)
- [ ] styles.css — dark theme, orange accent, Bebas Neue + DM Sans
- [ ] lib/auth.ts — authClient
- [ ] pages/index.tsx — storefront hero + featured books
- [ ] pages/store.tsx — browse all books
- [ ] pages/book/[id].tsx — book detail + buy
- [ ] pages/sign-in.tsx
- [ ] pages/sign-up.tsx
- [ ] pages/dashboard/index.tsx — seller dashboard
- [ ] pages/dashboard/create.tsx — AI book creator
- [ ] pages/dashboard/books.tsx — my books
- [ ] pages/download/[orderId].tsx — download page after purchase
- [ ] pages/admin.tsx — admin panel
- [ ] components/Navbar.tsx
- [ ] components/BookCard.tsx
- [ ] app.tsx — routes

## Key Design Decisions
- Dark #0e0e0e bg, orange #e85d26 accent
- Bebas Neue for display, DM Sans for body
- AI pipeline is server-side streaming with SSE
- PDF generated via html-to-pdf (puppeteer or html2pdf via API)
- Cover image via OpenAI gpt-image-1
- Store books/PDFs in R2 bucket
