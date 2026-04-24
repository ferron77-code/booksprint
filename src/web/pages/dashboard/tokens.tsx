import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "../../components/Navbar";
import { authClient } from "../../lib/auth";

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  priceInCents: number;
}

interface Subscription {
  tier: string;
  totalAvailableTokens: number;
  tokensRemainingThisMonth: number;
  purchasedTokens: number;
}

export default function TokenShopPage() {
  const { data: session, isPending } = authClient.useSession();
  const [, navigate] = useLocation();
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) navigate("/sign-in");
  }, [session, isPending]);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch("/api/subscriptions/tokens/packages").then(r => r.json()),
      fetch("/api/subscriptions/current").then(r => r.json()),
    ])
      .then(([pkgs, sub]) => {
        setPackages(pkgs);
        setSubscription(sub);
      });
  }, [session]);

  const handlePurchase = async (packageId: string) => {
    if (!session) return;
    setSelectedPackage(packageId);
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/subscriptions/tokens/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });

      if (!res.ok) {
        const { message } = await res.json();
        setError(message || "Checkout failed");
        setSelectedPackage(null);
        return;
      }

      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      setError("Purchase failed. Please try again.");
      setSelectedPackage(null);
    } finally {
      setLoading(false);
    }
  };

  if (isPending) return null;

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-display text-5xl text-white tracking-wide mb-4">Token Shop</h1>
            <p className="text-[#a09890] text-lg">Buy tokens to create more books beyond your monthly allowance</p>
          </div>

          {/* Current Token Info */}
          {subscription && (
            <div className="bg-[#161616] border border-[#2a2a2a] p-6 mb-12">
              <div className="grid sm:grid-cols-3 gap-8">
                <div>
                  <p className="text-[#a09890] text-sm uppercase tracking-wider mb-2">Monthly Allowance</p>
                  <p className="font-display text-3xl text-[#e85d26]">{subscription.tokensRemainingThisMonth.toLocaleString()}</p>
                  <p className="text-xs text-[#a09890] mt-1">tokens remaining this month</p>
                </div>
                <div>
                  <p className="text-[#a09890] text-sm uppercase tracking-wider mb-2">Purchased Tokens</p>
                  <p className="font-display text-3xl text-[#e85d26]">{subscription.purchasedTokens.toLocaleString()}</p>
                  <p className="text-xs text-[#a09890] mt-1">from previous purchases</p>
                </div>
                <div>
                  <p className="text-[#a09890] text-sm uppercase tracking-wider mb-2">Total Available</p>
                  <p className="font-display text-3xl text-[#e85d26]">{subscription.totalAvailableTokens.toLocaleString()}</p>
                  <p className="text-xs text-[#a09890] mt-1">ready to use</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Token Packages */}
          <div className="mb-12">
            <h2 className="font-bold text-white text-2xl mb-6">Available Packages</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-[#161616] border border-[#2a2a2a] hover:border-[#e85d26]/50 transition-colors overflow-hidden flex flex-col"
                >
                  {/* Package Info */}
                  <div className="p-6 pb-4">
                    <h3 className="font-semibold text-white text-lg mb-2">{pkg.name}</h3>
                    <p className="text-4xl font-display text-[#e85d26] mb-1">
                      {(pkg.tokens / 1000).toLocaleString()}K
                    </p>
                    <p className="text-sm text-[#a09890] mb-4">tokens</p>
                    
                    {/* Price */}
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="font-display text-2xl text-white">
                        ${(pkg.priceInCents / 100).toFixed(2)}
                      </span>
                      <span className="text-xs text-[#a09890]">one-time</span>
                    </div>

                    {/* Value Message */}
                    <p className="text-xs text-[#a09890] mb-6">
                      {(pkg.tokens / 50000).toFixed(1)} additional books
                    </p>

                    {/* Buy Button */}
                    <button
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={loading && selectedPackage === pkg.id}
                      className={`w-full py-3 font-semibold transition-colors ${
                        selectedPackage === pkg.id && loading
                          ? "bg-[#666] text-white cursor-not-allowed"
                          : "bg-[#e85d26] hover:bg-[#c94d1e] text-white"
                      }`}
                    >
                      {selectedPackage === pkg.id && loading ? "Processing..." : "Buy Now"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div className="max-w-2xl">
            <h3 className="font-bold text-white text-lg mb-6">How Tokens Work</h3>
            <div className="space-y-4 text-sm text-[#a09890]">
              <p>
                <span className="font-semibold text-white">Each book costs 50,000 tokens</span> to generate.
              </p>
              <p>
                Your <span className="font-semibold text-white">{subscription?.tier} plan</span> includes a monthly allowance. Once you use it up, you can buy tokens to keep creating.
              </p>
              <p>
                Purchased tokens never expire and carry over month to month. Your monthly allowance resets on the first of each month.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
