import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "../components/Navbar";
import { authClient } from "../lib/auth";

interface Stats {
  totalBooks: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string | number;
}

interface Book {
  id: string;
  title: string;
  status: string;
  price: number;
  salesCount: number;
}

interface Order {
  id: string;
  amount: number;
  status: string;
  createdAt: string | number;
  bookTitle: string;
}

export default function AdminPage() {
  const { data: session, isPending } = authClient.useSession();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"overview" | "books" | "users" | "orders">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending) {
      const user = session?.user as { role?: string } | undefined;
      if (!session || user?.role !== "admin") {
        navigate("/dashboard");
      }
    }
  }, [session, isPending]);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch("/api/admin/stats").then(r => r.json()),
      fetch("/api/admin/users").then(r => r.json()),
      fetch("/api/admin/books").then(r => r.json()),
      fetch("/api/admin/orders").then(r => r.json()),
    ]).then(([s, u, b, o]) => {
      setStats(s);
      setUsers(u);
      setBooks(b);
      setOrders(o);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [session]);

  const handleRoleChange = async (userId: string, role: string) => {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm("Delete this book?")) return;
    await fetch(`/api/admin/books/${bookId}`, { method: "DELETE" });
    setBooks(prev => prev.filter(b => b.id !== bookId));
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-10">
            <h1 className="font-display text-5xl text-white tracking-wide">
              ADMIN <span className="text-[#e85d26]">PANEL</span>
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 border-b border-[#2a2a2a]">
            {(["overview", "books", "users", "orders"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t 
                    ? "border-[#e85d26] text-[#e85d26]" 
                    : "border-transparent text-[#a09890] hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-[#161616] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Overview */}
              {tab === "overview" && stats && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Total Books", value: stats.totalBooks },
                      { label: "Total Orders", value: stats.totalOrders },
                      { label: "Total Users", value: stats.totalUsers },
                      { label: "Total Revenue", value: `$${Number(stats.totalRevenue || 0).toFixed(2)}` },
                    ].map(s => (
                      <div key={s.label} className="bg-[#161616] border border-[#2a2a2a] p-6">
                        <p className="text-[#a09890] text-xs uppercase tracking-wider mb-2">{s.label}</p>
                        <p className="font-display text-4xl text-[#e85d26] tracking-wide">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-[#161616] border border-[#2a2a2a] p-6">
                      <p className="font-semibold text-white mb-4">Recent Books</p>
                      <div className="space-y-2">
                        {books.slice(0, 5).map(b => (
                          <div key={b.id} className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0">
                            <span className="text-sm text-white truncate max-w-xs">{b.title}</span>
                            <span className={`text-xs ${b.status === "published" ? "text-green-400" : "text-[#a09890]"}`}>{b.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#161616] border border-[#2a2a2a] p-6">
                      <p className="font-semibold text-white mb-4">Recent Orders</p>
                      <div className="space-y-2">
                        {orders.slice(0, 5).map(o => (
                          <div key={o.id} className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0">
                            <span className="text-sm text-white truncate max-w-xs">{o.bookTitle}</span>
                            <span className="text-sm text-[#e85d26] font-semibold">${o.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Books */}
              {tab === "books" && (
                <div className="overflow-hidden border border-[#2a2a2a]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2a2a2a]">
                        <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3">Title</th>
                        <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Status</th>
                        <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3 hidden md:table-cell">Price</th>
                        <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3 hidden md:table-cell">Sales</th>
                        <th className="text-right text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2a2a]">
                      {books.map(b => (
                        <tr key={b.id} className="hover:bg-[#161616] transition-colors">
                          <td className="px-4 py-3 text-sm text-white">{b.title}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className={`text-xs px-2 py-1 ${b.status === "published" ? "text-green-400 bg-green-500/10" : "text-[#a09890] bg-[#1e1e1e]"}`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#a09890] hidden md:table-cell">${b.price}</td>
                          <td className="px-4 py-3 text-sm text-[#a09890] hidden md:table-cell">{b.salesCount}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleDeleteBook(b.id)} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Users */}
              {tab === "users" && (
                <div className="overflow-hidden border border-[#2a2a2a]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2a2a2a]">
                        <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3">Name</th>
                        <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Email</th>
                        <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2a2a]">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-[#161616] transition-colors">
                          <td className="px-4 py-3 text-sm text-white">{u.name}</td>
                          <td className="px-4 py-3 text-sm text-[#a09890] hidden sm:table-cell">{u.email}</td>
                          <td className="px-4 py-3">
                            <select
                              value={u.role}
                              onChange={e => handleRoleChange(u.id, e.target.value)}
                              className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs px-2 py-1 focus:outline-none focus:border-[#e85d26]"
                            >
                              <option value="buyer">Buyer</option>
                              <option value="seller">Seller</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Orders */}
              {tab === "orders" && (
                <div className="overflow-hidden border border-[#2a2a2a]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2a2a2a]">
                        <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3">Book</th>
                        <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Status</th>
                        <th className="text-left text-xs font-semibold text-[#a09890] uppercase tracking-wider px-4 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2a2a]">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-[#161616] transition-colors">
                          <td className="px-4 py-3 text-sm text-white">{o.bookTitle}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className={`text-xs px-2 py-1 ${o.status === "completed" ? "text-green-400 bg-green-500/10" : "text-[#a09890] bg-[#1e1e1e]"}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#e85d26] font-semibold">${o.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
