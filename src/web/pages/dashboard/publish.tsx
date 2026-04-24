import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { Navbar } from "../../components/Navbar";
import { authClient } from "../../lib/auth";

const CATEGORIES = ["Business", "Health", "Education", "Finance", "Fitness", "Marketing", "Technology", "Self-Help", "Other"];

interface Book {
  id: string;
  title: string;
  status: string;
  price: number;
  coverUrl?: string | null;
  category?: string | null;
  description?: string | null;
  pdfUrl?: string | null;
}

export default function PublishPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isPending } = authClient.useSession();
  const [, navigate] = useLocation();
  const [book, setBook] = useState<Book | null>(null);
  const [price, setPrice] = useState("9.97");
  const [category, setCategory] = useState("Business");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPending && !session) navigate("/sign-in");
  }, [session, isPending]);

  useEffect(() => {
    if (!id || !session) return;
    // Fetch from seller's books
    fetch("/api/books/seller/mine")
      .then(r => r.json())
      .then((data: Book[]) => {
        const found = data.find(b => b.id === id);
        if (found) {
          setBook(found);
          setPrice(found.price?.toString() || "9.97");
          setCategory(found.category || "Business");
        }
      });
  }, [id, session]);

  const handlePublish = async () => {
    if (!book) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/books/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: parseFloat(price), category }),
    });

    if (res.ok) {
      navigate("/dashboard/books");
    } else {
      const data = await res.json() as { message?: string };
      setError(data.message || "Failed to publish");
      setLoading(false);
    }
  };

  if (!book) {
    return (
      <div className="min-h-screen bg-[#0e0e0e]">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-[#e85d26] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center gap-2 text-sm text-[#a09890] mb-8">
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/books" className="hover:text-white">My Books</Link>
            <span>/</span>
            <span className="text-white">Publish</span>
          </div>

          <h1 className="font-display text-5xl text-white tracking-wide mb-10">
            PUBLISH <span className="text-[#e85d26]">BOOK</span>
          </h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Preview */}
            <div>
              <div className="aspect-[3/4] bg-[#161616] border border-[#2a2a2a] overflow-hidden mb-4">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8">
                    <div className="w-10 h-1 bg-[#e85d26] mb-4" />
                    <p className="font-display text-xl text-center text-white tracking-wide">{book.title}</p>
                    <div className="w-10 h-1 bg-[#e85d26] mt-4" />
                  </div>
                )}
              </div>
              <p className="font-semibold text-white text-sm">{book.title}</p>
              {book.pdfUrl && (
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  PDF ready for download
                </p>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#a09890] mb-2">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] appearance-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#a09890] mb-2">Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a09890]">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white pl-8 pr-4 py-3 text-sm focus:outline-none focus:border-[#e85d26]"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {["4.97", "9.97", "14.97", "19.97", "27"].map(p => (
                    <button
                      key={p}
                      onClick={() => setPrice(p)}
                      className={`text-xs px-2 py-1 border transition-colors ${
                        price === p ? "border-[#e85d26] text-[#e85d26]" : "border-[#2a2a2a] text-[#a09890] hover:border-[#e85d26]"
                      }`}
                    >
                      ${p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview listing */}
              <div className="bg-[#161616] border border-[#2a2a2a] p-4">
                <p className="text-xs text-[#a09890] uppercase tracking-wider mb-3">Store Listing Preview</p>
                <p className="text-white font-semibold text-sm mb-1">{book.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#a09890]">{category}</span>
                  <span className="text-[#e85d26] font-bold">${parseFloat(price || "0").toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
                  {error}
                </div>
              )}

              <button
                onClick={handlePublish}
                disabled={loading}
                className="w-full bg-[#e85d26] hover:bg-[#c94d1e] disabled:opacity-50 text-white font-semibold py-4 transition-colors"
              >
                {loading ? "Publishing..." : "Publish to Store"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
