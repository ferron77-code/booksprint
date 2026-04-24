import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authClient } from "../lib/auth";

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // better-auth appends ?token=... to the redirectTo URL
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: err } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setLoading(false);
    if (err) {
      setError(err.message || "Reset failed. The link may have expired.");
    } else {
      setDone(true);
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
            NEW
            <br />
            <span className="text-[#e85d26]">PASSWORD.</span>
          </h2>
          <p className="text-[#a09890] text-lg max-w-sm">
            Choose a strong password to keep your account secure.
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

          {!token ? (
            <div>
              <h1 className="text-2xl font-bold text-white mb-3">Invalid link</h1>
              <p className="text-[#a09890] text-sm mb-6">
                This reset link is missing a token. Please request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block bg-[#e85d26] text-white font-semibold px-6 py-3 text-sm hover:bg-[#c94d1e] transition-colors"
              >
                Request New Link
              </Link>
            </div>
          ) : done ? (
            <div>
              <div className="w-12 h-12 bg-[#e85d26]/10 border border-[#e85d26]/30 flex items-center justify-center mb-6">
                <span className="text-[#e85d26] text-xl">✓</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">
                Password updated!
              </h1>
              <p className="text-[#a09890] text-sm mb-8">
                Your password has been reset. You can now sign in with your new
                password.
              </p>
              <button
                onClick={() => navigate("/sign-in")}
                className="bg-[#e85d26] hover:bg-[#c94d1e] text-white font-semibold px-6 py-3 text-sm transition-colors"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">
                Set new password
              </h1>
              <p className="text-[#a09890] text-sm mb-8">
                Must be at least 8 characters.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#a09890] mb-2">
                    New password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#a09890] mb-2">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#e85d26] hover:bg-[#c94d1e] disabled:opacity-50 text-white font-semibold py-3 transition-colors"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
