"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  MOCK_CORRESPONDENT,
  MOCK_CORRESPONDENT_PAYMENTS,
  MOCK_NEWS,
} from "@/lib/mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtKES(cents: number) {
  return `KES ${(cents / 100).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

// Correspondent's stories from MOCK_NEWS (filter by source_name matching publication)
const MY_STORIES = MOCK_NEWS.filter((n) => n.source_type === "correspondent").slice(0, 5);

// ─── Story Submit Modal ────────────────────────────────────────────────────────

function SubmitStoryModal({ onClose }: { onClose: () => void }) {
  const showToast = useToast();
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [keywords, setKeywords]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [aiCategory, setAiCategory] = useState<string | null>(null);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  async function handleTitleBlur() {
    if (title.trim().length < 10) return;
    // Mock AI classification
    await new Promise((r) => setTimeout(r, 300));
    const cats = ["politics", "sports", "entertainment", "fashion"];
    setAiCategory(cats[Math.floor(Math.random() * cats.length)]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (wordCount < 20) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    showToast("Story published! KES 50 earned.", "success");
    onClose();
  }

  const INPUT_BASE = "w-full px-3 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#1E1E35] transition-colors resize-none";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl p-5 max-h-[90dvh] overflow-y-auto"
        style={{ background: "#0D0D1A", border: "1px solid #1E1E35" }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-white">Submit a Story</h2>
          <button onClick={onClose} className="text-[#8888A0] hover:text-white cursor-pointer transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-[12px] font-medium mb-1 block" style={{ color: "#8888A0" }}>Headline *</label>
            <div className="relative">
              <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleTitleBlur}
                required maxLength={200}
                placeholder="Breaking: ..."
                className={INPUT_BASE}
                style={{ background: "#0A0A12" }} />
              {aiCategory && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded capitalize"
                  style={{ background: "rgba(59,130,246,0.15)", color: "#60A5FA" }}>
                  AI: {aiCategory}
                </span>
              )}
            </div>
            {aiCategory && (
              <p className="text-[11px] mt-1" style={{ color: "#60A5FA" }}>
                AI classified as <strong>{aiCategory}</strong> — edit if incorrect
              </p>
            )}
          </div>

          {/* Body */}
          <div>
            <label className="text-[12px] font-medium mb-1 block" style={{ color: "#8888A0" }}>
              Story Body * <span className="ml-1" style={{ color: wordCount >= 20 ? "#00E676" : "#555577" }}>{wordCount} words</span>
            </label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              required rows={6} maxLength={5000}
              placeholder="Write your story here (minimum 100 characters)..."
              className={INPUT_BASE}
              style={{ background: "#0A0A12" }} />
          </div>

          {/* Source URL */}
          <div>
            <label className="text-[12px] font-medium mb-1 block" style={{ color: "#8888A0" }}>Source URL (optional)</label>
            <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className={INPUT_BASE}
              style={{ background: "#0A0A12" }} />
          </div>

          {/* Keywords */}
          <div>
            <label className="text-[12px] font-medium mb-1 block" style={{ color: "#8888A0" }}>Keywords (comma-separated)</label>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)}
              placeholder="ruto, election, 2027"
              className={INPUT_BASE}
              style={{ background: "#0A0A12" }} />
          </div>

          {/* Earnings note */}
          <div className="rounded-lg p-3 flex items-center gap-2"
            style={{ background: "rgba(0,230,118,0.06)", border: "1px solid rgba(0,230,118,0.1)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <p className="text-[12px]" style={{ color: "#00E676" }}>Publishing earns you KES 50</p>
          </div>

          <button type="submit" disabled={loading || wordCount < 20}
            className="w-full py-3 rounded-xl text-[14px] font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
            style={{ background: (!loading && wordCount >= 20) ? "#3B82F6" : "#1E1E35", color: "white" }}>
            {loading && (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            )}
            {loading ? "Publishing…" : "Submit for Review"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CorrespondentDashboard() {
  const router = useRouter();
  const showToast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const corr = MOCK_CORRESPONDENT;

  const pendingAmount = useMemo(
    () => MOCK_CORRESPONDENT_PAYMENTS.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0),
    []
  );

  const canPayout = pendingAmount >= 50_000; // KES 500 min

  if (corr.verificationStatus !== "approved") {
    return (
      <div className="px-4 py-12 max-w-lg mx-auto text-center">
        <p className="text-white text-[18px] font-bold mb-2">
          {corr.verificationStatus === "pending" ? "Application Under Review" : "Not Approved"}
        </p>
        <p className="text-[14px]" style={{ color: "#8888A0" }}>
          {corr.verificationStatus === "pending"
            ? "Your application is being reviewed. We'll notify you within 48 hours."
            : "Your application was not approved. Contact support for more information."}
        </p>
      </div>
    );
  }

  async function handlePayoutRequest() {
    setRequestingPayout(true);
    await new Promise((r) => setTimeout(r, 800));
    setRequestingPayout(false);
    showToast("Payout requested! Processing within 24 hours via M-Pesa.", "success");
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-white text-[22px] font-bold">Correspondent Dashboard</h1>
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Verified
            </span>
          </div>
          <p className="text-[13px]" style={{ color: "#8888A0" }}>
            {corr.publicationName} · {corr.beat}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white cursor-pointer transition-all"
          style={{ background: "#3B82F6" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Submit New Story
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Stories Published", value: corr.storyCount.toString(), color: "#3B82F6" },
          { label: "Accuracy Score", value: `${corr.accuracyScore}%`, color: "#00E676" },
          { label: "Total Earned", value: fmtKES(corr.totalEarned), color: "#00E676" },
          { label: "Pending Payout", value: fmtKES(pendingAmount), color: pendingAmount >= 50_000 ? "#FFB300" : "#8888A0" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#0D0D1A", border: "1px solid #1E1E35" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8888A0" }}>{s.label}</p>
            <p className="text-[20px] font-bold" style={{ color: s.color, fontFamily: "var(--font-space-mono, monospace)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* My Stories */}
      <div className="mb-6">
        <h2 className="text-[15px] font-bold text-white mb-3">My Stories</h2>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E1E35" }}>
          {MY_STORIES.length === 0 ? (
            <div className="p-8 text-center" style={{ color: "#8888A0" }}>
              <p className="text-[14px]">No stories yet. Submit your first story to start earning!</p>
            </div>
          ) : (
            MY_STORIES.map((s, i) => {
              const catColor: Record<string, string> = {
                politics: "#C4B5FD", sports: "#4DB6AC", entertainment: "#F472B6", fashion: "#FFB300",
              };
              return (
                <div key={s.id} className="flex items-start gap-3 px-4 py-3.5"
                  style={{ background: i % 2 === 0 ? "#0A0A12" : "#0D0D1A", borderBottom: i < MY_STORIES.length - 1 ? "1px solid #1E1E35" : "none" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white line-clamp-1 mb-1">{s.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider capitalize" style={{ color: catColor[s.category ?? ""] ?? "#8888A0" }}>
                        {s.category}
                      </span>
                      <span className="text-[11px]" style={{ color: "#555577" }}>{timeAgo(s.published_at ?? s.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(0,230,118,0.1)", color: "#00E676" }}>
                      verified
                    </span>
                    <span className="text-[12px] font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
                      +KES 50
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Earnings section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-white">Earnings</h2>
          <button onClick={handlePayoutRequest} disabled={!canPayout || requestingPayout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: canPayout ? "#00E676" : "#1E1E35", color: canPayout ? "#0A0A12" : "#8888A0" }}>
            {requestingPayout ? "Requesting…" : "Request Payout"}
          </button>
        </div>
        {!canPayout && (
          <p className="text-[12px] mb-3" style={{ color: "#8888A0" }}>
            Minimum KES 500 required for payout. You have {fmtKES(pendingAmount)} pending.
          </p>
        )}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E1E35" }}>
          {MOCK_CORRESPONDENT_PAYMENTS.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3"
              style={{ background: i % 2 === 0 ? "#0A0A12" : "#0D0D1A", borderBottom: i < MOCK_CORRESPONDENT_PAYMENTS.length - 1 ? "1px solid #1E1E35" : "none" }}>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-white line-clamp-1">{p.reason}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "#555577" }}>{timeAgo(p.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                  style={{
                    background: p.status === "paid" ? "rgba(0,230,118,0.1)" : "rgba(255,179,0,0.1)",
                    color: p.status === "paid" ? "#00E676" : "#FFB300",
                  }}>
                  {p.status}
                </span>
                <span className="text-[13px] font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
                  +{fmtKES(p.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav to admin (if admin) */}
      <button onClick={() => router.push("/admin/markets")}
        className="text-[12px] cursor-pointer transition-colors" style={{ color: "#555577" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#8888A0"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#555577"; }}>
        Admin Panel →
      </button>

      {showModal && <SubmitStoryModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
