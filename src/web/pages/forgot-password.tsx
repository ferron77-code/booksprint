import { useState } from "react";
import { Link } from "wouter";
import { authClient } from "../lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: err } = await authClient.forgetPassword({
      email,
      redirectTo: "/reset-password",
    });

    setLoading(false);
    if (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-[#2a2a2a] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(circle at 30% 50%, #e85d26, transparent 60%)",
          }}
        />
        <Link href="/" className="relative flex items-center gap-2">
          <div
            className="w-8 h-8 bg-[#e85d26] flex items-center justify-center"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%)" }}
          >
            <span className="text-white text-xs font-bold">B</span>
          </div>
          <span className="font-display text-2xl tracking-wider text-white">
            PDF'S TO GO
          </span>
        </Link>

        <div className="relative">
          <h2 className="font-display text-6xl text-white tracking-wide leading-none mb-6">
            FORGOT
            <br />
            <span className="text-[#e85d26]">PASSWORD?</span>
          </h2>
          <p className="text-[#a09890] text-lg max-w-sm">
            No worries — enter your email and we'll send a reset link right away.
          </p>
        </div>

        <p className="relative text-[#a09890] text-sm">
          "Turn any keyword into a best-seller in minutes."
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div
                className="w-7 h-7 bg-[#e85d26] flex items-center justify-center"
                style={{ clipPath: "polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%)" }}
              >
                <span className="text-white text-xs font-bold">B</span>
              </div>
              <span className="font-display text-xl tracking-wider text-white">
                PDF'S TO GO
              </span>
            </Link>
          </div>

          {sent ? (
            <div>
              <div className="w-12 h-12 bg-[#e85d26]/10 border border-[#e85d26]/30 flex items-center justify-center mb-6">
                <span className="text-[#e85d26] text-xl">✓</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Check your inbox</h1>
              <p className="text-[#a09890] text-sm mb-8">
                We sent a password reset link to{" "}
                <span className="text-white">{email}</span>. The link expires in 1
                hour.
              </p>
              <p className="text-[#a09890] text-sm">
                Didn't get it?{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-[#e85d26] hover:underline"
                >
                  Try again
                </button>{" "}
                or{" "}
                <Link href="/sign-in" className="text-[#e85d26] hover:underline">
                  back to sign in
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">
                Reset your password
              </h1>
              <p className="text-[#a09890] text-sm mb-8">
                Remember it?{" "}
                <Link
                  href="/sign-in"
                  className="text-[#e85d26] hover:underline"
                >
                  Sign in
                </Link>
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#a09890] mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#e85d26] hover:bg-[#c94d1e] disabled:opacity-50 text-white font-semibold py-3 transition-colors"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
