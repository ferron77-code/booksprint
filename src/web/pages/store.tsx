import { useEffect, useState } from "react";
import { Navbar } from "../components/Navbar";
import { BookCard } from "../components/BookCard";

interface Book {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  coverUrl?: string | null;
  category?: string | null;
  salesCount?: number;
  keyword?: string;
}

const CATEGORIES = ["All", "Business", "Health", "Education", "Finance", "Fitness", "Marketing", "Technology", "Self-Help"];

export default function StorePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    fetch("/api/books")
      .then(r => r.json())
      .then((data: Book[]) => { setBooks(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = books.filter(b => {
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase()) || (b.keyword || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || b.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />
      <div className="pt-16">

        {/* Header */}
        <div className="border-b border-[#2a2a2a] py-10 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-[#e85d26] text-xs font-semibold uppercase tracking-widest mb-2">Digital Marketplace</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white tracking-wide mb-5 sm:mb-6">
              ALL <span className="text-[#e85d26]">BOOKS</span>
            </h1>
            {/* Search */}
            <div className="relative max-w-xl">
              <input
                type="text"
                placeholder="Search books..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#161616] border border-[#2a2a2a] text-white px-4 sm:px-5 py-3 sm:py-4 pr-12 text-sm focus:outline-none focus:border-[#e85d26] transition-colors"
              />
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#a09890]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">

          {/* Category filter — horizontal scroll chips on mobile, vertical sidebar on desktop */}
          <div className="lg:hidden mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors whitespace-nowrap ${
                    category === cat
                      ? "bg-[#e85d26] border-[#e85d26] text-white"
                      : "bg-transparent border-[#2a2a2a] text-[#a09890] hover:border-[#e85d26] hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-10">
            {/* Sidebar — desktop only */}
            <aside className="hidden lg:block w-48 shrink-0">
              <p className="text-xs font-semibold text-[#a09890] uppercase tracking-wider mb-4">Category</p>
              <div className="space-y-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                      category === cat
                        ? "text-[#e85d26] bg-[#e85d26]/10 border-l-2 border-[#e85d26]"
                        : "text-[#a09890] hover:text-white border-l-2 border-transparent"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </aside>

            {/* Grid */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-[#161616] border border-[#2a2a2a] animate-pulse">
                      <div className="aspect-[3/4] bg-[#1e1e1e]" />
                      <div className="p-3 sm:p-4 space-y-2">
                        <div className="h-3 sm:h-4 bg-[#1e1e1e] rounded" />
                        <div className="h-2 sm:h-3 bg-[#1e1e1e] rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 sm:py-24">
                  <p className="font-display text-2xl sm:text-3xl text-[#2a2a2a] tracking-wide mb-2">NO BOOKS FOUND</p>
                  <p className="text-[#a09890] text-sm">Try a different search or category.</p>
                </div>
              ) : (
                <>
                  <p className="text-[#a09890] text-xs sm:text-sm mb-4 sm:mb-6">
                    {filtered.length} book{filtered.length !== 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {filtered.map(book => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
