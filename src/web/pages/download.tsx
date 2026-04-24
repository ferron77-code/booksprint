import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Navbar } from "../components/Navbar";
import { authClient } from "../lib/auth";

interface DownloadData {
  id: string;
  status: string;
  bookTitle: string;
  coverUrl?: string | null;
  pdfUrl?: string | null;
  valueEnhancerUrl?: string | null;
  bookId?: string;
}

export default function DownloadPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: session } = authClient.useSession();
  const [data, setData] = useState<DownloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId || !session) return;
    
    const endpoint = orderId.startsWith("cs_")
      ? `/api/orders/verify/${orderId}`
      : `/api/orders/download/${orderId}`;

    fetch(endpoint)
      .then(r => r.json())
      .then((d: DownloadData & { message?: string }) => {
        if (d.message) {
          setError(d.message);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load download");
        setLoading(false);
      });
  }, [orderId, session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e]">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-[#e85d26] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#a09890]">Confirming your purchase...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0e0e0e]">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen px-4">
          <div className="text-center">
            <p className="font-display text-3xl sm:text-4xl text-white tracking-wide mb-4">ACCESS DENIED</p>
            <p className="text-[#a09890] mb-6">{error || "Order not found"}</p>
            <Link href="/store" className="text-[#e85d26] hover:underline">← Back to store</Link>
          </div>
        </div>
      </div>
    );
  }

  const bookId = data.bookId || null;

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-12 sm:py-20">

          {/* Success banner */}
          <div className="bg-green-500/10 border border-green-500/30 p-4 sm:p-6 mb-8 flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-white text-sm sm:text-base">Purchase Complete!</p>
              <p className="text-[#a09890] text-xs sm:text-sm">Your files are ready.</p>
            </div>
          </div>

          {/* Book info */}
          <div className="flex gap-4 sm:gap-6 mb-8">
            {data.coverUrl && (
              <div className="w-16 h-22 sm:w-24 sm:h-32 bg-[#161616] border border-[#2a2a2a] overflow-hidden shrink-0" style={{ aspectRatio: "3/4" }}>
                <img src={data.coverUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex flex-col justify-center">
              <h1 className="font-bold text-white text-base sm:text-xl mb-1 leading-snug">{data.bookTitle}</h1>
              <p className="text-[#a09890] text-xs sm:text-sm">Thank you for your purchase.</p>
            </div>
          </div>

          {/* Read Now — mobile CTA */}
          {bookId && (
            <Link
              href={`/read/${bookId}`}
              className="flex items-center justify-between bg-[#e85d26] hover:bg-[#c94d1e] px-5 py-4 mb-4 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <div>
                  <p className="font-semibold text-white text-sm">Read Now</p>
                  <p className="text-orange-200 text-xs">Mobile-optimized reader</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          )}

          {/* Downloads */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#a09890] uppercase tracking-wider mb-4">Downloads</p>

            {data.bookId && (
              <div className="bg-[#161616] border border-[#2a2a2a] overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-[#2a2a2a]">
                  <div className="w-8 h-8 bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-[#e85d26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Main Ebook</p>
                    <p className="text-[#a09890] text-xs">Choose format below</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-[#2a2a2a]">
                  <a
                    href={`/api/orders/download/${orderId}/ebook`}
                    download
                    className="flex flex-col items-center justify-center py-3 px-2 hover:bg-[#1e1e1e] transition-colors"
                  >
                    <span className="text-[#e85d26] font-bold text-xs sm:text-sm mb-0.5">HTML</span>
                    <span className="text-[#a09890] text-xs hidden sm:block">Browser</span>
                  </a>
                  <a
                    href={`/api/orders/download/${orderId}/pdf`}
                    download
                    className="flex flex-col items-center justify-center py-3 px-2 hover:bg-[#1e1e1e] transition-colors"
                  >
                    <span className="text-[#e85d26] font-bold text-xs sm:text-sm mb-0.5">PDF</span>
                    <span className="text-[#a09890] text-xs hidden sm:block">Print</span>
                  </a>
                  <a
                    href={`/api/orders/download/${orderId}/word`}
                    download
                    className="flex flex-col items-center justify-center py-3 px-2 hover:bg-[#1e1e1e] transition-colors"
                  >
                    <span className="text-[#e85d26] font-bold text-xs sm:text-sm mb-0.5">WORD</span>
                    <span className="text-[#a09890] text-xs hidden sm:block">Editable</span>
                  </a>
                </div>
              </div>
            )}

            {data.valueEnhancerUrl && (
              <a
                href={data.valueEnhancerUrl}
                download
                className="flex items-center justify-between bg-[#161616] border border-[#2a2a2a] hover:border-[#e85d26] p-4 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-base">
                    🎁
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Bonus Pack</p>
                    <p className="text-[#a09890] text-xs">Bonuses & value enhancer</p>
                  </div>
                </div>
                <span className="text-[#e85d26] text-sm font-semibold group-hover:translate-x-1 transition-transform">→</span>
              </a>
            )}

            <div className="bg-[#161616] border border-[#2a2a2a] p-4 flex items-start gap-3">
              <svg className="w-4 h-4 text-[#e85d26] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-[#a09890] text-xs sm:text-sm">Download links have also been sent to your email.</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#2a2a2a] flex flex-wrap gap-4 sm:gap-6">
            <Link href="/store" className="text-sm text-[#a09890] hover:text-white transition-colors">
              ← Store
            </Link>
            <Link href="/dashboard" className="text-sm text-[#a09890] hover:text-white transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
