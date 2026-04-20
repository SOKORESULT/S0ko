"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MOCK_MARKETS, getAIPredictionForMarket } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";

const CATEGORY_META: Record<string, { color: string }> = {
  politics:      { color: "#C4B5FD" },
  sports:        { color: "#4DB6AC" },
  entertainment: { color: "#F472B6" },
  fashion:       { color: "#FFB300" },
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    open:     { bg: "rgba(0,230,118,0.12)",  color: "#00E676", label: "Open"     },
    closed:   { bg: "rgba(255,179,0,0.12)",  color: "#FFB300", label: "Closed"   },
    resolved: { bg: "rgba(100,149,237,0.15)", color: "#6495ED", label: "Resolved" },
    disputed: { bg: "rgba(255,82,82,0.12)",  color: "#FF5252", label: "Disputed" },
  };
  const s = styles[status] ?? styles.open;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function AdminMarketsPage() {
  const showToast = useToast();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [runningAiId, setRunningAiId] = useState<string | null>(null);
  const [runningAllAi, setRunningAllAi] = useState(false);

  const markets = useMemo(() => {
    let list = MOCK_MARKETS.filter((m) => !deletedIds.has(m.id));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        m.question.toLowerCase().includes(q) ||
        (m.category ?? "").toLowerCase().includes(q)
      );
    }

    if (sort === "volume")  list = [...list].sort((a, b) => b.total_volume - a.total_volume);
    if (sort === "trades")  list = [...list].sort((a, b) => b.total_trades - a.total_trades);
    if (sort === "status")  list = [...list].sort((a, b) => a.status.localeCompare(b.status));
    if (sort === "newest")  list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return list;
  }, [search, sort, deletedIds]);

  function handleDelete(id: string) {
    setDeletedIds((prev) => new Set([...prev, id]));
    setDeleteConfirmId(null);
    showToast("Market deleted", "success");
  }

  async function runAi(id: string) {
    setRunningAiId(id);
    await new Promise((r) => setTimeout(r, 800));
    setRunningAiId(null);
    showToast("AI prediction updated", "success");
  }

  async function runAllAi() {
    setRunningAllAi(true);
    await new Promise((r) => setTimeout(r, 1500));
    setRunningAllAi(false);
    showToast("AI predictions run for all open markets", "success");
  }

  return (
    <div className="px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-[22px] font-bold">Markets</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#8888A0" }}>
            {markets.length} total markets across all statuses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runAllAi} disabled={runningAllAi}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-white cursor-pointer transition-all disabled:opacity-60"
            style={{ background: "rgba(123,47,190,0.18)", border: "1px solid rgba(123,47,190,0.3)", color: "#C4B5FD" }}>
            {runningAllAi ? (
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(196,181,253,0.3)" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
            Run All AI
          </button>
          <Link
            href="/admin/markets/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #FF6B35, #FF4500)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.88"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Market
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[200px] relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8888A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search markets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] focus:border-[#FF6B35] transition-colors"
            style={{ background: "#12121E" }}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] cursor-pointer"
          style={{ background: "#12121E" }}
        >
          <option value="newest">Newest</option>
          <option value="volume">Most Volume</option>
          <option value="trades">Most Traded</option>
          <option value="status">By Status</option>
        </select>
      </div>

      {/* Table */}
      {markets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-[#8888A0] text-[15px]">No markets found</p>
          <Link href="/admin/markets/create" className="text-[13px] font-semibold" style={{ color: "#FF6B35" }}>
            Create the first one →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#1E1E2E] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "#0D0D1A", borderBottom: "1px solid #1E1E2E" }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Question</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: "#8888A0" }}>Category</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Status</th>
                  <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell" style={{ color: "#8888A0" }}>YES</th>
                  <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell" style={{ color: "#8888A0" }}>Volume</th>
                  <th className="text-right px-4 py-3 font-semibold hidden xl:table-cell" style={{ color: "#8888A0" }}>Trades</th>
                  <th className="text-left px-4 py-3 font-semibold hidden xl:table-cell" style={{ color: "#8888A0" }}>Deadline</th>
                  <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell" style={{ color: "#8888A0" }}>AI Prediction</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m, i) => {
                  const catMeta = m.category ? CATEGORY_META[m.category] : null;
                  const isEven = i % 2 === 0;
                  const deadline = new Date(m.resolution_deadline);
                  const deadlineStr = deadline.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" });
                  const aiPred = getAIPredictionForMarket(m.id);
                  const aiDiv = aiPred ? aiPred.aiProbability - aiPred.crowdPrice : null;

                  return (
                    <tr key={m.id}
                      style={{ background: isEven ? "#0A0A12" : "#0D0D1A", borderBottom: "1px solid #1E1E2E" }}>
                      <td className="px-4 py-3">
                        <div className="max-w-[280px]">
                          <p className="text-white font-medium leading-snug line-clamp-2">{m.question}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {catMeta && m.category ? (
                          <span className="text-[12px] capitalize" style={{ color: catMeta.color }}>
                            {m.category}
                          </span>
                        ) : (
                          <span className="text-[#8888A0]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.status} />
                        {m.outcome && (
                          <span className="ml-1.5 text-[11px] font-bold" style={{ color: m.outcome === "yes" ? "#00E676" : "#FF5252" }}>
                            ({m.outcome.toUpperCase()})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className="font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
                          {m.yes_price}¢
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span style={{ color: "#E8E8F0", fontFamily: "var(--font-space-mono, monospace)" }}>
                          KES {fmt(m.total_volume)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden xl:table-cell">
                        <span style={{ color: "#E8E8F0" }}>{fmt(m.total_trades)}</span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span style={{ color: "#8888A0" }}>{deadlineStr}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-right">
                        {aiPred ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px]" style={{ color: "#8888A0" }}>AI</span>
                              <span className="text-[12px] font-bold" style={{ color: "#C4B5FD", fontFamily: "var(--font-space-mono, monospace)" }}>{aiPred.aiProbability}%</span>
                              <span className="text-[11px]" style={{ color: "#8888A0" }}>vs</span>
                              <span className="text-[12px] font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>{aiPred.crowdPrice}%</span>
                            </div>
                            {aiDiv !== null && (
                              <span className="text-[11px] font-bold" style={{
                                color: Math.abs(aiDiv) > 10 ? "#FFB300" : Math.abs(aiDiv) > 5 ? "#FF8C42" : "#8888A0",
                                fontFamily: "var(--font-space-mono, monospace)",
                              }}>
                                {aiDiv > 0 ? "+" : ""}{aiDiv} div
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px]" style={{ color: "#555577" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {m.status === "open" && (
                            <button
                              onClick={() => runAi(m.id)}
                              disabled={runningAiId === m.id}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer disabled:opacity-50"
                              style={{ color: "#C4B5FD", borderColor: "rgba(196,181,253,0.2)", background: "rgba(196,181,253,0.06)" }}
                            >
                              {runningAiId === m.id ? "…" : "Run AI"}
                            </button>
                          )}
                          <Link
                            href={`/admin/markets/${m.id}/edit`}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border"
                            style={{ color: "#C4B5FD", borderColor: "rgba(196,181,253,0.2)", background: "rgba(196,181,253,0.06)" }}
                          >
                            Edit
                          </Link>
                          {m.status === "open" && (
                            <Link
                              href={`/admin/markets/${m.id}/resolve`}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border"
                              style={{ color: "#FFB300", borderColor: "rgba(255,179,0,0.2)", background: "rgba(255,179,0,0.06)" }}
                            >
                              Resolve
                            </Link>
                          )}
                          {deleteConfirmId === m.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                style={{ background: "#FF5252", color: "white" }}
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold transition-all border border-[#2A2A3E] cursor-pointer"
                                style={{ color: "#8888A0" }}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(m.id)}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer"
                              style={{ color: "#FF5252", borderColor: "rgba(255,82,82,0.2)", background: "rgba(255,82,82,0.06)" }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
