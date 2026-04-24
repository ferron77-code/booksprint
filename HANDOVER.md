# BookSprint — Handover Document

**Last Updated**: April 24, 2026  
**Dev Server**: Running on port 6997 (`tmux session: port_6997`)  
**Status**: ✅ Download page redesigned, APIs verified, ready for testing

## RECENT CHANGES (This Session)

### Download Page Redesign (/src/web/pages/download.tsx)
- Replaced single HTML button with **2-column grid layout**
- Grid now shows both **HTML** and **WORD** format options
- Grid CSS: `grid grid-cols-2 divide-x divide-[#2a2a2a]` (lines 147-165)
- HTML button: `/api/orders/download/${orderId}/ebook` (downloads clean HTML)
- Word button: `/api/edit/${data.bookId}/download?format=word` (downloads editable .docx)

### API Endpoints Status
✅ **HTML Endpoint** (`/api/orders/download/:orderId/ebook`)
- Location: `src/api/routes/orders.ts` line 213
- Returns: Clean HTML with CSS rules applied (700px max-width, centered, 40px padding)
- Strips conflicting CSS from stored HTML

✅ **Word Endpoint** (`/api/edit/:bookId/download?format=word`)
- Location: `src/api/routes/edit.ts` line 150
- Returns: DOCX with embedded cover image + formatted content
- Extracts base64 cover from HTML, embeds Google Fonts, proper margins

### Build Status
- **TypeScript**: ✅ No errors
- **Vite Build**: ✅ Success (client: 763.34 KB, gzip: 238.92 KB)
- **Bundle Verification**: ✅ grid-cols-2 and both endpoints confirmed in compiled JS

## PREVIOUS WORK (From Handover)

### Font System (Completed)
- 6-font picker in editor: Georgia, Merriweather, Palatino, Source Serif 4, Lato, Open Sans
- Google Fonts link injected into saved HTML
- Body CSS uses dynamic `${fontFamily}` variable
- Published books show yellow "This book is published" warning banner
- Font saved per-book, persists across downloads

### HTML/Word Download System (Completed)
- Stored HTML includes cover as base64 data URL
- HTML downloads strip PDF-specific CSS, apply browser-friendly styles
- Word downloads embed cover image + formatted body content
- Both formats center text for readability

### Previous Files Modified
- `src/web/pages/download.tsx` — Download page UI (just updated this session)
- `src/web/pages/dashboard/edit.tsx` — Font picker + published banner
- `src/web/pages/dashboard/books.tsx` — Replaced PDF button with HTML download
- `src/api/routes/edit.ts` — Word download endpoint + cover transformation
- `src/api/routes/orders.ts` — HTML ebook endpoint
- `src/api/routes/generate.ts` — Body margin CSS in HTML builder

## KNOWN ISSUES

1. **Old books**: Pre-font-picker books still have Georgia hardcoded. Will use Georgia as fallback on first save.
2. **PDF rendering**: `/api/edit/:bookId/download?format=pdf` endpoint returns HTML (not rendered PDF). Old PDF buttons removed. Can add back if needed.
3. **Word cover transform**: Fixed to use pixels (576×864) instead of EMU, not yet tested in actual Word download.

## TESTING CHECKLIST

- [ ] Navigate to `/download/:orderId` with valid order ID
- [ ] Verify 2-button grid renders (HTML and WORD side-by-side)
- [ ] Click HTML button → download .html file
- [ ] Open HTML in browser → verify margins (700px max), cover displays, fonts render
- [ ] Click WORD button → download .docx file
- [ ] Open DOCX in Word/Google Docs → verify cover + content + formatting
- [ ] Test with published book → verify yellow banner shows in editor
- [ ] Test font persistence → set font, save, download both formats
- [ ] Test edge cases → special chars in title, long content, old pre-font books

## HOW TO PROCEED

### To Test Immediately
1. Get a valid order ID from the database or create a test order
2. Navigate to `http://localhost:6997/download/:orderId`
3. Click each button and verify downloads work

### To Deploy
1. Run `npx tsc --noEmit` to verify no TS errors
2. Run `bun run build` to create production bundle
3. Run `bun deploy` (pushes to Cloudflare Workers + D1 + R2)

### To Debug
1. Dev server logs: `tmux capture-pane -t port_6997 -p`
2. Restart server: `tmux kill-session -t port_6997 2>/dev/null; cd /home/user/booksprint && tmux new -d -s port_6997 'bun dev --port 6997'`
3. Check TypeScript: `npx tsc --noEmit`

## FILE STRUCTURE
```
/home/user/booksprint/
├── src/
│   ├── web/pages/
│   │   ├── download.tsx ← Download page (2-button grid, just updated)
│   │   ├── dashboard/
│   │   │   ├── edit.tsx ← Font picker + published banner
│   │   │   └── books.tsx ← HTML download button
│   ├── api/routes/
│   │   ├── orders.ts ← HTML ebook endpoint
│   │   ├── edit.ts ← Word endpoint + cover transform
│   │   └── generate.ts ← Ebook HTML builder
├── dist/ ← Compiled output (last built April 24)
├── package.json
├── wrangler.toml ← Cloudflare config
└── HANDOVER.md ← This file
```

## ENVIRONMENT

- **Node**: v24
- **Runtime**: Cloudflare Workers (wrangler)
- **Database**: D1 (SQLite)
- **Storage**: R2 (S3-compatible)
- **Dev Server**: Vite + Node.js on port 6997
- **Auth**: Custom JWT via `authClient`

## QUESTIONS FOR NEXT SESSION

1. Ready to test the download buttons with real order data?
2. Should we prioritize Word format testing first (since user said "only consistent" format)?
3. Any other download formats needed (epub, mobi, pdf)?
4. Should old pre-font books auto-migrate to a default font, or keep Georgia as fallback?

---

**Start Next Session With**: Test the `/download` page by clicking both buttons and verifying downloads work correctly.
