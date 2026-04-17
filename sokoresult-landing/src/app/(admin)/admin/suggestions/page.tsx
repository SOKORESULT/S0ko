// src/app/(admin)/admin/suggestions/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/toast";

interface SourceNews { id: string; title: string; source_url: string }

interface Suggestion {
  id: string;
  question: string;
  suggested_slug: string;
  category: string;
  suggested_probability: number;
  reasoning: string;
  description: string;
  keywords: string[];
  resolution_deadline: string;
  status: "pending" | "approved" | "rejected" | "duplicate";
  source_news: SourceNews[];
  created_at: string;
}

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  politics:      { bg: "rgba(123,47,190,0.18)", color: "#C4B5FD" },
  sports:        { bg: "rgba(0,150,136,0.15)",  color: "#4DB6AC" },
  entertainment: { bg: "rgba(244,114,182,0.15)", color: "#F472B6" },
  fashion:       { bg: "rgba(255,179,0,0.12)",  color: "#FFB300" },
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60)  return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function SuggestionsPage() {
  const showToast = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeTab !== "all" ? `?status=${activeTab}` : "";
      const res = await fetch(`/api/admin/suggestions${params}`);
      const data = await res.json() as { suggestions: Suggestion[] };
      setSuggestions(data.suggestions ?? []);
    } catch {
      showToast("Failed to load suggestions", "error");
    }
    setLoading(false);
  }, [activeTab, showToast]);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setGenerating(true);
    try {
      const secret = process.env.NEXT_PUBLIC_CRON_SECRET ?? "dev";
      const res = await fetch(`/api/ai/suggest-markets?secret=${secret}`, { method: "POST" });
      const data = await res.json() as { suggested: number };
      showToast(`Generated ${data.suggested} new suggestions`, "success");
      await load();
    } catch {
      showToast("Generation failed", "error");
    }
    setGenerating(false);
  }

  async function updateStatus(id: string, status: "approved" | "rejected" | "duplicate") {
    setActionLoading(id + status);
    try {
      const res = await fetch(`/api/admin/suggestions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json() as { error?: string; suggestion?: Suggestion };
      if (!res.ok) throw new Error(data.error ?? "Failed");

      if (status === "approved") {
        showToast(`Market created: "${suggestions.find(s => s.id === id)?.question?.slice(0, 50)}..."`, "success");
      } else {
        showToast(`Suggestion ${status}`, "success");
      }
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      showToast(String(err), "error");
    }
    setActionLoading(null);
  }

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  const tabs = ["pending", "approved", "rejected", "all"] as const;

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <h1 className="text-white text-[22px] font-bold">AI Market Suggestions</h1>
          </div>
          <p className="text-[13px] mt-0.5" style={{ color: "#8888A0" }}>
            Gemini analyzed today&apos;s news and suggests these new markets
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #9333ea, #7c3aed)", color: "white" }}
        >
          {generating ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Generating&hellip;
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Generate New Suggestions
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-[12px] font-bold px-3 py-1 rounded-full"
            style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
            {pendingCount} pending review
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E", width: "fit-content" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-all cursor-pointer"
            style={{
              background: activeTab === tab ? "#9333ea" : "transparent",
              color: activeTab === tab ? "white" : "#8888A0",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 200, background: "#0D0D1A", border: "1px solid #1E1E2E" }} />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#8888A0" }}>
          <p className="text-[15px]">No {activeTab !== "all" ? activeTab : ""} suggestions</p>
          <p className="text-[12px] mt-1">Click &quot;Generate New Suggestions&quot; to analyze today&apos;s news</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((s) => {
            const catStyle = CAT_COLORS[s.category] ?? CAT_COLORS.politics;
            return (
              <div
                key={s.id}
                className="rounded-2xl p-5"
                style={{
                  background: "#0D0D1A",
                  border: "1px solid #1E1E2E",
                  borderLeft: "4px solid #9333ea",
                }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-white font-bold text-[16px] leading-snug flex-1">{s.question}</p>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                    style={catStyle}>{s.category}</span>
                </div>

                {/* Probability + reasoning */}
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-[32px] font-black" style={{ color: "#9333ea", fontFamily: "var(--font-space-mono, monospace)" }}>
                    {s.suggested_probability}%
                  </span>
                  <p className="text-[12px] flex-1" style={{ color: "#8888A0" }}>{s.reasoning}</p>
                </div>

                {/* Description */}
                {s.description && (
                  <p className="text-[12px] mb-3" style={{ color: "#6666A0" }}>{s.description}</p>
                )}

                {/* Keywords */}
                {s.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {s.keywords.map((kw) => (
                      <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(147,51,234,0.12)", color: "#C4B5FD" }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Deadline + age */}
                <div className="flex items-center gap-3 mb-3 text-[11px]" style={{ color: "#555577" }}>
                  {s.resolution_deadline && <span>Resolves: {s.resolution_deadline}</span>}
                  <span>·</span>
                  <span>{timeAgo(s.created_at)}</span>
                </div>

                {/* Source news */}
                {s.source_news?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#555577" }}>Source news</p>
                    <div className="space-y-1">
                      {s.source_news.map((n) => (
                        <a key={n.id} href={n.source_url} target="_blank" rel="noreferrer"
                          className="block text-[11px] truncate hover:opacity-75 transition-opacity"
                          style={{ color: "#FF6B35" }}>
                          &rarr; {n.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {s.status === "pending" && (
                  <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: "1px solid #1E1E2E" }}>
                    <button
                      onClick={() => updateStatus(s.id, "approved")}
                      disabled={actionLoading !== null}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all disabled:opacity-50"
                      style={{ background: "rgba(0,230,118,0.12)", color: "#00E676", border: "1px solid rgba(0,230,118,0.25)" }}>
                      {actionLoading === s.id + "approved" ? "Creating\u2026" : "\u2713 Approve & Create Market"}
                    </button>
                    <a
                      href={`/admin/markets/create?q=${encodeURIComponent(s.question)}&prob=${s.suggested_probability}&cat=${s.category}&slug=${s.suggested_slug}`}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                      style={{ background: "rgba(99,102,241,0.12)", color: "#818CF8", border: "1px solid rgba(99,102,241,0.25)" }}>
                      Edit &amp; Approve
                    </a>
                    <button
                      onClick={() => updateStatus(s.id, "rejected")}
                      disabled={actionLoading !== null}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all disabled:opacity-50"
                      style={{ background: "transparent", color: "#FF5252", border: "1px solid rgba(255,82,82,0.3)" }}>
                      {actionLoading === s.id + "rejected" ? "\u2026" : "\u2715 Reject"}
                    </button>
                    <button
                      onClick={() => updateStatus(s.id, "duplicate")}
                      disabled={actionLoading !== null}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all disabled:opacity-50"
                      style={{ background: "transparent", color: "#8888A0", border: "1px solid #2A2A3E" }}>
                      {actionLoading === s.id + "duplicate" ? "\u2026" : "\u229c Duplicate"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
