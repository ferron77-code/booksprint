import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "../../components/Navbar";
import { authClient } from "../../lib/auth";

interface Plan {
  tier: string;
  name: string;
  price: number;
  books: number;
  features: string[];
}

const PLANS: Plan[] = [
  {
    tier: "starter",
    name: "Starter",
    price: 19,
    books: 5,
    features: ["Up to 5 books/month", "Basic templates", "Built-in storefront", "Email support"],
  },
  {
    tier: "creator",
    name: "Creator",
    price: 39,
    books: 15,
    features: ["Up to 15 books/month", "Premium templates", "Custom branding", "Faster generation", "Priority support"],
  },
  {
    tier: "pro",
    name: "Pro",
    price: 79,
    books: 999,
    features: ["Unlimited books", "All templates", "Advanced analytics", "API access (optional)", "24/7 support"],
  },
];

export default function UpgradePage() {
  const { data: session, isPending } = authClient.useSession();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) navigate("/sign-in");
  }, [session, isPending]);

  const handleSelectPlan = async (tier: string) => {
    if (!session) return;
    setSelectedPlan(tier);
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) {
        const { message } = await res.json();
        setError(message || "Failed to start checkout");
        setSelectedPlan(null);
        return;
      }

      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      setError("Checkout failed. Please try again.");
      setSelectedPlan(null);
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
          <div className="text-center mb-16">
            <h1 className="font-display text-4xl sm:text-5xl text-white tracking-wide mb-4">
              Choose Your Plan
            </h1>
            <p className="text-[#a09890] text-lg max-w-2xl mx-auto">
              Select the perfect plan to start creating and selling books
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {PLANS.map((plan) => (
              <div
                key={plan.tier}
                className="bg-[#161616] border border-[#2a2a2a] hover:border-[#e85d26]/50 transition-colors overflow-hidden flex flex-col"
              >
                {/* Plan Header */}
                <div className="p-8 pb-6">
                  <h2 className="font-display text-2xl text-white tracking-wide mb-2">
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="font-display text-4xl text-[#e85d26]">${plan.price}</span>
                    <span className="text-[#a09890] text-sm">/month</span>
                  </div>
                  <p className="text-sm text-[#a09890] mb-6">
                    {plan.books === 999 ? "Unlimited" : plan.books} books per month
                  </p>
                  <button
                    onClick={() => handleSelectPlan(plan.tier)}
                    disabled={loading && selectedPlan === plan.tier}
                    className={`w-full py-3 font-semibold transition-colors ${
                      selectedPlan === plan.tier && loading
                        ? "bg-[#666] text-white cursor-not-allowed"
                        : "bg-[#e85d26] hover:bg-[#c94d1e] text-white"
                    }`}
                  >
                    {selectedPlan === plan.tier && loading ? "Processing..." : "Select Plan"}
                  </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#2a2a2a]" />

                {/* Features */}
                <div className="p-8 flex-1">
                  <ul className="space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-[#e85d26] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-[#a09890]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h3 className="font-bold text-white text-xl mb-6">Frequently Asked Questions</h3>
            <div className="space-y-6">
              {[
                { q: "Can I upgrade or downgrade anytime?", a: "Yes, you can change your plan at any time. Changes take effect on your next billing cycle." },
                { q: "Is there a free trial?", a: "New users start with a Starter plan. You can upgrade or cancel anytime." },
                { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards through Stripe." },
                { q: "Do I keep my books if I downgrade?", a: "Yes, all your published books stay live. You just won't be able to create new ones until you upgrade again." },
              ].map((item) => (
                <div key={item.q} className="border-b border-[#2a2a2a] pb-4 last:border-b-0">
                  <p className="font-semibold text-white mb-2">{item.q}</p>
                  <p className="text-sm text-[#a09890]">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
