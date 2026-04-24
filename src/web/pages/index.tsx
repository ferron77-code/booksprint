import { Link } from "wouter";
import { Navbar } from "../components/Navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />

      {/* Hero */}
      <section className="pt-16 min-h-screen flex items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, #e85d26 0%, transparent 50%), radial-gradient(circle at 80% 20%, #e85d26 0%, transparent 40%)`
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 border border-[#e85d26]/30 bg-[#e85d26]/10 px-3 py-1 mb-8">
                <span className="w-2 h-2 bg-[#e85d26] rounded-full animate-pulse" />
                <span className="text-[#e85d26] text-xs font-semibold uppercase tracking-widest">AI-Powered PDF Books</span>
              </div>

              <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl text-white leading-none mb-6 tracking-wide">
                TYPE A TOPIC.<br />
                <span className="text-[#e85d26]">GET A PDF.</span><br />
                SELL IT.
              </h1>

              <p className="text-[#a09890] text-lg leading-relaxed mb-10 max-w-lg">
                PDF's To Go turns any idea into a complete, professional PDF book in minutes — ready to sell instantly on our marketplace.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/sign-up" className="bg-[#e85d26] hover:bg-[#c94d1e] text-white font-semibold px-8 py-4 text-center transition-colors inline-flex items-center justify-center gap-2">
                  Create Your First PDF
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link href="/store" className="border border-[#2a2a2a] hover:border-[#e85d26] text-[#f5f0eb] font-semibold px-8 py-4 text-center transition-colors">
                  Browse the Store
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-8 mt-12 pt-8 border-t border-[#2a2a2a]">
                <div>
                  <p className="font-display text-3xl text-[#e85d26] tracking-wide">AI</p>
                  <p className="text-[#a09890] text-xs uppercase tracking-wider mt-1">Writes It For You</p>
                </div>
                <div>
                  <p className="font-display text-3xl text-[#e85d26] tracking-wide">PDF</p>
                  <p className="text-[#a09890] text-xs uppercase tracking-wider mt-1">Instant Download</p>
                </div>
                <div>
                  <p className="font-display text-3xl text-[#e85d26] tracking-wide">100%</p>
                  <p className="text-[#a09890] text-xs uppercase tracking-wider mt-1">Your Revenue</p>
                </div>
              </div>
            </div>

            {/* Right — steps */}
            <div className="hidden lg:block">
              <div className="space-y-4">
                {[
                  { num: "01", title: "Describe your topic", desc: "Type a rough idea. Our AI enhances your prompt and shows you a preview before generating." },
                  { num: "02", title: "Choose your length", desc: "Short guide, medium report, or a full-length book — you pick how deep to go." },
                  { num: "03", title: "AI builds your PDF", desc: "Full content written, formatted, and cover designed. Ready in minutes." },
                  { num: "04", title: "Publish & get paid", desc: "List it on the store, set your price. Buyers download instantly, you keep the revenue." },
                ].map((step) => (
                  <div key={step.num} className="flex gap-4 p-5 bg-[#161616] border border-[#2a2a2a] hover:border-[#e85d26]/30 transition-colors group">
                    <span className="font-display text-2xl text-[#e85d26] opacity-60 group-hover:opacity-100 transition-opacity w-10 shrink-0">{step.num}</span>
                    <div>
                      <p className="font-semibold text-white text-sm mb-1">{step.title}</p>
                      <p className="text-[#a09890] text-sm">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-[#e85d26] text-xs font-semibold uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="font-display text-5xl text-white tracking-wide">FROM IDEA TO <span className="text-[#e85d26]">INCOME</span></h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: "AI-Enhanced Prompts",
                desc: "You give us a rough topic. Our AI rewrites it into a detailed, optimized prompt and shows you before it runs."
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Real PDF Books",
                desc: "Not just a one-pager. Choose short, medium, or full length. AI writes structured chapters with proper formatting."
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: "Built-In Marketplace",
                desc: "Your PDF goes straight to our store. Buyers find it, pay, and download instantly. You earn on every sale."
              },
            ].map((item, i) => (
              <div key={i} className="bg-[#161616] border border-[#2a2a2a] p-8 hover:border-[#e85d26]/40 transition-colors group">
                <div className="text-[#e85d26] mb-5 group-hover:scale-110 transition-transform origin-left">{item.icon}</div>
                <h3 className="font-semibold text-white text-lg mb-3">{item.title}</h3>
                <p className="text-[#a09890] text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-[#2a2a2a]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-display text-5xl sm:text-6xl text-white tracking-wide mb-6">
            YOUR FIRST PDF<br />
            <span className="text-[#e85d26]">IS FREE.</span>
          </h2>
          <p className="text-[#a09890] text-lg mb-4">
            Sign up, create your first PDF book, and list it on the store — no upfront cost.
          </p>
          <p className="text-[#a09890] text-sm mb-10">Already have books? <Link href="/store" className="text-[#e85d26] hover:underline">Browse the store →</Link></p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up" className="bg-[#e85d26] hover:bg-[#c94d1e] text-white font-semibold px-10 py-4 text-lg transition-colors">
              Start Creating Free
            </Link>
            <Link href="/store" className="border border-[#2a2a2a] hover:border-[#e85d26] text-white font-semibold px-10 py-4 text-lg transition-colors">
              Browse Store
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-lg text-[#a09890] tracking-wider">PDF'S TO GO</span>
          <div className="flex items-center gap-4">
            <p className="text-[#a09890] text-sm">© 2024 Into All The World Digital Products.</p>
            <Link href="/terms" className="text-[#a09890] text-sm hover:text-[#e85d26] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
