"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKES(cents: number) {
  return `KES ${(Math.abs(cents) / 100).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" });
}

function dateHeader(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-KE", { weekday: "long", month: "long", day: "numeric" });
}

// ─── Deposit / Withdraw modal ─────────────────────────────────────────────────

function MoneyModal({ type, phone, onClose }: { type: "deposit" | "withdraw"; phone: string; onClose: () => void }) {
  const showToast = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const QUICK = [100, 500, 1_000, 5_000];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onClose();
      showToast(
        type === "deposit" ? "Check your phone for M-Pesa prompt" : "Withdrawal request submitted",
        "success"
      );
    }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}>
      <div className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl border border-[#2A2A3E] p-5"
        style={{ background: "#12121E" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold text-white capitalize">{type} via M-Pesa</h2>
          <button onClick={onClose} className="text-[#8888A0] hover:text-white cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Amount input */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-[18px] text-[#8888A0]" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>KES</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="bg-transparent text-[36px] font-bold text-white outline-none text-center w-40"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                required
              />
            </div>
            {/* Quick amounts */}
            <div className="flex gap-2 justify-center">
              {QUICK.map((v) => (
                <button key={v} type="button" onClick={() => setAmount(String(v))}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-all border"
                  style={{ background: amount === String(v) ? "#7B2FBE" : "transparent", color: amount === String(v) ? "white" : "#8888A0", borderColor: amount === String(v) ? "#7B2FBE" : "#2A2A3E" }}>
                  +{v.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-[12px] text-[#8888A0] font-medium mb-1 block">M-Pesa Number</label>
            <input
              defaultValue={phone}
              className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] focus:border-[#4CAF50] transition-colors"
              style={{ background: "#0A0A12" }}
              readOnly
            />
          </div>

          {/* Submit */}
          <button type="submit" disabled={!amount || loading}
            className="w-full py-3.5 rounded-xl text-[14px] font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
            style={{
              background: !amount || loading ? "#2A2A3E" : type === "deposit" ? "#4CAF50" : "#7B2FBE",
              color: !amount || loading ? "#8888A0" : "white",
              cursor: !amount || loading ? "not-allowed" : "pointer",
            }}>
            {loading && (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            )}
            {loading ? "Processing…" : type === "deposit" ? "Deposit via M-Pesa" : "Withdraw via M-Pesa"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.amount > 0;
  const isDeposit = tx.type === "deposit";
  const isWithdraw = tx.type === "withdrawal";

  const iconColor = isCredit ? "#00E676" : "#FF5252";
  const bgColor   = isCredit ? "rgba(0,230,118,0.10)" : "rgba(255,82,82,0.10)";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#1E1E2E] last:border-0">
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: bgColor }}>
        {isDeposit ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 7l-5-5-5 5"/>
          </svg>
        ) : isWithdraw ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22V2M7 17l5 5 5-5"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6495ED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-white line-clamp-1 flex-1">{tx.description}</p>
          <p className="text-[12px] font-bold flex-shrink-0"
            style={{ color: isCredit ? "#00E676" : "#FF5252", fontFamily: "var(--font-space-mono, monospace)" }}>
            {isCredit ? "+" : "−"}{formatKES(tx.amount)}
          </p>
        </div>
        <p className="text-[11px] text-[#8888A0] mt-0.5">{timeAgo(tx.created_at)}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const { profile } = useAuth();
  const [modal, setModal] = useState<"deposit" | "withdraw" | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const balance = profile?.kes_balance ?? 0;
  const phone = profile?.phone ?? "";

  useEffect(() => {
    if (!profile?.id) return;
    fetch("/api/wallet/transactions")
      .then((r) => r.json())
      .then((d: { transactions: Transaction[] }) => {
        setTransactions(d.transactions ?? []);
        setTxLoading(false);
      })
      .catch(() => setTxLoading(false));
  }, [profile?.id]);

  // Group transactions by date
  const groups: { label: string; txs: Transaction[] }[] = [];
  let lastLabel = "";
  for (const t of transactions) {
    const label = dateHeader(t.created_at);
    if (label !== lastLabel) { groups.push({ label, txs: [] }); lastLabel = label; }
    groups[groups.length - 1].txs.push(t);
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto">
      <h1 className="text-white text-[24px] font-bold mb-5">Wallet</h1>

      {/* Demo credits banner */}
      <div className="rounded-xl border px-4 py-3 mb-4 flex items-start gap-3"
        style={{ background: "rgba(255,179,0,0.07)", borderColor: "rgba(255,179,0,0.25)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB300" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-[12px]" style={{ color: "#FFB300" }}>
          Your KES 10,000 is <strong>demo credit</strong> for practice trading — no real money is involved. M-Pesa deposits & withdrawals are coming soon.
        </p>
      </div>

      {/* KES Balance hero */}
      <div className="rounded-2xl border border-[#2A2A3E] p-5 mb-4 text-center" style={{ background: "linear-gradient(135deg, #12121E, #1A1228)" }}>
        <p className="text-[12px] text-[#8888A0] font-medium uppercase tracking-wider mb-2">Available Balance</p>
        <p className="text-[40px] font-bold text-[#00E676] mb-1" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
          {formatKES(balance)}
        </p>
        <p className="text-[12px] text-[#8888A0] mb-4">Available for trading</p>

        {/* Deposit / Withdraw buttons */}
        <div className="flex gap-3 justify-center">
          <button onClick={() => setModal("deposit")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all"
            style={{ background: "#4CAF50", color: "white" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 7l-5-5-5 5"/>
            </svg>
            Deposit
          </button>
          <button onClick={() => setModal("withdraw")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all border border-[#2A2A3E]"
            style={{ background: "transparent", color: "#E8E8F0" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7B2FBE"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V2M7 17l5 5 5-5"/>
            </svg>
            Withdraw
          </button>
        </div>
      </div>

      {/* $OKO balance */}
      <div className="rounded-2xl border border-[#2A2A3E] p-4 mb-6" style={{ background: "#12121E" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-[#8888A0] font-medium uppercase tracking-wider mb-1">$OKO Balance</p>
            <p className="text-[22px] font-bold text-[#C4B5FD]" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
              0 $OKO
            </p>
            <p className="text-[11px] text-[#8888A0] mt-0.5">≈ KES 0.00</p>
          </div>
          <div className="flex gap-2">
            {["Buy $OKO", "Send"].map((label) => (
              <div key={label} className="relative">
                <button disabled
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#2A2A3E] opacity-40 cursor-not-allowed"
                  style={{ color: "#8888A0" }}>
                  {label}
                </button>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-[#8888A0] mt-2">$OKO token features coming in Phase B</p>
      </div>

      {/* Transaction history */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[16px] font-semibold text-white">Transactions</h2>
        {!txLoading && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(123,47,190,0.18)", color: "#C4B5FD" }}>
            {transactions.length}
          </span>
        )}
      </div>

      {txLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-[#1E1E2E] h-16 animate-pulse" style={{ background: "#12121E" }} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-[#1E1E2E] p-8 text-center" style={{ background: "#12121E" }}>
          <p className="text-[13px] text-[#8888A0]">No transactions yet. Start trading to see activity here.</p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.label} className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8888A0] mb-2 px-1">{g.label}</p>
            <div className="rounded-2xl border border-[#2A2A3E] px-4" style={{ background: "#12121E" }}>
              {g.txs.map((t) => <TxRow key={t.id} tx={t} />)}
            </div>
          </div>
        ))
      )}

      {/* Modals */}
      {modal && <MoneyModal type={modal} phone={phone} onClose={() => setModal(null)} />}
    </div>
  );
}
