"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MOCK_NEWS, MOCK_MARKETS,
  getAIPredictionForMarket,
  type MockNews, type MockMarket,
} from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",           label: "All" },
  { id: "breaking",      label: "Breaking" },
  { id: "politics",      label: "Politics" },
  { id: "sports",        label: "Sports" },
  { id: "entertainment", label: "Entertainment" },
  { id: "fashion",       label: "Fashion" },
];

const CAT_STYLE: Record<string, { bg: string; color: string }> = {
  politics:      { bg: "rgba(123,47,190,0.18)", color: "#C4B5FD" },
  sports:        { bg: "rgba(0,150,136,0.15)",  color: "#4DB6AC" },
  entertainment: { bg: "rgba(244,114,182,0.15)", color: "#F472B6" },
  fashion:       { bg: "rgba(255,179,0,0.12)",  color: "#FFB300" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// ─── Sparkline (60×30 SVG) ───────────────────────────────────────────────────

function MiniSparkline({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return null;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const W = 60, H = 28;
  const pts = data
    .map((v, i) => {
      const x = ((i / (data.length - 1)) * W).toFixed(1);
      const y = (H - ((v - min) / range) * (H - 4) - 2).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");
  const color = up ? "#00E676" : "#FF5252";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0 opacity-80">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Linked market widget ─────────────────────────────────────────────────────

function MarketWidget({ market }: { market: MockMarket }) {
  const router  = useRouter();
  const pred    = getAIPredictionForMarket(market.id);
  const aiDiff  = pred ? Math.abs(pred.aiProbability - pred.crowdPrice) : 0;

  const sparkRaw  = market.priceHistory.slice(-12).map((p) => p.yesPrice);
  const sparkFirst = sparkRaw[0] ?? 50;
  const sparkLast  = sparkRaw[sparkRaw.length - 1] ?? 50;
  const up = sparkLast >= sparkFirst;

  return (
    <div
      onClick={() => router.push(`/markets/${market.slug}`)}
      className="mt-2.5 rounded-xl border border-[#2A2A3E] p-3 cursor-pointer transition-all duration-150 group"
      style={{ background: "#0D0D1A" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7B2FBE"; e.currentTarget.style.background = "#11111E"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.background = "#0D0D1A"; }}
    >
      <p className="text-[12px] text-white font-medium line-clamp-1 mb-2">{market.question}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {/* YES */}
        <span className="text-[13px] font-bold flex-shrink-0"
          style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
          YES {market.yes_price}¢
        </span>
        {/* Sparkline */}
        <MiniSparkline data={sparkRaw} up={up} />
        {/* NO */}
        <span className="text-[13px] font-bold flex-shrink-0"
          style={{ color: "#FF5252", fontFamily: "var(--font-space-mono, monospace)" }}>
          NO {market.no_price}¢
        </span>
        {/* AI divergence */}
        {aiDiff > 5 && pred && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: "rgba(196,181,253,0.12)", color: "#C4B5FD" }}>
            AI: {pred.aiProbability}%
          </span>
        )}
        {/* Trade button */}
        <span className="ml-auto text-[12px] font-semibold flex-shrink-0 transition-colors"
          style={{ color: "#7B2FBE" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#9B4FDE"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#7B2FBE"; }}>
          Trade →
        </span>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerificationBadge({ status }: { status: string }) {
  if (status === "verified")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
        style={{ background: "rgba(0,230,118,0.12)", color: "#00E676" }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Verified
      </span>
    );
  if (status === "disputed")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
        style={{ background: "rgba(255,82,82,0.12)", color: "#FF5252" }}>
        Disputed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: "rgba(255,179,0,0.12)", color: "#FFB300" }}>
      Pending
    </span>
  );
}

function SourceTypePill({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    correspondent: { bg: "rgba(59,130,246,0.15)",   color: "#3B82F6", label: "Correspondent" },
    wire:          { bg: "rgba(0,150,136,0.15)",    color: "#4DB6AC", label: "Wire" },
    media:         { bg: "rgba(255,179,0,0.12)",    color: "#FFB300", label: "Media" },
    social:        { bg: "rgba(244,114,182,0.15)",  color: "#F472B6", label: "Social" },
    contributor:   { bg: "rgba(99,102,241,0.15)",   color: "#A5B4FC", label: "Contributor" },
  };
  const s = map[type] ?? { bg: "rgba(136,136,160,0.15)", color: "#8888A0", label: type };
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  );
}

function UrgencyDot({ level }: { level: number }) {
  const color = level >= 4 ? "#FF5252" : level === 3 ? "#FFB300" : "#8888A0";
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${level >= 4 ? "animate-pulse" : ""}`}
      style={{ background: color }} />
  );
}

function AIInsightBadge({ marketSlug }: { marketSlug: string }) {
  const market = MOCK_MARKETS.find((m) => m.slug === marketSlug);
  if (!market) return null;
  const pred = getAIPredictionForMarket(market.id);
  if (!pred) return null;
  const diff = Math.abs(pred.aiProbability - pred.crowdPrice);
  if (diff <= 5) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: "rgba(196,181,253,0.12)", color: "#C4B5FD" }}>
      AI: {pred.aiProbability}% vs {pred.crowdPrice}%
    </span>
  );
}

// ─── News card ────────────────────────────────────────────────────────────────

function NewsCard({ story, allMarkets }: { story: MockNews; allMarkets: MockMarket[] }) {
  const catStyle = CAT_STYLE[story.category] ?? { bg: "rgba(136,136,160,0.15)", color: "#8888A0" };

  // Find linked markets: prefer linked_market_ids (Supabase), fall back to linkedMarket slug
  const linkedMarkets: MockMarket[] = useMemo(() => {
    const found: MockMarket[] = [];
    if (story.linked_market_ids?.length) {
      for (const id of story.linked_market_ids) {
        const m = allMarkets.find((mkt) => mkt.id === id);
        if (m) found.push(m);
      }
    }
    if (found.length === 0 && story.linkedMarket) {
      const m = allMarkets.find((mkt) => mkt.slug === story.linkedMarket);
      if (m) found.push(m);
    }
    return found;
  }, [story, allMarkets]);

  return (
    <article
      className="rounded-2xl border border-[#2A2A3E] p-4 transition-all duration-200"
      style={{ background: "#12121E" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3A2A5E"; e.currentTarget.style.background = "#1A1A2E"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.background = "#12121E"; }}
    >
      {/* Top meta + image */}
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <UrgencyDot level={story.urgency} />
            <span className="text-[12px] font-semibold text-[#E8E8F0]">{story.source_name}</span>
            <SourceTypePill type={story.source_type} />
            <VerificationBadge status={story.verification_status} />
            <span className="ml-auto text-[11px] text-[#8888A0] flex-shrink-0">{timeAgo(story.published_at)}</span>
          </div>

          {/* Headline */}
          <h3 className="text-[14px] font-semibold text-white leading-snug mb-1.5 line-clamp-2">
            {story.title}
          </h3>

          {/* Body snippet */}
          {story.body && (
            <p className="text-[12px] text-[#8888A0] leading-relaxed line-clamp-2 mb-2">{story.body}</p>
          )}
        </div>

        {/* Thumbnail */}
        {story.image_url && (
          <div className="flex-shrink-0 w-[72px] h-[56px] rounded-lg overflow-hidden"
            style={{ background: "#1E1E2E" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={story.image_url} alt="" className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
      </div>

      {/* Correspondent attribution */}
      {story.source_type === "correspondent" && story.correspondent_name && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#3B82F6">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
          </svg>
          <span className="text-[11px] font-semibold" style={{ color: "#3B82F6" }}>
            By {story.correspondent_name}
            {story.correspondent_publication ? ` · ${story.correspondent_publication}` : ""}
          </span>
        </div>
      )}

      {/* Category + AI insight */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider font-bold capitalize px-2 py-0.5 rounded-md flex-shrink-0"
          style={catStyle}>
          {story.category}
        </span>
        {story.linkedMarket && <AIInsightBadge marketSlug={story.linkedMarket} />}
      </div>

      {/* Linked market widgets — THE TRADING FUNNEL */}
      {linkedMarkets.map((m) => <MarketWidget key={m.id} market={m} />)}
    </article>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[#2A2A3E] p-4 animate-pulse" style={{ background: "#12121E" }}>
      <div className="flex gap-3 mb-3">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 rounded-full bg-[#2A2A3E]" />
            <div className="w-24 h-3 rounded bg-[#2A2A3E]" />
            <div className="w-16 h-3 rounded bg-[#2A2A3E]" />
            <div className="ml-auto w-10 h-3 rounded bg-[#2A2A3E]" />
          </div>
          <div className="w-full h-4 rounded bg-[#2A2A3E]" />
          <div className="w-3/4 h-4 rounded bg-[#2A2A3E]" />
          <div className="w-full h-3 rounded bg-[#1E1E2E]" />
          <div className="w-2/3 h-3 rounded bg-[#1E1E2E]" />
        </div>
        <div className="w-[72px] h-[56px] rounded-lg bg-[#1E1E2E] flex-shrink-0" />
      </div>
    </div>
  );
}

// ─── Submit story modal ───────────────────────────────────────────────────────

function SubmitModal({ onClose }: { onClose: () => void }) {
  const showToast = useToast();
  const [title, setTitle] = useState("");
  const [body,  setBody]  = useState("");
  const [url,   setUrl]   = useState("");
  const [cat,   setCat]   = useState("politics");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    showToast("Story submitted for review!", "success");
    onClose();
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] focus:border-[#7B2FBE] transition-colors";
  const inputBg  = { background: "#0A0A12" };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-2xl border border-[#2A2A3E] p-5 max-h-[90dvh] overflow-y-auto"
        style={{ background: "#12121E" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-white">Submit a Story</h2>
          <button onClick={onClose} className="text-[#8888A0] hover:text-white cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] text-[#8888A0] font-medium mb-1 block">Headline *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              className={inputCls} style={inputBg} placeholder="Breaking: …" />
          </div>
          <div>
            <label className="text-[12px] text-[#8888A0] font-medium mb-1 block">Summary</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
              className={inputCls + " resize-none"} style={inputBg} placeholder="Brief summary…" />
          </div>
          <div>
            <label className="text-[12px] text-[#8888A0] font-medium mb-1 block">Source URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} type="url"
              className={inputCls} style={inputBg} placeholder="https://…" />
          </div>
          <div>
            <label className="text-[12px] text-[#8888A0] font-medium mb-1 block">Category</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)}
              className={inputCls + " cursor-pointer"} style={inputBg}>
              {["politics", "sports", "entertainment", "fashion"].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <button type="submit"
            className="w-full py-3 rounded-xl text-[14px] font-bold text-[#0A0A12] cursor-pointer transition-all mt-2"
            style={{ background: "linear-gradient(90deg, #00C853, #00E676)" }}>
            Submit for Review
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewsPage() {
  const [category,    setCategory]   = useState("all");
  const [showSubmit,  setShowSubmit] = useState(false);
  const [allNews,     setAllNews]    = useState<MockNews[]>(MOCK_NEWS);
  const [loading,     setLoading]    = useState(true);
  const [isLive,      setIsLive]     = useState(false);

  const fetchNews = useCallback(async (cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: cat, number: "60" });
      const res  = await fetch(`/api/news/feed?${params}`);
      const data = await res.json() as { news: MockNews[]; source: string };
      setAllNews(data.news ?? MOCK_NEWS);
      setIsLive(data.source === "live");
    } catch {
      setAllNews(MOCK_NEWS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNews(category); }, [category, fetchNews]);

  const stories = useMemo(() => {
    // Correspondent stories always float to top
    return [...allNews].sort(
      (a, b) => (b.source_type === "correspondent" ? 1 : 0) - (a.source_type === "correspondent" ? 1 : 0)
    );
  }, [allNews]);

  return (
    <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8E8F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
            <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/>
          </svg>
          <h1 className="text-white text-[24px] font-bold">News Feed</h1>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[13px] text-[#8888A0]">
            {isLive ? "Live from Kenyan media" : "Demo — connect news engine for live data"}
          </p>
          {isLive ? (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,230,118,0.12)", color: "#00E676" }}>
              <span className="w-1 h-1 rounded-full bg-[#00E676] animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(136,136,160,0.1)", color: "#555577" }}>
              DEMO
            </span>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer"
            style={{
              background: category === c.id ? "#7B2FBE" : "#12121E",
              color:      category === c.id ? "#ffffff" : "#8888A0",
              border:     `1px solid ${category === c.id ? "#7B2FBE" : "#2A2A3E"}`,
            }}>
            {c.id === "breaking" && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5252] animate-pulse" />
            )}
            {c.label}
          </button>
        ))}
      </div>

      {/* Stories */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16 text-[#8888A0]">
          <p className="text-[15px]">No stories in this category yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {stories.map((s) => (
            <NewsCard key={s.id} story={s} allMarkets={MOCK_MARKETS} />
          ))}
        </div>
      )}

      {/* Submit FAB */}
      <button
        onClick={() => setShowSubmit(true)}
        className="fixed bottom-24 md:bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl cursor-pointer transition-all z-40"
        style={{ background: "linear-gradient(135deg, #00C853, #00E676)" }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A0A12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {showSubmit && <SubmitModal onClose={() => setShowSubmit(false)} />}
    </div>
  );
}
