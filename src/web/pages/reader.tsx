import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { authClient } from "../lib/auth";

interface ReaderData {
  title: string;
  coverUrl?: string | null;
  html: string;
}

// Extract chapters from HTML for tap-to-navigate ToC
function extractChapters(html: string): { id: string; title: string; level: number }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h1, h2, h3");
  const chapters: { id: string; title: string; level: number }[] = [];
  headings.forEach((h, i) => {
    const level = parseInt(h.tagName[1]);
    const id = `heading-${i}`;
    chapters.push({ id, title: h.textContent?.trim() || `Section ${i + 1}`, level });
  });
  return chapters;
}

// Inject IDs onto headings in HTML
function injectHeadingIds(html: string): string {
  let i = 0;
  return html.replace(/<(h[1-3])([^>]*)>/gi, (_match, tag, attrs) => {
    return `<${tag}${attrs} id="heading-${i++}">`;
  });
}

// Strip cover div — shown separately at top of reader
function stripCoverDiv(html: string): string {
  return html.replace(/<div[^>]*class="cover"[^>]*>[\s\S]*?<\/div>/i, "");
}

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const { data: session, isPending } = authClient.useSession();
  const [data, setData] = useState<ReaderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tocOpen, setTocOpen] = useState(false);
  const [chapters, setChapters] = useState<{ id: string; title: string; level: number }[]>([]);
  const [scrollPct, setScrollPct] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bookId || isPending) return;
    if (!session) {
      setError("sign-in");
      setLoading(false);
      return;
    }

    fetch(`/api/reader/${bookId}`)
      .then(r => r.json())
      .then((d: ReaderData & { message?: string }) => {
        if (d.message) {
          setError(d.message);
        } else {
          const processedHtml = injectHeadingIds(d.html);
          setData({ ...d, html: processedHtml });
          setChapters(extractChapters(d.html));
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load book");
        setLoading(false);
      });
  }, [bookId, session, isPending]);

  // Track scroll progress
  useEffect(() => {
    const el = readerRef.current;
    if (!el) return;
    const handler = () => {
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100;
      setScrollPct(Math.min(100, Math.max(0, pct)));
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [data]);

  const scrollToChapter = (id: string) => {
    const el = document.getElementById(id);
    if (el && readerRef.current) {
      readerRef.current.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
    }
    setTocOpen(false);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading || isPending) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#e85d26] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#a09890] text-sm">Loading your book...</p>
        </div>
      </div>
    );
  }

  // ── Auth / error ─────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-[#161616] border border-[#2a2a2a] flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#e85d26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          {error === "sign-in" ? (
            <>
              <p className="font-display text-2xl text-white tracking-wide mb-2">Sign In Required</p>
              <p className="text-[#a09890] text-sm mb-6">You need to be signed in to read this book.</p>
              <Link href="/sign-in" className="bg-[#e85d26] text-white font-semibold px-6 py-3 text-sm inline-block">
                Sign In
              </Link>
            </>
          ) : error === "Purchase required" ? (
            <>
              <p className="font-display text-2xl text-white tracking-wide mb-2">Purchase Required</p>
              <p className="text-[#a09890] text-sm mb-6">Buy this book to read it.</p>
              <Link href={`/book/${bookId}`} className="bg-[#e85d26] text-white font-semibold px-6 py-3 text-sm inline-block">
                View Book
              </Link>
            </>
          ) : (
            <>
              <p className="font-display text-2xl text-white tracking-wide mb-2">Oops</p>
              <p className="text-[#a09890] text-sm mb-6">{error}</p>
              <Link href="/store" className="text-[#e85d26] text-sm">← Store</Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const bodyContent = stripCoverDiv(data.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? data.html);

  return (
    <div className="flex flex-col h-screen bg-[#0e0e0e] overflow-hidden">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 h-12 border-b border-[#1e1e1e] bg-[#0e0e0e] z-30">
        <Link href="/store" className="text-[#a09890] hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <p className="text-white text-sm font-medium truncate max-w-[180px] sm:max-w-xs text-center">
          {data.title}
        </p>

        {/* ToC toggle */}
        <button
          onClick={() => setTocOpen(v => !v)}
          className="text-[#a09890] hover:text-white transition-colors p-1"
          aria-label="Table of contents"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
          </svg>
        </button>
      </header>

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 h-0.5 bg-[#1e1e1e]">
        <div
          className="h-full bg-[#e85d26] transition-all duration-150"
          style={{ width: `${scrollPct}%` }}
        />
      </div>

      {/* ── ToC drawer ───────────────────────────────────────────────── */}
      {tocOpen && (
        <div className="absolute inset-0 z-40 flex" onClick={() => setTocOpen(false)}>
          <div
            className="absolute inset-0 bg-black/60"
          />
          <div
            className="relative ml-auto w-72 max-w-[85vw] h-full bg-[#111] border-l border-[#2a2a2a] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
              <p className="text-xs font-semibold text-[#a09890] uppercase tracking-wider">Contents</p>
              <button onClick={() => setTocOpen(false)} className="text-[#a09890] hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 py-3">
              {chapters.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => scrollToChapter(ch.id)}
                  className={`w-full text-left px-5 py-2.5 text-sm hover:bg-[#1e1e1e] transition-colors ${
                    ch.level === 1 ? "text-white font-semibold" :
                    ch.level === 2 ? "text-[#d0c8c0] pl-8" :
                    "text-[#a09890] pl-12 text-xs"
                  }`}
                >
                  {ch.title}
                </button>
              ))}
              {chapters.length === 0 && (
                <p className="text-[#a09890] text-sm px-5 py-3">No sections found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Scrollable content ───────────────────────────────────────── */}
      <div
        ref={readerRef}
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {/* Cover image — full width on mobile */}
        {data.coverUrl && (
          <div className="w-full max-w-xs mx-auto pt-8 pb-6 px-6">
            <img
              src={data.coverUrl}
              alt={data.title}
              className="w-full rounded shadow-2xl shadow-black/50"
            />
          </div>
        )}

        {/* Title */}
        <div className="px-6 pb-6 text-center">
          <h1 className="font-display text-3xl sm:text-4xl text-white tracking-wide leading-tight">
            {data.title}
          </h1>
        </div>

        {/* Divider */}
        <div className="mx-6 mb-8 h-px bg-[#2a2a2a]" />

        {/* Book content */}
        <div
          ref={contentRef}
          className="reader-content px-6 pb-24 mx-auto max-w-xl"
          dangerouslySetInnerHTML={{ __html: bodyContent }}
        />
      </div>

      {/* ── Embedded reader styles ────────────────────────────────────── */}
      <style>{`
        .reader-content {
          color: #e8e0d8;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 17px;
          line-height: 1.85;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .reader-content h1 {
          font-size: 1.6em;
          font-weight: 700;
          color: #ffffff;
          margin: 2em 0 0.6em;
          line-height: 1.25;
          letter-spacing: 0.01em;
        }
        .reader-content h2 {
          font-size: 1.25em;
          font-weight: 700;
          color: #f5f0eb;
          margin: 1.8em 0 0.5em;
          line-height: 1.3;
        }
        .reader-content h3 {
          font-size: 1.05em;
          font-weight: 700;
          color: #e8e0d8;
          margin: 1.5em 0 0.4em;
        }
        .reader-content p {
          margin: 0 0 1em;
        }
        .reader-content ul, .reader-content ol {
          margin: 0.75em 0 1em;
          padding-left: 1.4em;
        }
        .reader-content li {
          margin: 0.35em 0;
        }
        .reader-content strong {
          color: #ffffff;
          font-weight: 700;
        }
        .reader-content em {
          color: #d0c8c0;
          font-style: italic;
        }
        .reader-content hr {
          border: none;
          border-top: 1px solid #2a2a2a;
          margin: 2em 0;
        }
        .reader-content blockquote {
          border-left: 3px solid #e85d26;
          padding: 0.5em 0 0.5em 1em;
          margin: 1em 0;
          color: #a09890;
          font-style: italic;
        }
        .reader-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1.5em auto;
          border-radius: 4px;
        }
        .reader-content a {
          color: #e85d26;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        /* First h1 gets less top margin since title is shown above */
        .reader-content > h1:first-child {
          margin-top: 0.5em;
        }
      `}</style>
    </div>
  );
}
