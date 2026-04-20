"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";

interface MarketData {
  id: string;
  question: string;
  yes_price: number;
  no_price: number;
  total_volume: number;
  total_trades: number;
  participant_count: number;
  status: string;
  resolution_deadline: string;
}

interface ResolutionPreview {
  yes_holders: number;
  no_holders: number;
  yes_shares_total: number;
  no_shares_total: number;
  yes_payout_kes: number;
  no_payout_kes: number;
}

export default function ResolveMarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const showToast = useToast();

  const [market, setMarket] = useState<MarketData | null>(null);
  const [preview, setPreview] = useState<ResolutionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const token = await user.getIdToken();

      const [mRes, posRes] = await Promise.all([
        fetch(`/api/admin/markets/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/markets/${id}/positions`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (mRes.ok) {
        const data = await mRes.json();
        setMarket(data.market);
      } else {
        showToast("Market not found", "error");
        router.push("/admin/markets");
        return;
      }

      // positions endpoint may not exist yet — gracefully handle
      if (posRes.ok) {
        const posData = await posRes.json();
        setPreview(posData);
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  // Compute rough preview from market data when positions endpoint unavailable
  const derivedPreview = preview ?? (market ? {
    yes_holders: Math.ceil(market.participant_count * (market.yes_price / 100)),
    no_holders: Math.ceil(market.participant_count * (market.no_price / 100)),
    yes_shares_total: Math.floor(market.total_volume * 0.5 / (market.yes_price || 50)),
    no_shares_total: Math.floor(market.total_volume * 0.5 / (market.no_price || 50)),
    yes_payout_kes: Math.floor(market.total_volume * 0.5),
    no_payout_kes: Math.floor(market.total_volume * 0.5),
  } : null);

  async function handleResolve() {
    if (!selectedOutcome || confirmText !== "RESOLVE" || !user) return;
    setResolving(true);

    const token = await user.getIdToken();
    const res = await fetch(`/api/admin/markets/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ outcome: selectedOutcome }),
    });

    const data = await res.json();
    if (res.ok) {
      const kes = data.total_payout_kes ?? 0;
      const winners = data.winners_count ?? 0;
      showToast(
        `Market resolved as ${selectedOutcome.toUpperCase()}. KES ${kes.toLocaleString()} distributed to ${winners} winners.`,
        "success"
      );
      router.push("/admin/markets");
    } else {
      showToast(data.error ?? "Resolution failed", "error");
      setResolving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#1E1E2E" strokeWidth="3" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg border border-[#2A2A3E] cursor-pointer"
          style={{ color: "#8888A0" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#E8E8F0"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8888A0"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-white text-[22px] font-bold">Resolve Market</h1>
          <p className="text-[12px]" style={{ color: "#FF6B35" }}>This action is permanent and cannot be undone</p>
        </div>
      </div>

      {/* Market info */}
      <div className="rounded-2xl border border-[#2A2A3E] p-5 mb-5" style={{ background: "#12121E" }}>
        <p className="text-white font-semibold text-[16px] leading-snug mb-4">{market?.question}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: "#0A0A12" }}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#8888A0" }}>YES Price</p>
            <p className="text-[18px] font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
              {market?.yes_price}¢
            </p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#0A0A12" }}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#8888A0" }}>Volume</p>
            <p className="text-[16px] font-bold text-white" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
              {(market?.total_volume ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#0A0A12" }}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#8888A0" }}>Trades</p>
            <p className="text-[16px] font-bold text-white">
              {(market?.total_trades ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Outcome selector */}
      <div className="rounded-2xl border border-[#2A2A3E] p-5 mb-5" style={{ background: "#12121E" }}>
        <p className="text-[13px] font-semibold text-white mb-4">Choose Resolution Outcome</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedOutcome("yes")}
            className="py-5 rounded-2xl text-[18px] font-bold transition-all cursor-pointer border-2"
            style={{
              background: selectedOutcome === "yes" ? "rgba(0,230,118,0.15)" : "rgba(0,230,118,0.05)",
              color: "#00E676",
              borderColor: selectedOutcome === "yes" ? "#00E676" : "rgba(0,230,118,0.2)",
              boxShadow: selectedOutcome === "yes" ? "0 0 20px rgba(0,230,118,0.15)" : "none",
            }}
          >
            ✓ Resolve YES
            <p className="text-[12px] font-normal mt-1 opacity-70">The event happened</p>
          </button>
          <button
            onClick={() => setSelectedOutcome("no")}
            className="py-5 rounded-2xl text-[18px] font-bold transition-all cursor-pointer border-2"
            style={{
              background: selectedOutcome === "no" ? "rgba(255,82,82,0.15)" : "rgba(255,82,82,0.05)",
              color: "#FF5252",
              borderColor: selectedOutcome === "no" ? "#FF5252" : "rgba(255,82,82,0.2)",
              boxShadow: selectedOutcome === "no" ? "0 0 20px rgba(255,82,82,0.15)" : "none",
            }}
          >
            ✗ Resolve NO
            <p className="text-[12px] font-normal mt-1 opacity-70">The event did not happen</p>
          </button>
        </div>
      </div>

      {/* Impact preview */}
      {selectedOutcome && derivedPreview && (
        <div className="rounded-2xl border p-5 mb-5" style={{
          background: "#12121E",
          borderColor: selectedOutcome === "yes" ? "rgba(0,230,118,0.2)" : "rgba(255,82,82,0.2)",
        }}>
          <p className="text-[13px] font-semibold text-white mb-3">Payout Impact Preview</p>
          <div className="space-y-2 text-[13px]">
            {selectedOutcome === "yes" ? (
              <>
                <div className="flex justify-between py-2 border-b" style={{ borderColor: "#1E1E2E" }}>
                  <span style={{ color: "#8888A0" }}>YES holders (winners)</span>
                  <span className="font-semibold" style={{ color: "#00E676" }}>~{derivedPreview.yes_holders} users</span>
                </div>
                <div className="flex justify-between py-2 border-b" style={{ borderColor: "#1E1E2E" }}>
                  <span style={{ color: "#8888A0" }}>NO holders (lose shares)</span>
                  <span className="font-semibold" style={{ color: "#FF5252" }}>~{derivedPreview.no_holders} users</span>
                </div>
                <div className="flex justify-between py-2 rounded-xl px-3" style={{ background: "rgba(0,230,118,0.06)" }}>
                  <span className="font-semibold text-white">Total KES to distribute</span>
                  <span className="font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
                    KES {derivedPreview.yes_payout_kes.toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-2 border-b" style={{ borderColor: "#1E1E2E" }}>
                  <span style={{ color: "#8888A0" }}>NO holders (winners)</span>
                  <span className="font-semibold" style={{ color: "#00E676" }}>~{derivedPreview.no_holders} users</span>
                </div>
                <div className="flex justify-between py-2 border-b" style={{ borderColor: "#1E1E2E" }}>
                  <span style={{ color: "#8888A0" }}>YES holders (lose shares)</span>
                  <span className="font-semibold" style={{ color: "#FF5252" }}>~{derivedPreview.yes_holders} users</span>
                </div>
                <div className="flex justify-between py-2 rounded-xl px-3" style={{ background: "rgba(0,230,118,0.06)" }}>
                  <span className="font-semibold text-white">Total KES to distribute</span>
                  <span className="font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
                    KES {derivedPreview.no_payout_kes.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation step */}
      {selectedOutcome && (
        <div className="rounded-2xl border p-5" style={{
          background: "#12121E",
          borderColor: "rgba(255,107,53,0.3)",
        }}>
          <p className="text-[13px] font-semibold text-white mb-1">Confirm Resolution</p>
          <p className="text-[12px] mb-4" style={{ color: "#8888A0" }}>
            You are about to resolve this market as{" "}
            <strong style={{ color: selectedOutcome === "yes" ? "#00E676" : "#FF5252" }}>
              {selectedOutcome.toUpperCase()}
            </strong>
            . This is permanent. Type <strong style={{ color: "#FF6B35" }}>RESOLVE</strong> to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type RESOLVE to confirm"
            className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] mb-4"
            style={{ background: "#0A0A12" }}
            onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
            onBlur={(e) => { e.target.style.borderColor = "#2A2A3E"; }}
          />
          <button
            onClick={handleResolve}
            disabled={confirmText !== "RESOLVE" || resolving}
            className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white transition-all cursor-pointer"
            style={{
              background: confirmText === "RESOLVE"
                ? (selectedOutcome === "yes" ? "linear-gradient(135deg, #00C853, #00E676)" : "linear-gradient(135deg, #D32F2F, #FF5252)")
                : "#1E1E2E",
              color: confirmText === "RESOLVE" ? "white" : "#8888A0",
              cursor: confirmText !== "RESOLVE" ? "not-allowed" : "pointer",
              opacity: resolving ? 0.7 : 1,
            }}
          >
            {resolving ? "Resolving…" : `Confirm Resolution — ${selectedOutcome?.toUpperCase()}`}
          </button>
        </div>
      )}
    </div>
  );
}
