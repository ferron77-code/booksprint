import { Link, useLocation } from "wouter";
import { authClient } from "../lib/auth";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const { data: session } = authClient.useSession();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#2a2a2a] bg-[#0e0e0e]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#e85d26] flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="font-display text-xl tracking-wider text-white">PDF'S TO GO</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/store" className={`text-sm font-medium transition-colors hover:text-[#e85d26] ${location === '/store' ? 'text-[#e85d26]' : 'text-[#a09890]'}`}>
              Store
            </Link>
            {session && (
              <Link href="/dashboard" className={`text-sm font-medium transition-colors hover:text-[#e85d26] ${location.startsWith('/dashboard') ? 'text-[#e85d26]' : 'text-[#a09890]'}`}>
                Dashboard
              </Link>
            )}
            {session && (session.user as { role?: string })?.role === "admin" && (
              <Link href="/admin" className={`text-sm font-medium transition-colors hover:text-[#e85d26] ${location === '/admin' ? 'text-[#e85d26]' : 'text-[#a09890]'}`}>
                Admin
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            {session ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#a09890]">{session.user.name}</span>
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-[#a09890] hover:text-[#f5f0eb] transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm font-medium text-[#a09890] hover:text-[#f5f0eb] transition-colors">
                  Sign in
                </Link>
                <Link href="/sign-up" className="bg-[#e85d26] hover:bg-[#c94d1e] text-white text-sm font-semibold px-4 py-2 transition-colors">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-[#a09890] hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#2a2a2a] py-4 space-y-3">
            <Link href="/store" onClick={() => setMenuOpen(false)} className="block text-sm text-[#a09890] hover:text-white py-1">Store</Link>
            {session && <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block text-sm text-[#a09890] hover:text-white py-1">Dashboard</Link>}
            {session ? (
              <button onClick={handleSignOut} className="block text-sm text-[#a09890] hover:text-white py-1">Sign out</button>
            ) : (
              <>
                <Link href="/sign-in" onClick={() => setMenuOpen(false)} className="block text-sm text-[#a09890] hover:text-white py-1">Sign in</Link>
                <Link href="/sign-up" onClick={() => setMenuOpen(false)} className="block text-sm text-[#e85d26] font-semibold py-1">Get Started</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
