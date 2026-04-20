"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Market, NewsStory } from "@/lib/types/database";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",           label: "All" },
  { id: "trending",      label: "Trending" },
  { id: "politics",      label: "Politics" },
  { id: "sports",        label: "Sports" },
  { id: "entertainment", label: "Entertainment" },
  { id: "fashion",       label: "Fashion" },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${n}`;
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Compact market card (Polymarket-style) ───────────────────────────────────

function MarketRow({ market }: { market: Market }) {
  const router = useRouter();
  const catColor: Record<string, string> = {
    politics: "#C4B5FD", sports: "#4DB6AC", entertainment: "#F472B6", fashion: "#FFB300",
  };
  const color = catColor[market.category ?? ""] ?? "#8888A0";

  return (
    <button
      onClick={() => router.push(`/markets/${market.slug}`)}
      className="w-full text-left rounded-xl p-3.5 transition-all duration-150 cursor-pointer group"
      style={{ background: "#111119", border: "1px solid #1E1E2E" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2A2A4A"; e.currentTarget.style.background = "#14141F"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1E1E2E"; e.currentTarget.style.background = "#111119"; }}
    >
      {/* Category tag */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest capitalize" style={{ color }}>
          {market.category}
        </span>
      </div>

      {/* Question */}
      <p className="text-[13px] font-medium text-white leading-snug mb-3 line-clamp-2">{market.question}</p>

      {/* YES / NO buttons */}
      <div className="flex gap-2 mb-2.5">
        <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg"
          style={{ background: "rgba(0,230,118,0.08)" }}>
          <span className="text-[11px] font-semibold" style={{ color: "#00E676" }}>Yes</span>
          <span className="text-[14px] font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
            {market.yes_price}¢
          </span>
        </div>
        <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg"
          style={{ background: "rgba(255,82,82,0.08)" }}>
          <span className="text-[11px] font-semibold" style={{ color: "#FF5252" }}>No</span>
          <span className="text-[14px] font-bold" style={{ color: "#FF5252", fontFamily: "var(--font-space-mono, monospace)" }}>
            {market.no_price}¢
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 text-[11px]" style={{ color: "#555577" }}>
        <span>{fmt(market.total_volume)} Vol.</span>
        <span>·</span>
        <span>{market.participant_count.toLocaleString()} traders</span>
        <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold" style={{ color: "#7B2FBE" }}>
          Trade →
        </span>
      </div>
    </button>
  );
}

// ─── Breaking News item ───────────────────────────────────────────────────────

function NewsItem({ story, markets }: { story: NewsStory; markets: Market[] }) {
  const router = useRouter();
  const linkedMarket = story.linked_market_ids?.[0]
    ? markets.find((m) => m.id === story.linked_market_ids[0])
    : null;

  return (
    <button
      onClick={() => linkedMarket ? router.push(`/markets/${linkedMarket.slug}`) : undefined}
      className="w-full text-left flex items-start gap-3 py-2.5 border-b transition-colors cursor-pointer group"
      style={{ borderColor: "#1A1A2A" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {story.urgency >= 4 && (
        <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: "#FF5252" }} />
      )}
      <p className="text-[12px] text-[#C8C8D8] leading-snug flex-1 line-clamp-2">{story.title}</p>
      {linkedMarket && (
        <span className="text-[12px] font-bold flex-shrink-0 ml-1" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
          {linkedMarket.yes_price}%
        </span>
      )}
    </button>
  );
}

// ─── Hot Topics ───────────────────────────────────────────────────────────────

function HotTopicItem({ market }: { market: Market }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/markets/${market.slug}`)}
      className="w-full flex items-center justify-between py-2.5 border-b transition-colors cursor-pointer text-left"
      style={{ borderColor: "#1A1A2A" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[#C8C8D8] line-clamp-1 leading-snug">{market.question}</p>
      </div>
      <div className="flex-shrink-0 ml-3 text-right">
        <p className="text-[11px] font-semibold" style={{ color: "#8888A0", fontFamily: "var(--font-space-mono, monospace)" }}>
          {fmt(market.total_volume)}
        </p>
        <p className="text-[10px]" style={{ color: "#444" }}>
          {timeAgo(market.created_at)}
        </p>
      </div>
    </button>
  );
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

function RightSidebar({ markets }: { markets: Market[] }) {
  const [newsItems, setNewsItems] = useState<NewsStory[]>([]);

  useEffect(() => {
    fetch("/api/news/feed?type=top&number=20")
      .then((r) => r.json())
      .then((d: { news: NewsStory[] }) => {
        const breaking = (d.news ?? []).filter((n) => n.urgency >= 3).slice(0, 5);
        setNewsItems(breaking);
      })
      .catch(() => {});
  }, []);

  const hotTopics = useMemo(() =>
    [...markets].sort((a, b) => b.total_volume - a.total_volume).slice(0, 5),
    [markets]
  );

  return (
    <aside className="hidden lg:flex flex-col flex-shrink-0 sticky top-0 overflow-y-auto"
      style={{ width: 260, maxHeight: "calc(100vh - 64px)", paddingTop: 16, paddingBottom: 24, gap: 24 }}>

      {/* Breaking News */}
      {newsItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#FF5252" }} />
            <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "#E8E8F0" }}>Breaking news</p>
          </div>
          <div className="rounded-xl px-3" style={{ background: "#111119", border: "1px solid #1E1E2E" }}>
            {newsItems.map((s) => <NewsItem key={s.id} story={s} markets={markets} />)}
          </div>
        </div>
      )}

      {/* Hot Topics */}
      {hotTopics.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFB300">
              <path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/>
            </svg>
            <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "#E8E8F0" }}>Hot topics</p>
          </div>
          <div className="rounded-xl px-3" style={{ background: "#111119", border: "1px solid #1E1E2E" }}>
            {hotTopics.map((m) => <HotTopicItem key={m.id} market={m} />)}
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────

function SearchBar({ markets, onNavigate }: { markets: Market[]; onNavigate: (slug: string) => void }) {
  const [q, setQ]       = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (q.length < 2) return [];
    const lower = q.toLowerCase();
    return markets.filter((m) =>
      m.question.toLowerCase().includes(lower) ||
      (m.keywords ?? []).some((k) => k.toLowerCase().includes(lower))
    ).slice(0, 5);
  }, [q, markets]);

  return (
    <div className="relative flex-1 max-w-sm">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
        style={{ background: "#111119", border: "1px solid #1E1E2E" }}
        onFocusCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#2A2A4A"; }}
        onBlurCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1E1E2E"; }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555577" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => q.length >= 2 && setOpen(true)}
          placeholder="Search markets…"
          className="flex-1 bg-transparent text-[13px] text-white outline-none min-w-0"
          style={{ color: "#E8E8F0" }}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl z-50 overflow-hidden shadow-2xl"
          style={{ background: "#111119", border: "1px solid #1E1E2E" }}>
          {results.map((m) => (
            <button key={m.id}
              onClick={() => { onNavigate(m.slug); setQ(""); setOpen(false); }}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer"
              style={{ borderBottom: "1px solid #1A1A2A" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#16161F"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <p className="text-[13px] text-white line-clamp-1 flex-1">{m.question}</p>
              <span className="text-[12px] font-bold flex-shrink-0" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
                {m.yes_price}¢
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const router = useRouter();
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState("all");
  const [sort, setSort]             = useState("volume");

  useEffect(() => {
    fetch("/api/markets?limit=50&sort=volume")
      .then((r) => r.json())
      .then((d: { markets: Market[] }) => {
        setAllMarkets(d.markets ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const markets = useMemo(() => {
    let list = [...allMarkets];
    if (category === "trending")       list = list.filter((m) => m.total_trades > 10);
    else if (category !== "all")       list = list.filter((m) => m.category === category);
    if (sort === "volume")             list.sort((a, b) => b.total_volume - a.total_volume);
    else if (sort === "trades")        list.sort((a, b) => b.total_trades - a.total_trades);
    else if (sort === "newest")        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [allMarkets, category, sort]);

  const totalVol = allMarkets.reduce((s, m) => s + m.total_volume, 0);

  return (
    <div className="flex gap-6 px-4 md:px-6 py-5 max-w-[1280px] mx-auto" style={{ background: "#0A0A12", minHeight: "100vh" }}>

      {/* Main content */}
      <div className="flex-1 min-w-0">

        {/* Category filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer"
                style={{
                  background: active ? "#1E1E35" : "transparent",
                  color: active ? "#E8E8F0" : "#555577",
                  border: `1px solid ${active ? "#3A3A5E" : "transparent"}`,
                }}>
                {c.id === "trending" && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#FFB300" }} />
                )}
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Header row */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h1 className="text-white text-[16px] font-bold flex-1">
            All markets
            <span className="text-[13px] font-normal ml-2" style={{ color: "#555577" }}>{markets.length}</span>
          </h1>

          {/* Sort buttons */}
          <div className="flex items-center gap-0 rounded-lg overflow-hidden" style={{ background: "#111119", border: "1px solid #1E1E2E" }}>
            {[
              { id: "volume", label: "Volume" },
              { id: "newest", label: "New" },
              { id: "trades", label: "Active" },
            ].map((s) => (
              <button key={s.id} onClick={() => setSort(s.id)}
                className="px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 cursor-pointer"
                style={{ background: sort === s.id ? "#1E1E35" : "transparent", color: sort === s.id ? "#C4B5FD" : "#555577" }}>
                {s.label}
              </button>
            ))}
          </div>

          <SearchBar markets={allMarkets} onNavigate={(slug) => router.push(`/markets/${slug}`)} />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-4 text-[11px] px-0.5" style={{ color: "#555577", fontFamily: "var(--font-space-mono, monospace)" }}>
          <span>{allMarkets.length} markets</span>
          <span>·</span>
          <span>{fmt(totalVol)} total volume</span>
          <span>·</span>
          <span>{allMarkets.reduce((s, m) => s + m.participant_count, 0).toLocaleString()} traders</span>
        </div>

        {/* Market grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl h-40 animate-pulse" style={{ background: "#111119", border: "1px solid #1E1E2E" }} />
            ))}
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[15px] font-semibold text-white mb-1">No markets found</p>
            <p className="text-[13px]" style={{ color: "#555577" }}>Try a different category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {markets.map((m) => <MarketRow key={m.id} market={m} />)}
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <RightSidebar markets={allMarkets} />
    </div>
  );
}
