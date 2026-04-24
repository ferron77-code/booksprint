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
  createdAt: string | number;
}

interface Subscription {
  tier: string;
  monthlyLimit: number;
  booksUsedThisMonth: number;
  booksRemainingThisMonth: number;
  active: boolean;
}

export default function DashboardPage() {
  const { data: session, isPending } = authClient.useSession();
  const [, navigate] = useLocation();
  const [books, setBooks] = useState<Book[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) navigate("/sign-in");
  }, [session, isPending]);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch("/api/books/seller/mine").then(r => r.json()),
      fetch("/api/subscriptions/current").then(r => r.json()),
    ])
      .then(([booksData, subData]) => {
        setBooks(booksData);
        setSubscription(subData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  const publishedBooks = books.filter(b => b.status === "published");
  const totalRevenue = publishedBooks.reduce((sum, b) => sum + (b.price * b.salesCount), 0);
  const totalSales = books.reduce((sum, b) => sum + b.salesCount, 0);

  if (isPending) return null;

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-4">
            <div>
              <h1 className="font-display text-5xl text-white tracking-wide">
                DASHBOARD
              </h1>
              <p className="text-[#a09890] mt-1">Welcome back, {session?.user.name}</p>
            </div>
            <Link
              href="/dashboard/create"
              className="bg-[#e85d26] hover:bg-[#c94d1e] text-white font-semibold px-6 py-3 transition-colors flex items-center gap-2 w-fit"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Book
            </Link>
          </div>

          {/* Subscription Banner */}
          {subscription && (
            <div className={`mb-8 p-4 sm:p-6 border rounded-lg flex items-center justify-between gap-4 ${
              subscription.booksRemainingThisMonth === 0
                ? "bg-red-500/10 border-red-500/30"
                : "bg-blue-500/10 border-blue-500/30"
            }`}>
              <div className="flex-1">
                <p className="font-semibold text-white mb-1">
                  {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
                </p>
                <p className="text-sm text-[#a09890]">
                  {subscription.booksRemainingThisMonth > 0
                    ? `${subscription.booksRemainingThisMonth} of ${subscription.monthlyLimit} books remaining this month`
                    : `Monthly limit reached (${subscription.monthlyLimit} books)`}
                </p>
              </div>
              {subscription.booksRemainingThisMonth === 0 && (
                <Link
                  href="/dashboard/upgrade"
                  className="bg-[#e85d26] hover:bg-[#c94d1e] text-white text-sm font-semibold px-4 py-2 transition-colors"
                >
                  Upgrade Plan
                </Link>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              { label: "Total Books", value: books.length, suffix: "" },
              { label: "Published", value: publishedBooks.length, suffix: "" },
              { label: "Total Sales", value: totalSales, suffix: "" },
              { label: "Est. Revenue", value: `$${totalRevenue.toFixed(0)}`, suffix: "" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#161616] border border-[#2a2a2a] p-6">
                <p className="text-[#a09890] text-xs uppercase tracking-wider mb-2">{stat.label}</p>
                <p className="font-display text-4xl text-[#e85d26] tracking-wide">{stat.value}{stat.suffix}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {[
              {
                href: "/dashboard/create",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: "AI Book Creator",
                desc: "Generate a complete ebook from any keyword",
              },
              {
                href: "/dashboard/books",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ),
                title: "My Books",
                desc: "Manage and publish your ebook library",
              },
              {
                href: "/store",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: "View Store",
                desc: "Browse the marketplace as a buyer",
              },
            ].map(action => (
              <Link key={action.href} href={action.href}>
                <div className="bg-[#161616] border border-[#2a2a2a] hover:border-[#e85d26]/50 p-6 transition-colors group cursor-pointer">
                  <div className="text-[#e85d26] mb-3 group-hover:scale-110 transition-transform w-fit">{action.icon}</div>
                  <p className="font-semibold text-white mb-1">{action.title}</p>
                  <p className="text-[#a09890] text-sm">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Recent Books */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-white text-lg">Recent Books</h2>
              <Link href="/dashboard/books" className="text-sm text-[#a09890] hover:text-[#e85d26] transition-colors">
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-[#161616] border border-[#2a2a2a] animate-pulse" />
                ))}
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-[#2a2a2a]">
                <p className="font-display text-3xl text-[#2a2a2a] tracking-wide mb-2">NO BOOKS YET</p>
                <p className="text-[#a09890] text-sm mb-6">Create your first AI-generated ebook to get started.</p>
                <Link href="/dashboard/create" className="bg-[#e85d26] hover:bg-[#c94d1e] text-white font-semibold px-6 py-3 transition-colors inline-block">
                  Create First Book
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {books.slice(0, 5).map(book => (
                  <div key={book.id} className="flex items-center gap-4 bg-[#161616] border border-[#2a2a2a] p-4 hover:border-[#e85d26]/30 transition-colors">
                    <div className="w-12 h-16 bg-[#1e1e1e] shrink-0 overflow-hidden">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[#e85d26] text-lg">📖</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{book.title}</p>
                      <p className="text-[#a09890] text-xs mt-0.5">{book.salesCount} sales · ${book.price}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 uppercase tracking-wider ${
                      book.status === "published" ? "bg-green-500/20 text-green-400" :
                      book.status === "generating" ? "bg-[#e85d26]/20 text-[#e85d26]" :
                      "bg-[#2a2a2a] text-[#a09890]"
                    }`}>
                      {book.status}
                    </span>
                    {book.status === "draft" && (
                      <Link href={`/dashboard/publish/${book.id}`} className="text-xs text-[#e85d26] hover:underline whitespace-nowrap ml-2">
                        Publish →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
