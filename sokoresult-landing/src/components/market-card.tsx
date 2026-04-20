"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SparklineChart, generateSparklineData } from "@/components/sparkline-chart";
import type { Market } from "@/lib/types/database";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtVolume(v: number) {
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `KES ${(v / 1_000).toFixed(0)}K`;
  return `KES ${v}`;
}

function timeLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  if (d > 1)  return `${d}d left`;
  if (d === 1) return `1d ${h}h left`;
  return `${h}h left`;
}

const CAT_META: Record<string, { bg: string; color: string; emoji: string }> = {
  politics:      { bg: "rgba(123,47,190,0.18)",  color: "#C4B5FD", emoji: "🏛️" },
  sports:        { bg: "rgba(0,150,136,0.15)",   color: "#4DB6AC", emoji: "⚽" },
  entertainment: { bg: "rgba(244,114,182,0.15)", color: "#F472B6", emoji: "🎬" },
  fashion:       { bg: "rgba(255,179,0,0.12)",   color: "#FFB300", emoji: "👗" },
};

function catMeta(cat: string | null) {
  return CAT_META[cat ?? ""] ?? { bg: "rgba(136,136,160,0.15)", color: "#8888A0", emoji: "📊" };
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function MarketCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#2A2A3E] p-5 flex flex-col gap-3 animate-pulse" style={{ background: "#12121E" }}>
      {/* Header row */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 rounded-full bg-[#2A2A3E]" />
        <div className="h-4 w-14 rounded-full bg-[#2A2A3E] ml-auto" />
      </div>
      {/* Question */}
      <div className="h-4 w-full rounded bg-[#2A2A3E]" />
      <div className="h-4 w-3/4 rounded bg-[#2A2A3E]" />
      {/* Sparkline placeholder */}
      <div className="rounded-lg bg-[#1E1E2E]" style={{ height: 80 }} />
      {/* Price row */}
      <div className="flex justify-between">
        <div className="h-5 w-16 rounded bg-[#2A2A3E]" />
        <div className="h-5 w-16 rounded bg-[#2A2A3E]" />
      </div>
      {/* Footer */}
      <div className="h-3 w-24 rounded bg-[#2A2A3E]" />
    </div>
  );
}

// ─── Market Card ──────────────────────────────────────────────────────────────

export function MarketCard({ market }: { market: Market }) {
  const router   = useRouter();
  const trending = (market.total_volume ?? 0) > 2_000_000;
  const cm       = catMeta(market.category);

  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  useEffect(() => {
    setTimeLeftStr(timeLeft(market.resolution_deadline));
  }, [market.resolution_deadline]);

  // Generate deterministic sparkline — no API call needed on listing page
  const sparkData = useMemo(
    () => generateSparklineData(market.id, market.yes_price, 30),
    [market.id, market.yes_price]
  );

  // 24h change: last point vs second-to-last
  const last       = sparkData[sparkData.length - 1];
  const prev       = sparkData[sparkData.length - 2] ?? last;
  const yesChange  = +(last.yes - prev.yes).toFixed(1);
  const noChange   = +(last.no!  - prev.no!).toFixed(1);
  const yesUp      = yesChange >= 0;
  const noUp       = noChange  >= 0;

  return (
    <div
      className="rounded-xl border border-[#2A2A3E] flex flex-col overflow-hidden cursor-pointer"
      style={{ background: "#12121E", transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s" }}
      onClick={() => router.push(`/markets/${market.slug}`)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor  = "#7B2FBE";
        e.currentTarget.style.transform    = "translateY(-2px)";
        e.currentTarget.style.boxShadow    = "0 8px 24px rgba(123,47,190,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor  = "#2A2A3E";
        e.currentTarget.style.transform    = "translateY(0)";
        e.currentTarget.style.boxShadow    = "none";
      }}
    >
      {/* ── Card body ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col p-5 pb-3 gap-3 flex-1">

        {/* 1 — Header row */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1"
            style={{ background: cm.bg, color: cm.color }}>
            <span>{cm.emoji}</span>
            {market.category}
          </span>
          {trending && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#00E676]">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              Trending
            </span>
          )}
          <span className="ml-auto text-[10px] text-[#8888A0]">{timeLeftStr}</span>
        </div>

        {/* 2 — Question */}
        <p className="text-[15px] font-medium text-white leading-snug line-clamp-2" style={{ letterSpacing: "-0.01em" }}>
          {market.question}
        </p>

        {/* 3 — Dual-line sparkline */}
        <div className="rounded-lg overflow-hidden -mx-1" style={{ background: "rgba(0,0,0,0.2)" }}>
          <SparklineChart data={sparkData} height={80} />
        </div>

        {/* 4 — Price row with change indicators */}
        <div className="flex items-center justify-between">
          {/* YES */}
          <div className="flex flex-col">
            <span className="text-[18px] font-bold leading-tight" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
              YES {market.yes_price}¢
            </span>
            <span className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: yesUp ? "#00E676" : "#FF5252" }}>
              {yesUp ? "▲" : "▼"} {Math.abs(yesChange)}¢
            </span>
          </div>
          {/* Divider */}
          <div className="w-px h-8 mx-2" style={{ background: "#2A2A3E" }} />
          {/* NO */}
          <div className="flex flex-col items-end">
            <span className="text-[18px] font-bold leading-tight" style={{ color: "#FF5252", fontFamily: "var(--font-space-mono, monospace)" }}>
              NO {market.no_price}¢
            </span>
            <span className="text-[11px] font-semibold flex items-center gap-0.5 justify-end" style={{ color: noUp ? "#00E676" : "#FF5252" }}>
              {noUp ? "▲" : "▼"} {Math.abs(noChange)}¢
            </span>
          </div>
        </div>
      </div>

      {/* 5 — Footer row */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-t border-[#1E1E2E]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8888A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span className="text-[11px] text-[#8888A0]">{fmtVolume(market.total_volume ?? 0)} Vol.</span>

        <span className="text-[11px] text-[#4A4A6A] ml-1">·</span>
        <span className="text-[11px] text-[#8888A0]">{market.total_trades} trades</span>

        {/* Bookmark */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="ml-auto p-1 rounded cursor-pointer transition-colors flex-shrink-0"
          style={{ color: "#8888A0" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#E8E8F0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#8888A0"; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
