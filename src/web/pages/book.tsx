import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { Navbar } from "../components/Navbar";
import { authClient } from "../lib/auth";

function stripMarkdown(text: string): string {
  return text
    .replace(/•\s*\*\*[^*]+\*\*:?\s*/g, " ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/---+/g, " ")
    .replace(/^[•–—]\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

interface Book {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  coverUrl?: string | null;
  category?: string | null;
  salesCount?: number;
  keyword?: string;
  offer?: string | null;
}

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: session } = authClient.useSession();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");
  const [emailDelivery, setEmailDelivery] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/books/${id}`)
      .then(r => r.json())
      .then((data: Book) => { setBook(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleBuy = async () => {
    if (!session) { navigate("/sign-in"); return; }
    setBuying(true);
    setError("");
    try {
      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: id }),
      });
      const data = await res.json() as { checkoutUrl?: string; orderId?: string; mode?: string; message?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.orderId) {
        navigate(`/download/${data.orderId}`);
      } else {
        setError(data.message || "Something went wrong");
        setBuying(false);
      }
    } catch {
      setError("Failed to initiate checkout");
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e]">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-[#e85d26] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#0e0e0e]">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen px-4">
          <div className="text-center">
            <p className="font-display text-3xl sm:text-4xl text-white tracking-wide mb-4">BOOK NOT FOUND</p>
            <Link href="/store" className="text-[#e85d26] hover:underline text-sm">← Back to store</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#a09890] mb-6 sm:mb-10">
            <Link href="/store" className="hover:text-white transition-colors">Store</Link>
            <span>/</span>
            <span className="text-[#f5f0eb] truncate max-w-[200px] sm:max-w-none">{book.title}</span>
          </div>

          {/* Mobile: stack cover + details. Desktop: side-by-side */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">

            {/* Cover */}
            <div className="max-w-xs mx-auto w-full lg:max-w-none">
              <div className="aspect-[3/4] bg-[#161616] border border-[#2a2a2a] overflow-hidden">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 sm:p-12">
                    <div className="w-12 sm:w-16 h-1 bg-[#e85d26] mb-4 sm:mb-6" />
                    <p className="font-display text-2xl sm:text-3xl text-center text-white leading-tight tracking-wider">{book.title}</p>
                    <div className="w-12 sm:w-16 h-1 bg-[#e85d26] mt-4 sm:mt-6" />
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col justify-center">
              {book.category && (
                <span className="inline-block bg-[#e85d26] text-white text-xs font-semibold px-3 py-1 uppercase tracking-wider w-fit mb-3 sm:mb-4">
                  {book.category}
                </span>
              )}

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white tracking-wide leading-tight mb-3 sm:mb-4">
                {book.title}
              </h1>

              {book.description && (
                <p className="text-[#a09890] leading-relaxed mb-6 sm:mb-8 text-sm sm:text-base">
                  {stripMarkdown(book.description)}
                </p>
              )}

              {/* What's included */}
              <div className="bg-[#161616] border border-[#2a2a2a] p-4 sm:p-6 mb-6 sm:mb-8">
                <p className="text-xs font-semibold text-[#a09890] uppercase tracking-wider mb-3 sm:mb-4">What's Included</p>
                <div className="space-y-2 sm:space-y-3">
                  {[
                    "Complete AI-written ebook (PDF)",
                    "Professional AI-designed cover",
                    "Mobile reader access",
                    "Instant digital download",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#e85d26] flex items-center justify-center shrink-0">
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-xs sm:text-sm text-[#f5f0eb]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
                <span className="font-display text-4xl sm:text-5xl text-[#e85d26] tracking-wide">
                  {book.price === 0 ? "FREE" : `$${book.price.toFixed(2)}`}
                </span>
                {book.salesCount ? (
                  <span className="text-[#a09890] text-sm">{book.salesCount} sold</span>
                ) : null}
              </div>

              {/* Email toggle */}
              <div className="flex items-center justify-between bg-[#161616] border border-[#2a2a2a] px-4 py-3 mb-4">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-white">Email me the download links</p>
                  <p className="text-xs text-[#a09890]">Get a copy in your inbox</p>
                </div>
                <button
                  onClick={() => setEmailDelivery(!emailDelivery)}
                  className={`relative w-10 sm:w-11 h-5 sm:h-6 rounded-full transition-colors shrink-0 ${emailDelivery ? "bg-[#e85d26]" : "bg-[#2a2a2a]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full transition-transform ${emailDelivery ? "translate-x-4 sm:translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleBuy}
                disabled={buying}
                className="bg-[#e85d26] hover:bg-[#c94d1e] disabled:opacity-50 text-white font-semibold px-6 py-4 text-base sm:text-lg transition-colors flex items-center justify-center gap-2 w-full min-h-[52px]"
              >
                {buying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {book.price === 0 ? "Get Free Book" : "Buy Now"}
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
