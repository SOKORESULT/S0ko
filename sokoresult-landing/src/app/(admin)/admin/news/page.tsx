"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

// ─── Source list ──────────────────────────────────────────────────────────────

const SOURCES = [
  { name: "Nation Africa",       type: "RSS",   status: "active" },
  { name: "The Standard",        type: "RSS",   status: "active" },
  { name: "Capital FM",          type: "RSS",   status: "active" },
  { name: "Business Daily",      type: "RSS",   status: "active" },
  { name: "Kenyans.co.ke",       type: "RSS",   status: "active" },
  { name: "The Star",            type: "RSS",   status: "active" },
  { name: "Kenya News Agency",   type: "RSS",   status: "active" },
  { name: "BBC Africa",          type: "RSS",   status: "active" },
  { name: "Africanews",          type: "RSS",   status: "active" },
  { name: "Citizen Digital",     type: "Scrape", status: "active" },
  { name: "Tuko.co.ke",          type: "Scrape", status: "active" },
  { name: "Mpasho",              type: "Scrape", status: "active" },
  { name: "Nairobi News",        type: "Scrape", status: "active" },
  { name: "People Daily",        type: "Scrape", status: "active" },
];

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "#8888A0" }}>{label}</p>
      <p className="text-[24px] font-bold" style={{ color: color ?? "#E8E8F0", fontFamily: "var(--font-space-mono, monospace)" }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "#555577" }}>{sub}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminNewsPage() {
  const showToast = useToast();
  const [ingesting, setIngesting]   = useState(false);
  const [lastResult, setLastResult] = useState<{
    ingested: number; skipped: number; errors: number; total: number; ranAt: string;
  } | null>(null);

  async function runIngestion() {
    setIngesting(true);
    try {
      const res  = await fetch("/api/news/ingest", { method: "POST" });
      const data = await res.json() as { ingested: number; skipped: number; errors: number; total: number };
      setLastResult({ ...data, ranAt: new Date().toLocaleTimeString("en-KE") });
      showToast(`Ingested ${data.ingested} stories · ${data.skipped} skipped`, "success");
    } catch {
      showToast("Ingestion failed — check console", "error");
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-[22px] font-bold">News Engine</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#8888A0" }}>
            {SOURCES.length} sources · RSS + web scraping · Gemini AI classification
          </p>
        </div>
        <button onClick={runIngestion} disabled={ingesting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #FF6B35, #FF4500)", color: "white" }}>
          {ingesting ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Ingesting…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Run Ingestion Now
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      {lastResult ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Ingested"  value={lastResult.ingested} color="#00E676" sub={`at ${lastResult.ranAt}`} />
          <StatCard label="Skipped"   value={lastResult.skipped}  sub="duplicates" />
          <StatCard label="Errors"    value={lastResult.errors}   color={lastResult.errors > 0 ? "#FF5252" : "#00E676"} />
          <StatCard label="Total"     value={lastResult.total}    sub="stories processed" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Ingested today" value="—"  sub="no runs yet" />
          <StatCard label="Sources active" value={SOURCES.filter((s) => s.status === "active").length} color="#00E676" />
          <StatCard label="RSS feeds"      value={SOURCES.filter((s) => s.type === "RSS").length} />
          <StatCard label="Scrape targets" value={SOURCES.filter((s) => s.type === "Scrape").length} />
        </div>
      )}

      {/* Info card */}
      <div className="rounded-xl p-4 mb-5 flex items-start gap-3"
        style={{ background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.18)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-[12px]" style={{ color: "#FF8C42" }}>
          News ingestion runs automatically every 10 minutes via Vercel cron (<code className="font-mono text-[11px]">*/10 * * * *</code>).
          Each story is classified by Gemini 2.0 Flash — category, urgency, entities, linked markets.
          Duplicate detection prevents re-processing.
        </p>
      </div>

      {/* Source table */}
      <div className="rounded-2xl border border-[#1E1E2E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: "#0D0D1A", borderBottom: "1px solid #1E1E2E" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Source</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Method</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((src, i) => (
                <tr key={src.name}
                  style={{ background: i % 2 === 0 ? "#0A0A12" : "#0D0D1A", borderBottom: "1px solid #1E1E2E" }}>
                  <td className="px-4 py-3 font-medium text-white">{src.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded"
                      style={{
                        background: src.type === "RSS" ? "rgba(0,150,136,0.12)" : "rgba(99,102,241,0.12)",
                        color:      src.type === "RSS" ? "#4DB6AC" : "#A5B4FC",
                      }}>
                      {src.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
                      <span className="text-[12px]" style={{ color: "#00E676" }}>Active</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
