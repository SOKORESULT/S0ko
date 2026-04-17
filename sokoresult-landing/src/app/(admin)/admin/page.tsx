// src/app/(admin)/admin/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";

function StatCard({
  label, value, sub, color,
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "#8888A0" }}>{label}</p>
      <p className="text-[24px] font-bold" style={{ color: color ?? "#E8E8F0", fontFamily: "var(--font-space-mono, monospace)" }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "#555577" }}>{sub}</p>}
    </div>
  );
}

interface IngestResult { ingested: number; skipped: number; errors: number; timestamp: string }
interface SuggestResult { suggested: number; markets: string[] }
interface EmotionResult { analyzed: number }

export default function AdminDashboardPage() {
  const showToast = useToast();

  const [ingestResult, setIngestResult]   = useState<IngestResult | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);

  const [suggestResult, setSuggestResult]   = useState<SuggestResult | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [emotionResult, setEmotionResult]   = useState<EmotionResult | null>(null);
  const [emotionLoading, setEmotionLoading] = useState(false);

  async function runIngest() {
    setIngestLoading(true);
    try {
      const res = await fetch(
        `/api/news/auto-ingest?secret=${process.env.NEXT_PUBLIC_CRON_SECRET ?? "dev"}`
      );
      const data = await res.json() as IngestResult;
      setIngestResult(data);
      showToast(`Ingested ${data.ingested} stories`, "success");
    } catch {
      showToast("Ingestion failed", "error");
    }
    setIngestLoading(false);
  }

  async function runSuggest() {
    setSuggestLoading(true);
    try {
      const res = await fetch(
        `/api/ai/suggest-markets?secret=${process.env.NEXT_PUBLIC_CRON_SECRET ?? "dev"}`,
        { method: "POST" }
      );
      const data = await res.json() as SuggestResult;
      setSuggestResult(data);
      showToast(`Generated ${data.suggested} suggestions`, "success");
    } catch {
      showToast("Suggestion generation failed", "error");
    }
    setSuggestLoading(false);
  }

  async function runEmotions() {
    setEmotionLoading(true);
    try {
      const res = await fetch(
        `/api/ai/emotions?secret=${process.env.NEXT_PUBLIC_CRON_SECRET ?? "dev"}`,
        { method: "POST" }
      );
      const data = await res.json() as EmotionResult;
      setEmotionResult(data);
      showToast(`Analyzed ${data.analyzed} markets`, "success");
    } catch {
      showToast("Emotion analysis failed", "error");
    }
    setEmotionLoading(false);
  }

  function RunBtn({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #FF6B35, #FF4500)", color: "white" }}
      >
        {loading ? (
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        )}
        {loading ? "Running\u2026" : label}
      </button>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl space-y-8">
      <h1 className="text-white text-[22px] font-bold">Admin Dashboard</h1>

      {/* ── News Engine ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
            <h2 className="text-white font-bold text-[15px]">News Engine</h2>
            <span className="text-[11px]" style={{ color: "#8888A0" }}>Auto-ingesting every 10 min</span>
          </div>
          <RunBtn loading={ingestLoading} onClick={runIngest} label="Run Now" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Ingested" value={ingestResult?.ingested ?? "\u2014"} color="#00E676"
            sub={ingestResult ? new Date(ingestResult.timestamp).toLocaleTimeString("en-KE") : "no runs yet"} />
          <StatCard label="Skipped"  value={ingestResult?.skipped  ?? "\u2014"} sub="duplicates" />
          <StatCard label="Errors"   value={ingestResult?.errors   ?? "\u2014"}
            color={ingestResult?.errors ? "#FF5252" : "#00E676"} />
          <StatCard label="Sources"  value={14} color="#4DB6AC" sub="RSS + scrape" />
        </div>
      </section>

      {/* ── AI Suggestions ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-bold text-[15px]">AI Market Suggestions</h2>
            <Link href="/admin/suggestions"
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all"
              style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
              Review pending &rarr;
            </Link>
          </div>
          <RunBtn loading={suggestLoading} onClick={runSuggest} label="Generate Now" />
        </div>
        {suggestResult ? (
          <div className="rounded-xl p-4 space-y-2" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
            <p className="text-[12px] font-bold" style={{ color: "#00E676" }}>
              Generated {suggestResult.suggested} suggestions this run
            </p>
            {suggestResult.markets.slice(0, 3).map((q, i) => (
              <p key={i} className="text-[12px] truncate" style={{ color: "#8888A0" }}>&rarr; {q}</p>
            ))}
          </div>
        ) : (
          <div className="rounded-xl p-4" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
            <p className="text-[12px]" style={{ color: "#555577" }}>Click &quot;Generate Now&quot; to analyse today&apos;s news and suggest markets.</p>
          </div>
        )}
      </section>

      {/* ── Emotion Monitor ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-[15px]">Emotion Monitor</h2>
          <RunBtn loading={emotionLoading} onClick={runEmotions} label="Analyze All Now" />
        </div>
        {emotionResult ? (
          <div className="rounded-xl p-4" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
            <p className="text-[13px] font-bold" style={{ color: "#00E676" }}>
              Analyzed {emotionResult.analyzed} markets
            </p>
            <p className="text-[12px] mt-1" style={{ color: "#8888A0" }}>
              Emotion data updated. Visit individual market pages to see sentiment widgets.
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-4" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
            <p className="text-[12px]" style={{ color: "#555577" }}>
              Click &quot;Analyze All Now&quot; to scrape social posts for all open markets and run Gemini emotion analysis.
              Runs automatically every 2 hours via cron.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
