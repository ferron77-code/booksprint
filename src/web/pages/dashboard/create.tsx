import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "../../components/Navbar";
import { authClient } from "../../lib/auth";

const STEPS = [
  { id: "brainstorming", label: "Analyzing Pains" },
  { id: "solutions", label: "Generating Solutions" },
  { id: "offer", label: "Crafting Offer" },
  { id: "title", label: "Creating Title" },
  { id: "outline", label: "Building Outline" },
  { id: "cover", label: "Designing Cover" },
  { id: "writing", label: "Writing Content" },
  { id: "bonuses", label: "Creating Bonuses" },
  { id: "pdf", label: "Generating Files" },
];

type BookLength = "short" | "medium";

const LENGTH_OPTIONS: { value: BookLength; label: string; words: string }[] = [
  { value: "short", label: "Short Guide", words: "~3,000 words" },
  { value: "medium", label: "Medium Report", words: "~8,000 words" },
];

interface GenerationResult {
  bookId: string;
  title: string;
  coverUrl: string;
  offer: string;
  bonuses: Array<{ name: string; format: string; benefit: string }>;
  oto: { name: string; price: number; description: string };
}

export default function CreateBookPage() {
  const { data: session, isPending } = authClient.useSession();
  const [, navigate] = useLocation();

  const [prompt, setPrompt] = useState("");
  const [length, setLength] = useState<BookLength>("medium");

  // Enhance state
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<"original" | "enhanced">("original");
  const [enhanceError, setEnhanceError] = useState("");

  // Generation state
  const [status, setStatus] = useState<"idle" | "starting" | "generating" | "done" | "error">("idle");
  const [currentStep, setCurrentStep] = useState("");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState("");
  const [bookId, setBookId] = useState("");
  const [stepMessages, setStepMessages] = useState<string[]>([]);
  const [regenCover, setRegenCover] = useState(false);
  const [liveCoverUrl, setLiveCoverUrl] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPending && !session) navigate("/sign-in");
  }, [session, isPending]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [stepMessages]);

  const handleEnhance = async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    setEnhanceError("");
    setShowEnhanced(false);
    setEnhancedPrompt("");
    try {
      const res = await fetch("/api/generate/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: prompt.trim(), length }),
      });
      const data = await res.json() as { enhancedPrompt?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error || "Enhancement failed");
      setEnhancedPrompt(data.enhancedPrompt!);
      setShowEnhanced(true);
      setSelectedPrompt("enhanced");
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : "Failed to enhance");
    } finally {
      setEnhancing(false);
    }
  };

  const startGeneration = async (finalPrompt: string) => {
    setStatus("starting");
    setError("");
    setCompletedSteps(new Set());
    setCurrentStep("");
    setStepMessages([]);
    setResult(null);

    try {
      const startRes = await fetch("/api/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: finalPrompt, originalTopic: prompt, length }),
      });

      const { bookId: newBookId } = await startRes.json() as { bookId: string; jobId: string };
      setBookId(newBookId);
      setStatus("generating");

      const es = new EventSource(`/api/generate/stream/${newBookId}`);

      es.addEventListener("step", (e) => {
        const data = JSON.parse(e.data) as { step: string; message: string };
        setCurrentStep(data.step);
        setStepMessages(prev => [...prev, `→ ${data.message}`]);
      });

      es.addEventListener("progress", (e) => {
        const data = JSON.parse(e.data) as { step: string; done: boolean; data?: { title?: string } };
        if (data.done) {
          setCompletedSteps(prev => new Set([...prev, data.step]));
          if (data.data?.title) setStepMessages(prev => [...prev, `✓ Title: "${data.data?.title}"`]);
        }
      });

      es.addEventListener("done", (e) => {
        setResult(JSON.parse(e.data) as GenerationResult);
        setStatus("done");
        es.close();
      });

      es.addEventListener("error", (e) => {
        const data = JSON.parse((e as MessageEvent).data || '{}') as { message?: string };
        setError(data.message || "Generation failed");
        setStatus("error");
        es.close();
      });

      es.onerror = () => es.close();

    } catch {
      setError("Failed to start generation");
      setStatus("error");
    }
  };

  const handleRegenCover = async () => {
    if (!bookId || regenCover) return;
    setRegenCover(true);
    try {
      const res = await fetch(`/api/edit/${bookId}/regenerate-cover`, { method: "POST" });
      const data = await res.json() as { coverUrl?: string };
      if (data.coverUrl) setLiveCoverUrl(data.coverUrl);
    } catch {
      // silent fail — cover stays as-is
    } finally {
      setRegenCover(false);
    }
  };

  const handleGenerate = () => {
    const finalPrompt = selectedPrompt === "enhanced" && enhancedPrompt ? enhancedPrompt : prompt;
    startGeneration(finalPrompt.trim());
  };

  const reset = () => {
    setStatus("idle");
    setPrompt("");
    setEnhancedPrompt("");
    setShowEnhanced(false);
    setSelectedPrompt("original");
    setResult(null);
    setCompletedSteps(new Set());
    setError("");
    setLiveCoverUrl("");
  };

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const activePrompt = selectedPrompt === "enhanced" && enhancedPrompt ? enhancedPrompt : prompt;

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 text-sm text-[#a09890] mb-4">
              <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-[#f5f0eb]">Create PDF</span>
            </div>
            <h1 className="font-display text-5xl text-white tracking-wide mb-2">
              CREATE A <span className="text-[#e85d26]">PDF BOOK</span>
            </h1>
            <p className="text-[#a09890]">Type your prompt and generate — or let AI sharpen it first.</p>
          </div>

          {/* ── INPUT STAGE ── */}
          {status === "idle" && (
            <div className="space-y-5">

              {/* Prompt input */}
              <div className="bg-[#161616] border border-[#2a2a2a] p-6">
                <label className="block text-xs font-semibold text-[#a09890] uppercase tracking-wider mb-3">Your Prompt</label>
                <textarea
                  value={prompt}
                  onChange={e => {
                    setPrompt(e.target.value);
                    // Reset enhance panel if they edit
                    if (showEnhanced) { setShowEnhanced(false); setSelectedPrompt("original"); }
                  }}
                  rows={4}
                  placeholder="e.g. how to get better sleep, or a detailed prompt you already have..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] transition-colors resize-none leading-relaxed"
                />

                {/* Enhance panel */}
                {showEnhanced && enhancedPrompt && (
                  <div className="mt-4 border-t border-[#2a2a2a] pt-4 space-y-3">
                    <p className="text-xs font-semibold text-[#a09890] uppercase tracking-wider flex items-center gap-2">
                      <span className="text-[#e85d26]">✦</span> AI Enhanced — edit or use as-is:
                    </p>

                    {/* Toggle row */}
                    <div className="flex gap-2">
                      {(["original", "enhanced"] as const).map(opt => (
                        <button
                          key={opt}
                          onClick={() => setSelectedPrompt(opt)}
                          className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                            selectedPrompt === opt
                              ? "border-[#e85d26] bg-[#e85d26]/10 text-[#e85d26]"
                              : "border-[#2a2a2a] text-[#a09890] hover:border-[#e85d26]/40 hover:text-white"
                          }`}
                        >
                          {selectedPrompt === opt ? "✓ " : ""}{opt === "original" ? "Original" : "AI Enhanced"}
                        </button>
                      ))}
                    </div>

                    {/* Full editable prompt — whichever is selected */}
                    {selectedPrompt === "original" ? (
                      <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        rows={6}
                        className="w-full bg-[#1a1a1a] border border-[#e85d26]/40 text-[#f5f0eb] px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] transition-colors resize-y leading-relaxed"
                      />
                    ) : (
                      <textarea
                        value={enhancedPrompt}
                        onChange={e => setEnhancedPrompt(e.target.value)}
                        rows={8}
                        className="w-full bg-[#1a1a1a] border border-[#e85d26]/40 text-[#f5f0eb] px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] transition-colors resize-y leading-relaxed"
                      />
                    )}
                    <p className="text-[#a09890] text-xs">Edit directly above — your changes will be used for generation.</p>
                  </div>
                )}

                {enhanceError && <p className="text-red-400 text-xs mt-3">{enhanceError}</p>}
              </div>

              {/* Length */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#a09890] uppercase tracking-wider shrink-0">Length:</span>
                <div className="flex gap-2">
                  {LENGTH_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setLength(opt.value)}
                      className={`px-4 py-2 border text-sm transition-colors ${
                        length === opt.value
                          ? "border-[#e85d26] bg-[#e85d26]/10 text-white"
                          : "border-[#2a2a2a] text-[#a09890] hover:border-[#e85d26]/40 hover:text-white"
                      }`}
                    >
                      {opt.label} <span className="text-xs opacity-60 ml-1">{opt.words}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleEnhance}
                  disabled={!prompt.trim() || enhancing}
                  className="flex items-center gap-2 border border-[#2a2a2a] hover:border-[#e85d26]/60 disabled:opacity-40 text-[#a09890] hover:text-white text-sm font-medium px-5 py-3 transition-colors"
                >
                  {enhancing ? (
                    <div className="w-3.5 h-3.5 border-2 border-[#a09890] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-[#e85d26]">✦</span>
                  )}
                  {enhancing ? "Enhancing..." : showEnhanced ? "Re-enhance" : "Enhance with AI"}
                </button>

                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="flex-1 bg-[#e85d26] hover:bg-[#c94d1e] disabled:opacity-40 text-white font-semibold py-3 transition-colors flex items-center justify-center gap-2"
                >
                  Generate PDF
                  {selectedPrompt === "enhanced" && enhancedPrompt && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-sm">AI Enhanced</span>
                  )}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {/* ── GENERATING ── */}
          {(status === "generating" || status === "starting") && (
            <div className="space-y-5">
              <div className="bg-[#161616] border border-[#2a2a2a] p-8">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-white font-semibold">Generating your PDF...</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#e85d26] rounded-full animate-pulse" />
                    <span className="text-[#a09890] text-sm">AI working</span>
                  </div>
                </div>

                <div className="w-full bg-[#1a1a1a] h-1 mb-6 overflow-hidden">
                  <div
                    className="h-full bg-[#e85d26] transition-all duration-500"
                    style={{ width: `${Math.round((completedSteps.size / STEPS.length) * 100)}%` }}
                  />
                </div>

                <div className="space-y-2">
                  {STEPS.map((step, i) => {
                    const isDone = completedSteps.has(step.id);
                    const isActive = currentStep === step.id;
                    const isPast = currentStepIndex > i;
                    return (
                      <div key={step.id} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                        isActive ? "bg-[#e85d26]/10 border-l-2 border-[#e85d26]" :
                        isDone || isPast ? "opacity-50" : "opacity-25"
                      }`}>
                        <div className={`w-6 h-6 flex items-center justify-center border text-xs shrink-0 ${
                          isDone || isPast ? "bg-[#e85d26] border-[#e85d26] text-white" :
                          isActive ? "border-[#e85d26] text-[#e85d26]" :
                          "border-[#2a2a2a] text-[#a09890]"
                        }`}>
                          {isDone || isPast ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isActive ? (
                            <div className="w-1.5 h-1.5 bg-[#e85d26] rounded-full animate-pulse" />
                          ) : i + 1}
                        </div>
                        <span className={`text-sm ${isActive ? "text-white font-medium" : "text-[#a09890]"}`}>{step.label}</span>
                        {isActive && <div className="ml-auto w-4 h-4 border-2 border-[#e85d26] border-t-transparent rounded-full animate-spin" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#0e0e0e] border border-[#2a2a2a] p-5">
                <p className="text-xs font-semibold text-[#a09890] uppercase tracking-wider mb-3">Log</p>
                <div ref={logRef} className="space-y-1 max-h-32 overflow-y-auto font-mono text-xs">
                  {stepMessages.length === 0
                    ? <p className="text-[#a09890]">Starting pipeline...</p>
                    : stepMessages.map((msg, i) => <p key={i} className="text-[#a09890]">{msg}</p>)
                  }
                </div>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {status === "done" && result && (
            <div className="space-y-6">
              <div className="bg-[#e85d26]/10 border border-[#e85d26]/30 p-5 flex items-center gap-4">
                <div className="w-9 h-9 bg-[#e85d26] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white">Your PDF is ready!</p>
                  <p className="text-[#a09890] text-sm">Edit the draft or publish it to the store.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[#161616] border border-[#2a2a2a] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-[#a09890] uppercase tracking-wider">Cover</p>
                    <button
                      onClick={handleRegenCover}
                      disabled={regenCover}
                      className="flex items-center gap-1.5 text-xs text-[#a09890] hover:text-[#e85d26] disabled:opacity-50 transition-colors"
                    >
                      {regenCover ? (
                        <div className="w-3 h-3 border border-[#e85d26] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {regenCover ? "Regenerating..." : "Regenerate"}
                    </button>
                  </div>
                  <div className="aspect-[2/3] bg-[#1e1e1e] overflow-hidden relative">
                    {regenCover && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                        <div className="w-8 h-8 border-2 border-[#e85d26] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {(liveCoverUrl || result.coverUrl) ? (
                      <img src={liveCoverUrl || result.coverUrl} alt={result.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-6">
                        <p className="font-display text-xl text-center text-white tracking-wide">{result.title}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#161616] border border-[#2a2a2a] p-5">
                    <p className="text-xs font-semibold text-[#a09890] uppercase tracking-wider mb-2">Title</p>
                    <p className="font-bold text-white text-lg leading-snug">{result.title}</p>
                  </div>
                  {result.bonuses?.length > 0 && (
                    <div className="bg-[#161616] border border-[#2a2a2a] p-5">
                      <p className="text-xs font-semibold text-[#a09890] uppercase tracking-wider mb-3">Bonus Bundle</p>
                      <div className="space-y-1.5">
                        {result.bonuses.slice(0, 3).map((b, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[#e85d26] text-sm shrink-0">•</span>
                            <span className="text-[#f5f0eb] text-sm">{b.name}</span>
                          </div>
                        ))}
                        {result.bonuses.length > 3 && <p className="text-[#a09890] text-xs mt-1">+{result.bonuses.length - 3} more</p>}
                      </div>
                    </div>
                  )}
                  {result.oto && (
                    <div className="bg-[#161616] border border-[#2a2a2a] p-5">
                      <p className="text-xs font-semibold text-[#a09890] uppercase tracking-wider mb-1">One-Time Offer</p>
                      <p className="font-semibold text-white text-sm">{result.oto.name}</p>
                      <p className="text-[#e85d26] font-bold">${result.oto.price}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Link href={`/dashboard/edit/${bookId}`} className="flex-1 border border-[#2a2a2a] hover:border-[#e85d26] text-white font-semibold py-4 text-center transition-colors">
                  Edit Draft
                </Link>
                <Link href={`/dashboard/publish/${bookId}`} className="flex-1 bg-[#e85d26] hover:bg-[#c94d1e] text-white font-semibold py-4 text-center transition-colors">
                  Publish to Store →
                </Link>
              </div>

              <button onClick={reset} className="text-[#a09890] text-sm hover:text-white transition-colors">
                ← Create another
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
