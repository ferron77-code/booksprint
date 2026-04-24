import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "../../components/Navbar";
import { authClient } from "../../lib/auth";


interface Book {
  id: string;
  title: string;
  status: string;
  price: number;
  salesCount: number;
  coverUrl?: string | null;
  category?: string | null;
  createdAt: string | number;
}

function CoverCell({ book, onRegenerated }: { book: Book; onRegenerated: (id: string, url: string) => void }) {
  const [regen, setRegen] = useState(false);
  const [err, setErr] = useState(false);
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);

  const handleRegen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (regen) return;
    setRegen(true);
    setErr(false);
    try {
      const res = await fetch(`/api/edit/${book.id}/regenerate-cover`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { coverUrl } = await res.json() as { coverUrl: string };
      onRegenerated(book.id, coverUrl);
    } catch {
      setErr(true);
    } finally {
      setRegen(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!book.coverUrl) return;
    const a = document.createElement("a");
    a.href = book.coverUrl;
    a.download = `${book.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-cover.png`;
    a.target = "_blank";
    a.click();
  };

  const handleUpload = async (file: File) => {
    const form = new FormData();
    form.append("cover", file);
    try {
      const res = await fetch(`/api/edit/${book.id}/upload-cover`, { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const { coverUrl } = await res.json() as { coverUrl: string };
      onRegenerated(book.id, coverUrl);
    } catch {
      setErr(true);
    }
  };

  return (
    <>
      {/* Fixed-position enlarged preview — escapes all overflow containers */}
      {preview && book.coverUrl && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: preview.x + 16, top: preview.y - 80 }}
        >
          <div className="w-40 shadow-2xl shadow-black/80 border border-[#3a3a3a]">
            <img src={book.coverUrl} alt="" className="w-full h-auto block" />
          </div>
        </div>
      )}

    <div
      className="w-10 h-14 bg-[#1e1e1e] shrink-0 overflow-hidden relative group"
      onMouseEnter={e => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPreview({ x: rect.right, y: rect.top + rect.height / 2 });
      }}
      onMouseLeave={() => setPreview(null)}
    >
      {book.coverUrl ? (
        <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-lg">📖</div>
      )}

      {/* Hover overlay with action buttons */}
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5">
        {/* Regenerate */}
        <button
          onClick={handleRegen}
          disabled={regen}
          title="Regenerate cover"
          className="w-6 h-6 flex items-center justify-center bg-[#e85d26] hover:bg-[#c94d1e] disabled:opacity-50 transition-colors"
        >
          {regen ? (
            <svg className="w-2.5 h-2.5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>

        {/* Download */}
        {book.coverUrl && (
          <button
            onClick={handleDownload}
            title="Download cover"
            className="w-6 h-6 flex items-center justify-center bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors"
          >
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}

        {/* Upload */}
        <label
          title="Upload custom cover"
          className="w-6 h-6 flex items-center justify-center bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors cursor-pointer"
          onClick={e => e.stopPropagation()}
        >
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {err && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-[8px] text-center py-0.5">
          Failed
        </div>
      )}
    </div>
    </>
  );
}

export default function MyBooksPage() {
  const { data: session, isPending } = authClient.useSession();
  const [, navigate] = useLocation();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);




  const handleCoverRegenerated = (id: string, url: string) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, coverUrl: url } : b));
  };

  useEffect(() => {
    if (!isPending && !session) navigate("/sign-in");
  }, [session, isPending]);

  const fetchBooks = () => {
    fetch("/api/books/seller/mine")
      .then(r => r.json())
      .then((data: Book[]) => {
        setBooks(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (session) fetchBooks();
  }, [session]);

  const handleTogglePublish = async (book: Book) => {
    if (book.status === "published") {
      await fetch(`/api/books/${book.id}/unpublish`, { method: "POST" });
      fetchBooks();
    } else {
      navigate(`/dashboard/publish/${book.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this book?")) return;
    await fetch(`/api/books/${id}`, { method: "DELETE" });
    fetchBooks();
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 text-sm text-[#a09890] mb-3">
                <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
                <span>/</span>
                <span className="text-white">My Books</span>
              </div>
              <h1 className="font-display text-5xl text-white tracking-wide">MY <span className="text-[#e85d26]">BOOKS</span></h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/upload-book" className="border border-[#2a2a2a] hover:border-[#e85d26] text-[#a09890] hover:text-white font-semibold px-5 py-3 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Book
              </Link>
              <Link href="/dashboard/create" className="bg-[#e85d26] hover:bg-[#c94d1e] text-white font-semibold px-5 py-3 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Book
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-[#161616] border border-[#2a2a2a] animate-pulse" />
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-[#2a2a2a]">
              <p className="font-display text-4xl text-[#2a2a2a] tracking-wide mb-3">NO BOOKS YET</p>
              <p className="text-[#a09890] text-sm mb-6">Create your first ebook with AI.</p>
              <Link href="/dashboard/create" className="bg-[#e85d26] text-white font-semibold px-6 py-3">
                Create Book
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden border border-[#2a2a2a]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3">Book</th>
                    <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Status</th>
                    <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3 hidden md:table-cell">Price</th>
                    <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3 hidden md:table-cell">Sales</th>
                    <th className="text-right text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {books.map(book => (
                    <tr key={book.id} className="hover:bg-[#161616] transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <CoverCell book={book} onRegenerated={handleCoverRegenerated} />
                          <div>
                            <p className="font-semibold text-white text-sm">{book.title}</p>
                            {book.category && <p className="text-[#a09890] text-xs">{book.category}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className={`text-xs font-semibold px-2 py-1 uppercase tracking-wider ${
                          book.status === "published" ? "bg-green-500/20 text-green-400" :
                          book.status === "generating" ? "bg-[#e85d26]/20 text-[#e85d26]" :
                          "bg-[#2a2a2a] text-[#a09890]"
                        }`}>
                          {book.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-white text-sm">${book.price.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-[#a09890] text-sm">{book.salesCount}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/dashboard/edit/${book.id}`} className="text-xs text-[#a09890] hover:text-white transition-colors">
                            {book.status === "published" ? "Edit / Replace" : "Edit"}
                          </Link>
                          {/* Download HTML */}
                          <a
                            href={`/api/edit/${book.id}/download?format=pdf`}
                            download
                            title="Download HTML ebook"
                            className="text-xs text-[#a09890] hover:text-white transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            HTML
                          </a>
                          {/* Download Word */}
                          <a
                            href={`/api/edit/${book.id}/download?format=word`}
                            download
                            title="Download Word doc"
                            className="text-xs text-[#a09890] hover:text-white transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Word
                          </a>
                          {(book.status === "draft" || book.status === "unpublished") && (
                            <Link href={`/dashboard/publish/${book.id}`} className="text-xs text-[#e85d26] hover:underline">
                              Publish
                            </Link>
                          )}
                          {book.status === "published" && (
                            <button
                              onClick={() => handleTogglePublish(book)}
                              className="text-xs text-[#a09890] hover:text-white transition-colors"
                            >
                              Unpublish
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(book.id)}
                            className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
