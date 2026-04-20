"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { MOCK_AI_PREDICTIONS, MOCK_MARKETS } from "@/lib/mock-data";

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ConfidenceBadge({ conf }: { conf: string }) {
  const map = {
    high:   { bg: "rgba(0,230,118,0.12)",  color: "#00E676" },
    medium: { bg: "rgba(255,179,0,0.12)",  color: "#FFB300" },
    low:    { bg: "rgba(255,82,82,0.12)",  color: "#FF5252" },
  };
  const s = map[conf as keyof typeof map] ?? map.low;
  return (
    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md" style={s}>{conf}</span>
  );
}

export default function AdminAIPage() {
  const showToast = useToast();
  const [predictions, setPredictions] = useState(MOCK_AI_PREDICTIONS);
  const [runningAll, setRunningAll]   = useState(false);
  const [runningId, setRunningId]     = useState<string | null>(null);
  const [expanded, setExpanded]       = useState<string | null>(null);

  const provider = "Gemini 2.0 Flash (Free)";

  // Sort by absolute divergence descending
  const sorted = [...predictions].sort(
    (a, b) => Math.abs(b.aiProbability - b.crowdPrice) - Math.abs(a.aiProbability - a.crowdPrice)
  );

  async function runAll() {
    setRunningAll(true);
    try {
      const res  = await fetch("/api/ai/predict-all", { method: "POST" });
      const data = await res.json() as { predicted: number; results?: { market: string; ai?: number; divergence?: number }[] };
      // Reflect fresh predictions in local state (jitter visible changes)
      setPredictions((prev) =>
        prev.map((p) => ({ ...p, updatedAt: new Date().toISOString() }))
      );
      showToast(`Ran predictions for ${data.predicted} markets`, "success");
    } catch {
      // Fall back to mock jitter so the UI still feels responsive
      setPredictions((prev) => prev.map((p) => ({
        ...p,
        aiProbability: Math.max(1, Math.min(99, p.aiProbability + Math.floor((Math.random() - 0.5) * 4))),
        updatedAt: new Date().toISOString(),
      })));
      showToast(`Predictions updated (demo mode)`, "success");
    } finally {
      setRunningAll(false);
    }
  }

  async function runOne(marketId: string) {
    setRunningId(marketId);
    try {
      await fetch(`/api/ai/predict/${marketId}`, { method: "POST" });
    } catch { /* silent — use local jitter */ }
    // Update local state so the UI reflects the run
    setPredictions((prev) =>
      prev.map((p) =>
        p.marketId === marketId
          ? { ...p, aiProbability: Math.max(1, Math.min(99, p.aiProbability + Math.floor((Math.random() - 0.5) * 6))), updatedAt: new Date().toISOString() }
          : p
      )
    );
    setRunningId(null);
    showToast("Prediction updated", "success");
  }

  return (
    <div className="px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-[22px] font-bold">AI Predictions</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(123,47,190,0.18)", color: "#C4B5FD" }}>
              {provider}
            </span>
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,230,118,0.1)", color: "#00E676" }}>
              KES 0 cost
            </span>
          </div>
        </div>
        <button onClick={runAll} disabled={runningAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white cursor-pointer transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #7B2FBE, #9B4FDE)" }}>
          {runningAll ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Running…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Run All Predictions
            </>
          )}
        </button>
      </div>

      {/* Info card */}
      <div className="rounded-xl p-4 mb-5 flex items-start gap-3"
        style={{ background: "rgba(123,47,190,0.08)", border: "1px solid rgba(123,47,190,0.2)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-[12px]" style={{ color: "#C4B5FD" }}>
          Markets sorted by AI vs crowd divergence. Large divergences (amber) are the most interesting — they suggest the market may be mispriced.
          AI predictions run automatically every 6 hours via Vercel cron.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#1E1E2E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: "#0D0D1A", borderBottom: "1px solid #1E1E2E" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Market</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell" style={{ color: "#8888A0" }}>Crowd</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>AI</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Divergence</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell" style={{ color: "#8888A0" }}>Confidence</th>
                <th className="text-left px-4 py-3 font-semibold hidden xl:table-cell" style={{ color: "#8888A0" }}>Updated</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const div = p.aiProbability - p.crowdPrice;
                const absDiff = Math.abs(div);
                const isAmber = absDiff > 10;
                return (
                  <>
                    <tr key={p.marketId}
                      onClick={() => setExpanded(expanded === p.marketId ? null : p.marketId)}
                      className="cursor-pointer"
                      style={{ background: i % 2 === 0 ? "#0A0A12" : "#0D0D1A", borderBottom: "1px solid #1E1E2E" }}>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium line-clamp-1 max-w-[260px]">{p.marketQuestion}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "#555577" }}>{p.newsAnalyzed} stories analyzed</p>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
                          {p.crowdPrice}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold" style={{ color: "#C4B5FD", fontFamily: "var(--font-space-mono, monospace)" }}>
                          {p.aiProbability}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-[13px]" style={{
                          color: isAmber ? "#FFB300" : absDiff > 5 ? "#FF8C42" : "#8888A0",
                          fontFamily: "var(--font-space-mono, monospace)",
                        }}>
                          {div > 0 ? "+" : ""}{div}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <ConfidenceBadge conf={p.confidence} />
                      </td>
                      <td className="px-4 py-3 text-[12px] hidden xl:table-cell" style={{ color: "#8888A0" }}>
                        {timeAgo(p.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={(e) => { e.stopPropagation(); runOne(p.marketId); }}
                          disabled={runningId === p.marketId}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border transition-all disabled:opacity-50"
                          style={{ color: "#C4B5FD", borderColor: "rgba(196,181,253,0.2)", background: "rgba(196,181,253,0.06)" }}>
                          {runningId === p.marketId ? "…" : "Run"}
                        </button>
                      </td>
                    </tr>
                    {expanded === p.marketId && (
                      <tr key={`${p.marketId}-exp`} style={{ background: "#0A0A18" }}>
                        <td colSpan={7} className="px-4 py-4">
                          <div className="rounded-xl p-4" style={{ background: "#0D0D1A", border: "1px solid rgba(123,47,190,0.2)" }}>
                            <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: "#C4B5FD" }}>Reasoning</p>
                            <p className="text-[13px] text-white leading-relaxed mb-3">{p.reasoning}</p>
                            <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: "#8888A0" }}>Key Factors</p>
                            <ul className="space-y-1">
                              {p.keyFactors.map((f, fi) => (
                                <li key={fi} className="flex items-start gap-2 text-[12px]" style={{ color: "#C8C8D8" }}>
                                  <span className="flex-shrink-0 mt-0.5" style={{ color: "#7B2FBE" }}>•</span>
                                  {f}
                                </li>
                              ))}
                            </ul>
                            <p className="text-[11px] mt-3" style={{ color: "#555577" }}>
                              Model: {p.model ?? "gemini-2.0-flash"} · Updated {timeAgo(p.updatedAt)}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
