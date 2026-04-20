"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  MOCK_POSITIONS, MOCK_TRADES, MOCK_PORTFOLIO_SUMMARY, MOCK_PORTFOLIO_CHART,
  type MockPosition, type MockTrade,
} from "@/lib/mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtKES(v: number, signed = false) {
  const abs = Math.abs(v);
  const str = abs >= 1_000_000
    ? `KES ${(abs / 1_000_000).toFixed(2)}M`
    : abs >= 1_000
    ? `KES ${(abs / 1_000).toFixed(2)}K`
    : `KES ${abs.toFixed(2)}`;
  if (!signed) return str;
  return v >= 0 ? `+${str}` : `-${str}`;
}

function fmtPct(v: number) { return v >= 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`; }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d} days ago`;
  return new Date(iso).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" });
}

function dateHeader(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-KE", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function groupTradesByDate(trades: MockTrade[]) {
  const groups: { label: string; trades: MockTrade[] }[] = [];
  let lastLabel = "";
  for (const t of trades) {
    const label = dateHeader(t.created_at);
    if (label !== lastLabel) { groups.push({ label, trades: [] }); lastLabel = label; }
    groups[groups.length - 1].trades.push(t);
  }
  return groups;
}

// ─── Circular progress ────────────────────────────────────────────────────────

function CircularProgress({ pct, size = 44 }: { pct: number; size?: number }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A2A3E" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#00E676" strokeWidth="3"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill="#E8E8F0" fontSize="9" fontFamily="var(--font-space-mono, monospace)" fontWeight="700">
        {pct}%
      </text>
    </svg>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards() {
  const s = MOCK_PORTFOLIO_SUMMARY;
  const pnlPositive = s.net_pnl >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {/* Portfolio value */}
      <div className="rounded-2xl border border-[#2A2A3E] p-4 col-span-2 sm:col-span-1" style={{ background: "#12121E" }}>
        <p className="text-[11px] text-[#8888A0] font-medium uppercase tracking-wider mb-1">Portfolio Value</p>
        <p className="text-[24px] font-bold text-white leading-tight" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
          {fmtKES(s.total_portfolio_value)}
        </p>
        <p className="text-[11px] text-[#8888A0] mt-1">
          {fmtKES(s.kes_balance)} cash &nbsp;·&nbsp; {fmtKES(s.total_portfolio_value - s.kes_balance)} positions
        </p>
      </div>

      {/* Net P&L */}
      <div className="rounded-2xl border p-4 col-span-2 sm:col-span-1"
        style={{ background: pnlPositive ? "rgba(0,230,118,0.05)" : "rgba(255,82,82,0.05)", borderColor: pnlPositive ? "rgba(0,230,118,0.2)" : "rgba(255,82,82,0.2)" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={pnlPositive ? "#00E676" : "#FF5252"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {pnlPositive ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></> : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>}
          </svg>
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: pnlPositive ? "#00E676" : "#FF5252" }}>Net P&L</p>
        </div>
        <p className="text-[22px] font-bold leading-tight" style={{ color: pnlPositive ? "#00E676" : "#FF5252", fontFamily: "var(--font-space-mono, monospace)" }}>
          {fmtKES(s.net_pnl, true)}
        </p>
        <p className="text-[11px] text-[#8888A0] mt-1">
          {fmtKES(s.realized_pnl, true)} realized &nbsp;·&nbsp; {fmtKES(s.unrealized_pnl, true)} unrealized
        </p>
      </div>

      {/* Total trades */}
      <div className="rounded-2xl border border-[#2A2A3E] p-4" style={{ background: "#12121E" }}>
        <p className="text-[11px] text-[#8888A0] font-medium uppercase tracking-wider mb-1">Total Trades</p>
        <p className="text-[24px] font-bold text-white leading-tight" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>{s.total_trades}</p>
        <p className="text-[11px] text-[#8888A0] mt-1">across {s.markets_traded} markets</p>
      </div>

      {/* Win rate */}
      <div className="rounded-2xl border border-[#2A2A3E] p-4" style={{ background: "#12121E" }}>
        <p className="text-[11px] text-[#8888A0] font-medium uppercase tracking-wider mb-1">Win Rate</p>
        <div className="flex items-center gap-3">
          <CircularProgress pct={s.win_rate ?? 0} size={44} />
          <div>
            <p className="text-[18px] font-bold text-white" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>{s.win_rate}%</p>
            <p className="text-[11px] text-[#8888A0]">{s.win_count} of {s.resolved_count} resolved</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio chart ──────────────────────────────────────────────────────────

type Interval = "24h" | "7d" | "30d" | "90d" | "all";
const INTERVALS: Interval[] = ["24h", "7d", "30d", "90d", "all"];

function PortfolioChart({ interval, onInterval }: { interval: Interval; onInterval: (v: Interval) => void }) {
  const data  = MOCK_PORTFOLIO_CHART;
  const first = data[0]?.value ?? 0;
  const last  = data[data.length - 1]?.value ?? 0;
  const up    = last >= first;
  const color = up ? "#00E676" : "#FF5252";

  return (
    <div className="rounded-2xl border border-[#2A2A3E] mb-6 overflow-hidden" style={{ background: "#12121E" }}>
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <p className="text-[12px] text-[#8888A0] font-medium uppercase tracking-wider">Portfolio Value</p>
        <p className="text-[13px] font-bold" style={{ color, fontFamily: "var(--font-space-mono, monospace)" }}>
          {fmtKES(last)} {fmtPct(first > 0 ? ((last - first) / first) * 100 : 0)}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" hide />
          <YAxis domain={["auto", "auto"]} hide />
          <Tooltip
            contentStyle={{ background: "#1A1A2E", border: "1px solid #2A2A3E", borderRadius: 10, fontSize: 12, fontFamily: "var(--font-space-mono, monospace)" }}
            labelStyle={{ color: "#8888A0", fontSize: 11 }}
            itemStyle={{ color }}
            formatter={(v: unknown) => [fmtKES(typeof v === "number" ? v : 0), "Value"]}
            labelFormatter={(label: unknown) => typeof label === "string" ? new Date(label).toLocaleString("en-KE", { month: "short", day: "numeric" }) : ""}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#chartFill)"
            dot={false} activeDot={{ r: 4, fill: color, stroke: "#12121E", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Interval selector */}
      <div className="flex gap-1.5 px-4 pb-3">
        {INTERVALS.map((iv) => (
          <button key={iv} onClick={() => onInterval(iv)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer"
            style={{ background: interval === iv ? "#7B2FBE" : "transparent", color: interval === iv ? "#ffffff" : "#8888A0", border: `1px solid ${interval === iv ? "#7B2FBE" : "#2A2A3E"}` }}>
            {iv}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Position card ────────────────────────────────────────────────────────────

function PositionCard({ pos, onClick }: { pos: MockPosition; onClick: () => void }) {
  const hasYes  = (pos.yes_shares ?? 0) > 0;
  const shares  = hasYes ? pos.yes_shares : pos.no_shares;
  const side    = hasYes ? "YES" : "NO";
  const color   = hasYes ? "#00E676" : "#FF5252";
  const avgP    = hasYes ? pos.avg_buy_price_yes : pos.avg_buy_price_no;
  const curP    = hasYes ? (pos.market?.yes_price ?? 50) : (pos.market?.no_price ?? 50);
  const pct     = avgP > 0 ? ((curP - avgP) / avgP) * 100 : 0;
  const unrlzd  = pos.unrealized_pnl / 100;
  const up      = unrlzd >= 0;

  return (
    <div onClick={onClick}
      className="rounded-2xl border border-[#2A2A3E] p-4 cursor-pointer transition-all duration-200"
      style={{ background: "#12121E" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3A2A5E"; e.currentTarget.style.background = "#1A1A2E"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.background = "#12121E"; }}>
      <div className="flex items-start gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
          style={{
            background: pos.category === "politics" ? "rgba(123,47,190,0.18)" : pos.category === "sports" ? "rgba(0,150,136,0.15)" : "rgba(244,114,182,0.15)",
            color: pos.category === "politics" ? "#C4B5FD" : pos.category === "sports" ? "#4DB6AC" : "#F472B6",
          }}>
          {pos.category}
        </span>
        <p className="text-[13px] font-semibold text-white leading-snug line-clamp-1 flex-1">{pos.question}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-[12px]">
        <div>
          <p className="text-[#8888A0] mb-0.5">Position</p>
          <p className="font-bold" style={{ color, fontFamily: "var(--font-space-mono, monospace)" }}>{shares} {side}</p>
        </div>
        <div>
          <p className="text-[#8888A0] mb-0.5">Avg → Now</p>
          <p className="font-bold text-[#E8E8F0]" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>{avgP}¢ → {curP}¢</p>
        </div>
        <div className="text-right">
          <p className="text-[#8888A0] mb-0.5">Unrealized</p>
          <p className="font-bold" style={{ color: up ? "#00E676" : "#FF5252", fontFamily: "var(--font-space-mono, monospace)" }}>
            {fmtKES(unrlzd, true)}
          </p>
          <p className="text-[10px]" style={{ color: up ? "#00E676" : "#FF5252" }}>{fmtPct(pct)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Trade row ────────────────────────────────────────────────────────────────

function TradeRowItem({ trade }: { trade: MockTrade }) {
  const isBuy = trade.side === "buy";
  const color = isBuy ? "#00E676" : "#FF5252";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#1E1E2E] last:border-0">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: isBuy ? "rgba(0,230,118,0.12)" : "rgba(255,82,82,0.12)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {isBuy ? <><path d="M12 2v20M17 7l-5-5-5 5"/></> : <><path d="M12 22V2M7 17l5 5 5-5"/></>}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-white line-clamp-1 flex-1">{trade.market?.question ?? "Market"}</p>
          <p className="text-[12px] font-bold flex-shrink-0" style={{ color, fontFamily: "var(--font-space-mono, monospace)" }}>
            {fmtKES(trade.total_value / 100)}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] font-semibold" style={{ color }}>
            {isBuy ? "Bought" : "Sold"} {trade.quantity} {trade.outcome_token.toUpperCase()}
          </span>
          <span className="text-[11px] text-[#8888A0]">at {trade.price}¢</span>
          {trade.fee_amount > 0 && <span className="text-[11px] text-[#8888A0]">· Fee {fmtKES(trade.fee_amount / 100)}</span>}
          <span className="text-[11px] text-[#8888A0] ml-auto">{timeAgo(trade.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const router   = useRouter();
  const [interval, setInterval] = useState<Interval>("30d");
  const groups = groupTradesByDate(MOCK_TRADES);

  return (
    <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto">

      <h1 className="text-white text-[24px] font-bold mb-5">Portfolio</h1>

      {/* Summary cards */}
      <SummaryCards />

      {/* Chart */}
      <PortfolioChart interval={interval} onInterval={setInterval} />

      {/* Active positions */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[16px] font-semibold text-white">Active Positions</h2>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(123,47,190,0.18)", color: "#C4B5FD" }}>
            {MOCK_POSITIONS.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MOCK_POSITIONS.map((p) => (
            <PositionCard
              key={p.id}
              pos={p}
              onClick={() => router.push(`/markets/${p.slug}`)}
            />
          ))}
        </div>
      </div>

      {/* Trade history */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[16px] font-semibold text-white">Trade History</h2>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(123,47,190,0.18)", color: "#C4B5FD" }}>
            {MOCK_TRADES.length}
          </span>
        </div>

        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8888A0] mb-2 px-1">{g.label}</p>
            <div className="rounded-2xl border border-[#2A2A3E] px-4" style={{ background: "#12121E" }}>
              {g.trades.map((t) => <TradeRowItem key={t.id} trade={t} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
