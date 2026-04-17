"use client";

import { useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  MOCK_MARKETS, MOCK_USER, getMarketBySlug, getRelatedMarkets, getPositionForMarket,
  MOCK_COMMENTS, getAIPredictionForMarket, type MockMarket, type MockPosition,
} from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";
import { EmotionWidget } from "@/components/emotion-widget";

// ─── Types ────────────────────────────────────────────────────────────────────

type Interval = "1h" | "6h" | "1d" | "1w" | "1m" | "all";
type TradeSide = "buy" | "sell";

const INTERVALS: Interval[] = ["1h", "6h", "1d", "1w", "1m", "all"];

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  politics:      { bg: "rgba(123,47,190,0.18)", color: "#C4B5FD" },
  sports:        { bg: "rgba(0,150,136,0.15)",  color: "#4DB6AC" },
  entertainment: { bg: "rgba(244,114,182,0.15)", color: "#F472B6" },
  fashion:       { bg: "rgba(255,179,0,0.12)",  color: "#FFB300" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtVol(v: number) {
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `KES ${(v / 1_000).toFixed(1)}K`;
  return `KES ${v}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function fmtXAxis(ts: string, interval: Interval) {
  const d = new Date(ts);
  if (interval === "1h" || interval === "6h" || interval === "1d")
    return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  if (interval === "all") return d.toLocaleDateString("en-KE", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}

function Skel({ className }: { className?: string }) {
  return <div className={`rounded-lg animate-pulse bg-[#2A2A3E] ${className ?? ""}`} />;
}

// ─── Probability Chart ───────────────────────────────────────────────────────

function ProbabilityChart({ data, interval, onInterval }: {
  data: { timestamp: string; yesPrice: number }[];
  interval: Interval;
  onInterval: (v: Interval) => void;
}) {
  if (!data.length) return null;

  const first  = data[0]?.yesPrice ?? 50;
  const last   = data[data.length - 1]?.yesPrice ?? 50;
  const up     = last >= first;
  const color  = up ? "#00E676" : "#FF5252";

  return (
    <div className="rounded-2xl border border-[#2A2A3E] mb-5 overflow-hidden" style={{ background: "#12121E" }}>
      <div className="px-4 pt-4 pb-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold" style={{ color, fontFamily: "var(--font-space-mono, monospace)" }}>{last}¢</span>
          <span className="text-[11px]" style={{ color }}>{up ? "▲" : "▼"} {Math.abs(last - first).toFixed(1)}¢</span>
        </div>
        <p className="text-[11px] text-[#8888A0]">YES probability over time</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(v) => fmtXAxis(v, interval)}
            tickCount={Math.min(data.length, 6)}
            tick={{ fill: "#8888A0", fontSize: 10, fontFamily: "var(--font-space-mono, monospace)" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            domain={[0, 100]} tickFormatter={(v) => `${v}¢`}
            tick={{ fill: "#8888A0", fontSize: 10, fontFamily: "var(--font-space-mono, monospace)" }}
            axisLine={false} tickLine={false} width={36}
          />
          <Tooltip
            contentStyle={{ background: "#1A1A2E", border: "1px solid #2A2A3E", borderRadius: 10, fontSize: 12, fontFamily: "var(--font-space-mono, monospace)" }}
            labelStyle={{ color: "#8888A0", fontSize: 10 }}
            itemStyle={{ color }}
            formatter={(v: unknown) => [`${typeof v === "number" ? v : 0}¢`, "YES"]}
            labelFormatter={(label: unknown) => typeof label === "string" ? new Date(label).toLocaleString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
          />
          <Area type="monotone" dataKey="yesPrice" stroke={color} strokeWidth={2} fill="url(#yesGrad)"
            dot={false} activeDot={{ r: 4, fill: color, stroke: "#12121E", strokeWidth: 2 }} animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-1 px-4 py-3 border-t border-[#1E1E2E]">
        {INTERVALS.map((iv) => (
          <button key={iv} onClick={() => onInterval(iv)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer"
            style={{ background: interval === iv ? "#7B2FBE" : "transparent", color: interval === iv ? "#fff" : "#8888A0" }}>
            {iv}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Outcome row ─────────────────────────────────────────────────────────────

function OutcomeRow({ id, price, volume, onSelect, selected }: {
  id: "yes" | "no"; price: number; volume: number; onSelect: () => void; selected: boolean;
}) {
  const isYes = id === "yes";
  const color = isYes ? "#00E676" : "#FF5252";
  return (
    <div onClick={onSelect}
      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 border"
      style={{ background: selected ? "rgba(123,47,190,0.08)" : "#12121E", borderColor: selected ? "#7B2FBE" : "#2A2A3E" }}
      onMouseEnter={(e) => { if (!selected) { e.currentTarget.style.borderColor = "#3A2A5E"; e.currentTarget.style.background = "#1A1A2E"; } }}
      onMouseLeave={(e) => { if (!selected) { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.background = "#12121E"; } }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0"
        style={{ background: isYes ? "rgba(0,230,118,0.15)" : "rgba(255,82,82,0.15)" }}>
        {isYes ? "✓" : "✕"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-white">{isYes ? "Yes" : "No"}</p>
        <p className="text-[11px] text-[#8888A0]">{fmtVol(volume)} vol.</p>
      </div>
      <p className="text-[18px] font-bold" style={{ color, fontFamily: "var(--font-space-mono, monospace)" }}>{price}¢</p>
    </div>
  );
}

// ─── Summary row ─────────────────────────────────────────────────────────────

function SummaryRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-[#8888A0]">{label}</span>
      <span style={{ color: color ?? "#E8E8F0", fontFamily: "var(--font-space-mono, monospace)", fontWeight: bold ? 700 : 600 }}>{value}</span>
    </div>
  );
}

// ─── Position display ─────────────────────────────────────────────────────────

function PositionDisplay({ position, yesPrice, noPrice }: {
  position: MockPosition; yesPrice: number; noPrice: number;
}) {
  const hasYes = (position.yes_shares ?? 0) > 0;
  const side   = hasYes ? "YES" : "NO";
  const shares = hasYes ? position.yes_shares : position.no_shares;
  const avgP   = hasYes ? position.avg_buy_price_yes : position.avg_buy_price_no;
  const curP   = hasYes ? yesPrice : noPrice;
  const worth  = shares * curP;
  const unrlzd = (curP - avgP) * shares;
  const pct    = avgP > 0 ? ((curP - avgP) / avgP) * 100 : 0;
  const up     = unrlzd >= 0;
  const color  = up ? "#00E676" : "#FF5252";

  return (
    <div className="rounded-xl border border-[#2A2A3E] p-3" style={{ background: "#0A0A12" }}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#8888A0] mb-2">Your Position</p>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-bold" style={{ color: hasYes ? "#00E676" : "#FF5252", fontFamily: "var(--font-space-mono, monospace)" }}>
          {shares} {side} shares
        </span>
        <span className="text-[12px] font-bold text-white" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
          Worth KES {worth.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#8888A0]">Avg: KES {avgP}</span>
        <span style={{ color, fontFamily: "var(--font-space-mono, monospace)" }}>
          {up ? "+" : "−"}KES {Math.abs(unrlzd).toLocaleString()} ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

// ─── Trading Panel ────────────────────────────────────────────────────────────

function TradingPanel({ market, position, onSuccess }: {
  market: MockMarket;
  position: MockPosition | undefined;
  onSuccess: (msg: string) => void;
}) {
  const router = useRouter();

  const [tradeSide, setTradeSide] = useState<TradeSide>("buy");
  const [yesNo, setYesNo]         = useState<"yes" | "no">("yes");
  const [qty, setQty]             = useState("");
  const [trading, setTrading]     = useState(false);
  const [localPos, setLocalPos]   = useState<MockPosition | undefined>(position);
  const [balance, setBalance]     = useState(MOCK_USER.kesBalance / 100);

  const liveYesPrice = market.yes_price;
  const liveNoPrice  = market.no_price;
  const currentPrice = yesNo === "yes" ? liveYesPrice : liveNoPrice;
  const qtyNum       = Math.max(0, Math.floor(parseFloat(qty) || 0));

  const tradeValue = qtyNum * currentPrice;
  const fee        = Math.floor(tradeValue * 0.02);
  const total      = tradeSide === "buy" ? tradeValue + fee : tradeValue - fee;
  const potPayout  = qtyNum * 100;
  const potProfit  = potPayout - tradeValue;

  const heldYes = localPos?.yes_shares ?? 0;
  const heldNo  = localPos?.no_shares  ?? 0;
  const heldShares  = yesNo === "yes" ? heldYes : heldNo;
  const avgPrice    = yesNo === "yes" ? (localPos?.avg_buy_price_yes ?? currentPrice) : (localPos?.avg_buy_price_no ?? currentPrice);
  const realizedPL  = (currentPrice - avgPrice) * qtyNum;

  const insufficientBalance = tradeSide === "buy" && tradeValue > 0 && (tradeValue + fee) > balance;
  const insufficientShares  = tradeSide === "sell" && qtyNum > 0 && qtyNum > heldShares;
  const isDisabled = trading || qtyNum < 1 || insufficientBalance || insufficientShares;

  async function placeTrade() {
    if (isDisabled) return;
    setTrading(true);
    // Simulate a small delay
    await new Promise((r) => setTimeout(r, 600));
    setTrading(false);

    // Update local balance and position state
    if (tradeSide === "buy") {
      setBalance((b) => b - total);
      setLocalPos((prev) => {
        const base = prev ?? { ...market, marketId: market.id, slug: market.slug, question: market.question, category: market.category ?? "politics", id: "pos_new", yes_shares: 0, no_shares: 0, avg_buy_price_yes: 0, avg_buy_price_no: 0, currentPrice, unrealized_pnl: 0, position_value: 0, realized_pnl: 0 };
        if (yesNo === "yes") {
          const newShares = (base.yes_shares ?? 0) + qtyNum;
          const newAvg    = newShares > 0 ? Math.round(((base.avg_buy_price_yes ?? currentPrice) * (base.yes_shares ?? 0) + currentPrice * qtyNum) / newShares) : currentPrice;
          return { ...base, yes_shares: newShares, avg_buy_price_yes: newAvg };
        } else {
          const newShares = (base.no_shares ?? 0) + qtyNum;
          const newAvg    = newShares > 0 ? Math.round(((base.avg_buy_price_no ?? currentPrice) * (base.no_shares ?? 0) + currentPrice * qtyNum) / newShares) : currentPrice;
          return { ...base, no_shares: newShares, avg_buy_price_no: newAvg };
        }
      });
    } else {
      setBalance((b) => b + total);
      setLocalPos((prev) => {
        if (!prev) return prev;
        if (yesNo === "yes") return { ...prev, yes_shares: Math.max(0, prev.yes_shares - qtyNum) };
        return { ...prev, no_shares: Math.max(0, prev.no_shares - qtyNum) };
      });
    }

    const msg = tradeSide === "buy"
      ? `Bought ${qtyNum} ${yesNo.toUpperCase()} shares at KES ${currentPrice}`
      : `Sold ${qtyNum} ${yesNo.toUpperCase()} shares for KES ${total}`;
    setQty("");
    onSuccess(msg);
  }

  return (
    <div className="rounded-2xl border border-[#2A2A3E] overflow-hidden" style={{ background: "#12121E" }}>
      <div className="p-4 flex flex-col gap-3.5">

        {/* Buy / Sell tabs */}
        <div className="flex rounded-xl overflow-hidden border border-[#2A2A3E]" style={{ background: "#0A0A12" }}>
          {(["buy", "sell"] as TradeSide[]).map((tab) => (
            <button key={tab} onClick={() => { setTradeSide(tab); }}
              className="flex-1 py-2 text-[13px] font-semibold capitalize transition-all duration-150 cursor-pointer"
              style={{ background: tradeSide === tab ? (tab === "buy" ? "#7B2FBE" : "#FF5252") : "transparent", color: tradeSide === tab ? "white" : "#8888A0" }}>
              {tab}
            </button>
          ))}
        </div>

        {/* YES / NO selector */}
        <div className="flex gap-2">
          <button onClick={() => setYesNo("yes")}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150 cursor-pointer"
            style={{ background: yesNo === "yes" ? "#00E676" : "rgba(0,230,118,0.10)", color: yesNo === "yes" ? "#0A0A12" : "#00E676", border: `1px solid ${yesNo === "yes" ? "#00E676" : "rgba(0,230,118,0.25)"}` }}>
            Yes {liveYesPrice}¢
          </button>
          <button onClick={() => setYesNo("no")}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150 cursor-pointer"
            style={{ background: yesNo === "no" ? "#FF5252" : "rgba(255,82,82,0.10)", color: yesNo === "no" ? "#ffffff" : "#FF5252", border: `1px solid ${yesNo === "no" ? "#FF5252" : "rgba(255,82,82,0.25)"}` }}>
            No {liveNoPrice}¢
          </button>
        </div>

        {/* Quantity input */}
        <div>
          <label className="text-[12px] text-[#8888A0] font-medium mb-1.5 block">How many shares?</label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#2A2A3E] transition-colors focus-within:border-[#7B2FBE]"
            style={{ background: "#0A0A12" }}>
            <input
              type="number" min="1" max="10000" step="1"
              value={qty} onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-[18px] font-bold text-white outline-none min-w-0"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            />
            <span className="text-[12px] text-[#8888A0] font-medium flex-shrink-0">shares</span>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[10, 50, 100, 500].map((v) => (
              <button key={v}
                onClick={() => setQty((prev) => String(Math.max(0, (parseInt(prev) || 0) + v)))}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer border border-[#2A2A3E]"
                style={{ color: "#8888A0" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7B2FBE"; e.currentTarget.style.color = "#C4B5FD"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.color = "#8888A0"; }}>
                +{v}
              </button>
            ))}
          </div>
        </div>

        {/* Cost summary */}
        {qtyNum > 0 && (
          <div className="rounded-xl border border-[#2A2A3E] p-3 flex flex-col gap-2" style={{ background: "#0A0A12" }}>
            {tradeSide === "buy" ? (
              <>
                <SummaryRow label="Cost"             value={`KES ${tradeValue.toLocaleString()}`} />
                <SummaryRow label="Fee (2%)"          value={`KES ${fee.toLocaleString()}`} />
                <SummaryRow label="Total"             value={`KES ${total.toLocaleString()}`} bold />
                <div style={{ borderTop: "1px solid #2A2A3E", marginTop: 2, paddingTop: 6 }}>
                  <SummaryRow label="Potential payout" value={`KES ${potPayout.toLocaleString()}`} color="#00E676" />
                  <SummaryRow label="Potential profit" value={`KES ${potProfit.toLocaleString()}`} color={potProfit >= 0 ? "#00E676" : "#FF5252"} />
                </div>
                {insufficientBalance && <p className="text-[11px] text-[#FF5252] font-medium">Insufficient balance (need KES {total.toLocaleString()})</p>}
              </>
            ) : (
              <>
                <SummaryRow label="Revenue"    value={`KES ${tradeValue.toLocaleString()}`} />
                <SummaryRow label="Fee (2%)"    value={`KES ${fee.toLocaleString()}`} />
                <SummaryRow label="You receive" value={`KES ${total.toLocaleString()}`} bold />
                {heldShares > 0 && (
                  <div style={{ borderTop: "1px solid #2A2A3E", marginTop: 2, paddingTop: 6 }}>
                    <SummaryRow label="Est. P&L" value={`KES ${realizedPL.toLocaleString()}`} color={realizedPL >= 0 ? "#00E676" : "#FF5252"} />
                  </div>
                )}
                {insufficientShares && <p className="text-[11px] text-[#FF5252] font-medium">You only hold {heldShares} {yesNo.toUpperCase()} shares</p>}
              </>
            )}
          </div>
        )}

        {/* Trade button */}
        <button onClick={placeTrade} disabled={isDisabled}
          className="w-full py-3 rounded-xl text-[14px] font-bold cursor-pointer transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            background: isDisabled ? "#2A2A3E" : tradeSide === "buy" ? "linear-gradient(90deg, #00C853, #00E676)" : "transparent",
            color: isDisabled ? "#8888A0" : tradeSide === "buy" ? "#0A0A12" : "#FF5252",
            border: !isDisabled && tradeSide === "sell" ? "1px solid #FF5252" : "none",
            cursor: isDisabled ? "not-allowed" : "pointer",
          }}>
          {trading && (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          )}
          {trading
            ? "Placing trade…"
            : qtyNum > 0
              ? `${tradeSide === "buy" ? "Buy" : "Sell"} ${qtyNum} ${yesNo.toUpperCase()} shares`
              : `${tradeSide === "buy" ? "Buy" : "Sell"} ${yesNo.toUpperCase()}`}
        </button>

        {/* Position */}
        {localPos && ((localPos.yes_shares ?? 0) > 0 || (localPos.no_shares ?? 0) > 0) && (
          <PositionDisplay position={localPos} yesPrice={liveYesPrice} noPrice={liveNoPrice} />
        )}

        {/* Balance */}
        <div className="flex items-center justify-between pt-1 border-t border-[#1E1E2E]">
          <span className="text-[11px] text-[#8888A0]">
            Available: <span style={{ fontFamily: "var(--font-space-mono, monospace)", color: "#E8E8F0" }}>KES {balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
          </span>
          <button onClick={() => router.push("/wallet")}
            className="text-[11px] font-semibold cursor-pointer transition-colors"
            style={{ color: "#7B2FBE" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#9B4FDE"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#7B2FBE"; }}>
            Deposit →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Related markets ─────────────────────────────────────────────────────────

function RelatedMarkets({ market }: { market: MockMarket }) {
  const router  = useRouter();
  const related = getRelatedMarkets(market, 3);
  if (!related.length) return null;

  return (
    <div className="mt-6">
      <p className="text-[13px] font-bold text-[#8888A0] uppercase tracking-wider mb-3">Related Markets</p>
      <div className="flex flex-col gap-2">
        {related.map((m) => (
          <button key={m.id} onClick={() => router.push(`/markets/${m.slug}`)}
            className="flex items-center gap-3 p-3 rounded-xl border border-[#2A2A3E] text-left cursor-pointer transition-all duration-150"
            style={{ background: "#12121E" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3A2A5E"; e.currentTarget.style.background = "#1A1A2E"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.background = "#12121E"; }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7B2FBE, #9B4FDE)" }}>
              {m.question[0]}
            </div>
            <p className="text-[13px] text-white line-clamp-1 flex-1">{m.question}</p>
            <span className="text-[13px] font-bold flex-shrink-0" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
              {m.yes_price}¢
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Comments section ─────────────────────────────────────────────────────────

function CommentsSection() {
  const [newComment, setNewComment] = useState("");
  const [comments, setComments]     = useState(MOCK_COMMENTS);
  const showToast = useToast();

  function submitComment() {
    if (!newComment.trim()) return;
    setComments((prev) => [
      { id: `c${Date.now()}`, user: MOCK_USER.displayName, avatar: null, body: newComment.trim(), likes: 0, replies: 0, timeAgo: "just now" },
      ...prev,
    ]);
    setNewComment("");
    showToast("Comment posted!", "success");
  }

  function toggleLike(id: string) {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, likes: c.likes + 1 } : c));
  }

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8888A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p className="text-[14px] font-bold text-white">Discussion <span className="text-[#8888A0] font-normal">({comments.length})</span></p>
      </div>

      {/* Input */}
      <div className="flex gap-3 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7B2FBE, #9B4FDE)" }}>
          {MOCK_USER.displayName.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your take…"
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white outline-none resize-none border border-[#2A2A3E] transition-colors focus:border-[#7B2FBE]"
            style={{ background: "#12121E" }}
          />
          <button onClick={submitComment} disabled={!newComment.trim()}
            className="self-end px-4 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-all"
            style={{ background: newComment.trim() ? "#00E676" : "#2A2A3E", color: newComment.trim() ? "#0A0A12" : "#8888A0", cursor: newComment.trim() ? "pointer" : "not-allowed" }}>
            Post
          </button>
        </div>
      </div>

      {/* Comment list */}
      <div className="flex flex-col gap-4">
        {comments.map((c) => {
          const colors = ["#7B2FBE", "#00E676", "#FF5252", "#FFB300", "#4DB6AC", "#F472B6"];
          const colorIdx = c.user.charCodeAt(0) % colors.length;
          return (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: colors[colorIdx] }}>
                {c.user.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-bold text-white">{c.user}</span>
                  <span className="text-[11px] text-[#8888A0]">{c.timeAgo}</span>
                </div>
                <p className="text-[13px] text-[#8888A0] leading-relaxed mb-2">{c.body}</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleLike(c.id)}
                    className="flex items-center gap-1 text-[11px] text-[#8888A0] cursor-pointer transition-colors hover:text-[#FF5252]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {c.likes}
                  </button>
                  <button className="text-[11px] text-[#8888A0] cursor-pointer transition-colors hover:text-white">
                    {c.replies} replies
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

function AIAnalysisSection({ marketId }: { marketId: string }) {
  const [expanded, setExpanded] = useState(false);
  const pred = getAIPredictionForMarket(marketId);
  if (!pred) return null;

  const div = pred.aiProbability - pred.crowdPrice;
  const absDiff = Math.abs(div);
  const divColor = absDiff > 10 ? "#FFB300" : absDiff > 5 ? "#FF8C42" : "#8888A0";

  const confMap: Record<string, { bg: string; color: string }> = {
    high:   { bg: "rgba(0,230,118,0.12)",  color: "#00E676" },
    medium: { bg: "rgba(255,179,0,0.12)",  color: "#FFB300" },
    low:    { bg: "rgba(255,82,82,0.12)",  color: "#FF5252" },
  };
  const confStyle = confMap[pred.confidence] ?? confMap.low;

  function timeAgo(iso: string) {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div className="mb-5 rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(123,47,190,0.25)", borderLeft: "3px solid #7B2FBE", background: "#0D0D1A" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer text-left"
        style={{ background: "transparent" }}>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          <span className="text-[13px] font-bold text-white">SokoResult AI Analysis</span>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md" style={confStyle}>{pred.confidence}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold" style={{ color: divColor, fontFamily: "var(--font-space-mono, monospace)" }}>
            {div > 0 ? "+" : ""}{div} divergence
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8888A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {/* Probability row — always visible */}
      <div className="flex items-center gap-6 px-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8888A0]">AI</span>
          <span className="text-[16px] font-bold" style={{ color: "#C4B5FD", fontFamily: "var(--font-space-mono, monospace)" }}>
            {pred.aiProbability}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8888A0]">Crowd</span>
          <span className="text-[16px] font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
            {pred.crowdPrice}%
          </span>
        </div>
        <div className="ml-auto text-[11px]" style={{ color: "#555577" }}>
          {pred.newsAnalyzed} stories · {timeAgo(pred.updatedAt)}
        </div>
      </div>

      {/* Expandable detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1E1E2E] pt-3">
          <p className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#8888A0" }}>Reasoning</p>
          <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#C8C8D8" }}>{pred.reasoning}</p>
          <p className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#8888A0" }}>Key Factors</p>
          <ul className="space-y-1 mb-3">
            {pred.keyFactors.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "#C8C8D8" }}>
                <span className="flex-shrink-0 mt-0.5" style={{ color: "#7B2FBE" }}>•</span>
                {f}
              </li>
            ))}
          </ul>
          <p className="text-[11px]" style={{ color: "#555577" }}>
            Model: {pred.model ?? "gemini-2.0-flash"} · Updated {timeAgo(pred.updatedAt)}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router   = useRouter();
  const showToast = useToast();

  const market   = getMarketBySlug(slug);
  const position = market ? getPositionForMarket(market.id) : undefined;

  const [interval, setInterval]       = useState<Interval>("1m");
  const [selectedOutcome, setOutcome] = useState<"yes" | "no">("yes");
  const [showMobilePanel, setMobilePanel] = useState(false);

  const chartData = useCallback(() => {
    if (!market) return [];
    return market.priceHistory;
  }, [market])();

  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#8888A0]">
        <p className="text-[18px] font-bold text-white mb-2">Market not found</p>
        <p className="text-[13px] text-[#8888A0] mb-4">The market &quot;{slug}&quot; doesn&apos;t exist in the demo data.</p>
        <button onClick={() => router.push("/markets")} className="text-[14px] text-[#7B2FBE] cursor-pointer underline">
          ← Back to Markets
        </button>
      </div>
    );
  }

  const cs = CAT_COLORS[market.category ?? ""] ?? { bg: "rgba(136,136,160,0.15)", color: "#8888A0" };

  function handleTradeSuccess(msg: string) {
    showToast(msg, "success");
    setMobilePanel(false);
  }

  return (
    <div className="px-4 md:px-6 py-5 max-w-7xl mx-auto">

      {/* Market header */}
      <div className="flex items-start gap-4 mb-5">
        <button onClick={() => router.push("/markets")}
          className="p-2 rounded-lg cursor-pointer transition-colors flex-shrink-0 mt-0.5"
          style={{ color: "#8888A0" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#E8E8F0"; e.currentTarget.style.background = "#1A1A2E"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#8888A0"; e.currentTarget.style.background = "transparent"; }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>

        <div className="w-12 h-12 rounded-full flex items-center justify-center text-[20px] flex-shrink-0"
          style={{ background: cs.bg }}>
          {market.category === "politics" ? "🏛️" : market.category === "sports" ? "⚽" : market.category === "entertainment" ? "🎬" : "👗"}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] md:text-[22px] font-bold text-white leading-snug mb-2">{market.question}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded" style={cs}>{market.category}</span>
            <span className="text-[12px] text-[#8888A0]">{market.total_trades.toLocaleString()} trades</span>
            <span className="text-[12px] text-[#8888A0]">{market.participant_count.toLocaleString()} participants</span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {(["Share", "Bookmark"] as const).map((title) => (
            <button key={title} title={title}
              className="p-2 rounded-lg cursor-pointer transition-colors"
              style={{ color: "#8888A0" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#E8E8F0"; e.currentTarget.style.background = "#1A1A2E"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#8888A0"; e.currentTarget.style.background = "transparent"; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {title === "Share" ? (
                  <><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></>
                ) : (
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                )}
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">

        {/* ── Left column ── */}
        <div>
          <ProbabilityChart data={chartData} interval={interval} onInterval={setInterval} />

          <AIAnalysisSection marketId={market.id} />

          <EmotionWidget marketId={market.id} />

          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap mb-5 px-1">
            <div className="flex items-center gap-1.5 text-[13px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8888A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span className="text-white font-semibold" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>{fmtVol(market.total_volume)}</span>
              <span className="text-[#8888A0]">Vol.</span>
            </div>
            <div className="flex items-center gap-1.5 text-[13px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8888A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span className="text-white font-semibold">{fmtDate(market.resolution_deadline)}</span>
              <span className="text-[#8888A0]">Resolves</span>
            </div>
            <div className="flex items-center gap-1.5 text-[13px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8888A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span className="text-white font-semibold">{market.participant_count}</span>
              <span className="text-[#8888A0]">Traders</span>
            </div>
          </div>

          {/* Outcomes */}
          <div className="mb-5">
            <p className="text-[12px] font-bold uppercase tracking-wider text-[#8888A0] mb-3">Outcomes</p>
            <div className="flex flex-col gap-2">
              <OutcomeRow id="yes" price={market.yes_price} volume={market.total_volume * 0.62}
                selected={selectedOutcome === "yes"} onSelect={() => setOutcome("yes")} />
              <OutcomeRow id="no" price={market.no_price} volume={market.total_volume * 0.38}
                selected={selectedOutcome === "no"} onSelect={() => setOutcome("no")} />
            </div>
          </div>

          {/* Description */}
          {market.description && (
            <div className="p-4 rounded-2xl border border-[#2A2A3E]" style={{ background: "#12121E" }}>
              <p className="text-[12px] font-bold uppercase tracking-wider text-[#8888A0] mb-2">About this market</p>
              <p className="text-[13px] text-[#8888A0] leading-relaxed">{market.description}</p>
              {market.resolution_source && (
                <p className="text-[11px] text-[#8888A0] mt-2">
                  Resolution source: <span className="text-[#C4B5FD]">{market.resolution_source}</span>
                </p>
              )}
            </div>
          )}

          {/* Comments */}
          <CommentsSection />
        </div>

        {/* ── Right column (desktop) ── */}
        <div className="hidden md:block">
          <div className="sticky top-20">
            <TradingPanel market={market} position={position} onSuccess={handleTradeSuccess} />
            <RelatedMarkets market={market} />
          </div>
        </div>
      </div>

      {/* Mobile: sticky trade button */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-4 pb-2"
        style={{ background: "linear-gradient(to top, #0A0A12 70%, transparent)" }}>
        {!showMobilePanel ? (
          <button onClick={() => setMobilePanel(true)}
            className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-[#0A0A12] cursor-pointer"
            style={{ background: "linear-gradient(90deg, #00C853, #00E676)" }}>
            Trade →
          </button>
        ) : (
          <button onClick={() => setMobilePanel(false)}
            className="w-full py-3 rounded-2xl text-[14px] font-semibold text-[#8888A0] cursor-pointer border border-[#2A2A3E]"
            style={{ background: "#12121E" }}>
            ✕ Close
          </button>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {showMobilePanel && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setMobilePanel(false)}>
          <div className="rounded-t-3xl overflow-y-auto max-h-[85dvh] pb-8"
            style={{ background: "#0A0A12" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: "#2A2A3E" }} />
            </div>
            <div className="px-4 pb-4">
              <TradingPanel market={market} position={position} onSuccess={handleTradeSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
