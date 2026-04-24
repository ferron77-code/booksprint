# Download Page Fix - Task Progress

## Issue
`http://localhost:6997/download/:orderId` not working → users couldn't download files after Stripe checkout.

## Root Cause
1. After Stripe redirect, users return to `/download/{cs_...}` (Stripe session ID)
2. The download page calls `/api/orders/verify/:sessionId` which required `authenticatedOnly` middleware
3. Users don't have a valid session yet after redirect → 401 Unauthorized

## Fixes Applied

### 1. Made `/api/orders/verify/:sessionId` public ✅
- **File**: `src/api/routes/orders.ts` (lines 140-170)
- Removed `authenticatedOnly` middleware
- Verifies order exists via Stripe session ID (no user check needed)
- Stripe acts as the authentication mechanism

### 2. Made `/api/orders/download/:orderId/ebook` public ✅
- **File**: `src/api/routes/orders.ts` (lines 222-261)
- Removed user ownership check (UUID acts as token)
- Returns HTML with CSS cleanup for browser viewing

### 3. Added `/api/orders/download/:orderId/word` endpoint ✅
- **File**: `src/api/routes/orders.ts` (lines 263-380)
- Generates .docx file for customers (same logic as editor)
- Public access (UUID acts as token)
- Uses same Word generation as editor route

### 4. Updated download page ✅
- **File**: `src/web/pages/download.tsx` (line 161)
- Changed Word download from `/api/edit/:bookId/download?format=word` → `/api/orders/download/:orderId/word`
- Both HTML and Word buttons now work for customers

### 5. Fixed `/api/edit` route middleware ✅
- **File**: `src/api/routes/edit.ts` (lines 9-11)
- Removed global `authenticatedOnly` middleware
- Added middleware selectively to protected routes (GET /:bookId, PUT, POST /regenerate-cover, POST /upload-cover, POST /export-docx)
- `/api/edit/:bookId/download` remains **protected** (author-only) — used by editors

## Files Modified
- ✅ `src/api/routes/orders.ts` — Removed auth checks, added Word endpoint
- ✅ `src/api/routes/edit.ts` — Moved auth to individual routes
- ✅ `src/web/pages/download.tsx` — Updated Word download URL
- ✅ TypeScript check passed (no errors)
- ✅ Server restarted successfully

## Testing Checklist
- ✅ Verify `/api/orders/verify/:sessionId` is public (returns 404 not 401 for fake ID)
- ✅ Verify `/api/orders/download/:orderId/ebook` is public (returns 404 not 401)
- ✅ Verify `/api/orders/download/:orderId/word` is public (returns 404 not 401)
- ✅ Verify `/api/edit/:bookId` requires auth (returns 401)
- ✅ Verify `/api/edit/:bookId/download` requires auth (returns 401)
- [ ] Test with real Stripe order (integration test needed)
- [ ] Test HTML download actually serves file
- [ ] Test Word download actually serves .docx file

## Known Considerations
- Order UUIDs are long, hard to guess → security by obscurity is acceptable for downloads
- No permission checks on download endpoints (by design) — order ID is the "token"
- Word generation code is duplicated between `/api/edit/:bookId/download` and `/api/orders/download/:orderId/word` (could refactor later)
