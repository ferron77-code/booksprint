import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authClient } from "../lib/auth";

export default function SignUpPage() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: err } = await authClient.signUp.email({ name, email, password });
    if (err) {
      setError(err.message || "Failed to create account");
      setLoading(false);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-[#2a2a2a] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(circle at 30% 50%, #e85d26, transparent 60%)'
        }} />
        <Link href="/" className="relative flex items-center gap-2">
          <div className="w-8 h-8 bg-[#e85d26] flex items-center justify-center" style={{clipPath: 'polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%)'}}>
            <span className="text-white text-xs font-bold">B</span>
          </div>
          <span className="font-display text-2xl tracking-wider text-white">PDF'S TO GO</span>
        </Link>

        <div className="relative">
          <h2 className="font-display text-6xl text-white tracking-wide leading-none mb-6">
            START<br />
            <span className="text-[#e85d26]">CREATING.</span>
          </h2>
          <div className="space-y-4 max-w-sm">
            {[
              "Enter a keyword — AI does the rest",
              "Get a complete ebook with AI cover art",
              "Publish to the marketplace in one click",
              "Keep 100% of your sales revenue",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-[#e85d26] flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[#a09890] text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[#a09890] text-sm">Free to start. No credit card required.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#e85d26] flex items-center justify-center" style={{clipPath: 'polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%)'}}>
                <span className="text-white text-xs font-bold">B</span>
              </div>
              <span className="font-display text-xl tracking-wider text-white">PDF'S TO GO</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-[#a09890] text-sm mb-8">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-[#e85d26] hover:underline">Sign in</Link>
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#a09890] mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] transition-colors"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a09890] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a09890] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] transition-colors"
                placeholder="Min. 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e85d26] hover:bg-[#c94d1e] disabled:opacity-50 text-white font-semibold py-3 transition-colors"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-[#a09890] text-xs text-center mt-6">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-[#e85d26] hover:underline">Terms of Service</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
