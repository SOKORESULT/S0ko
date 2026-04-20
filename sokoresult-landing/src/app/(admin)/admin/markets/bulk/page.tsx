"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";

interface ParsedMarket {
  question: string;
  category: string;
  resolution_deadline: string;
  description: string;
  valid: boolean;
  error?: string;
}

const VALID_CATEGORIES = ["politics", "sports", "entertainment", "fashion"];

function parseLine(line: string): ParsedMarket {
  const parts = line.split("|").map((p) => p.trim());
  if (parts.length < 3) {
    return { question: line, category: "", resolution_deadline: "", description: "", valid: false, error: "Need at least: question | category | deadline" };
  }

  const [question, category, deadline, description = ""] = parts;

  if (!question) return { question: "", category, resolution_deadline: deadline, description, valid: false, error: "Question is empty" };
  if (!VALID_CATEGORIES.includes(category.toLowerCase())) {
    return { question, category, resolution_deadline: deadline, description, valid: false, error: `Invalid category: "${category}". Use: politics, sports, entertainment, fashion` };
  }
  if (!deadline || isNaN(new Date(deadline).getTime())) {
    return { question, category, resolution_deadline: deadline, description, valid: false, error: `Invalid date: "${deadline}"` };
  }
  if (new Date(deadline) <= new Date()) {
    return { question, category, resolution_deadline: deadline, description, valid: false, error: "Deadline must be in the future" };
  }

  return { question, category: category.toLowerCase(), resolution_deadline: deadline, description, valid: true };
}

export default function BulkCreatePage() {
  const { user } = useAuth();
  const router = useRouter();
  const showToast = useToast();

  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedMarket[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ created_count: number; error_count: number } | null>(null);

  function handlePreview() {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      showToast("Enter at least one market", "error");
      return;
    }
    setParsed(lines.map(parseLine));
    setResult(null);
  }

  async function handleCreateAll() {
    if (!parsed || !user) return;
    const valid = parsed.filter((p) => p.valid);
    if (valid.length === 0) {
      showToast("No valid markets to create", "error");
      return;
    }

    setCreating(true);
    const token = await user.getIdToken();
    const res = await fetch("/api/admin/markets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        markets: valid.map((m) => ({
          question: m.question,
          category: m.category,
          resolution_deadline: m.resolution_deadline,
          description: m.description || undefined,
        })),
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setResult({ created_count: data.created_count, error_count: data.error_count });
      showToast(`Created ${data.created_count} markets!`, "success");
      if (data.error_count === 0) {
        setTimeout(() => router.push("/admin/markets"), 1500);
      }
    } else {
      showToast(data.error ?? "Bulk create failed", "error");
    }
    setCreating(false);
  }

  const EXAMPLE = `Will Ruto win the 2027 Presidential Election? | politics | 2027-08-15 | Resolves based on official IEBC results
Will KES/USD exceed 160? | politics | 2026-12-31 | Based on CBK official exchange rate
Will Gor Mahia win KPL 2026? | sports | 2026-11-30 | Official KPL final standings`;

  return (
    <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto">
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
          <h1 className="text-white text-[22px] font-bold">Bulk Create Markets</h1>
          <p className="text-[13px]" style={{ color: "#8888A0" }}>Paste multiple markets at once</p>
        </div>
      </div>

      {/* Format guide */}
      <div className="rounded-2xl border border-[#2A2A3E] p-5 mb-5" style={{ background: "#12121E" }}>
        <p className="text-[13px] font-semibold text-white mb-2">Format</p>
        <p className="text-[12px] mb-3" style={{ color: "#8888A0" }}>
          One market per line: <code className="px-1.5 py-0.5 rounded" style={{ background: "#0A0A12", color: "#C4B5FD" }}>question | category | deadline | description (optional)</code>
        </p>
        <p className="text-[12px] mb-2" style={{ color: "#8888A0" }}>
          Categories: <span style={{ color: "#C4B5FD" }}>politics</span>, <span style={{ color: "#4DB6AC" }}>sports</span>, <span style={{ color: "#F472B6" }}>entertainment</span>, <span style={{ color: "#FFB300" }}>fashion</span>
        </p>
        <button
          onClick={() => setText(EXAMPLE)}
          className="text-[12px] font-semibold transition-colors cursor-pointer"
          style={{ color: "#FF6B35" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        >
          Load example →
        </button>
      </div>

      {/* Textarea */}
      <div className="rounded-2xl border border-[#2A2A3E] p-5 mb-4" style={{ background: "#12121E" }}>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setParsed(null); setResult(null); }}
          rows={10}
          placeholder={EXAMPLE}
          className="w-full px-4 py-3 rounded-xl text-[13px] outline-none border border-[#2A2A3E] transition-colors resize-none"
          style={{
            background: "#0A0A12",
            color: "#E8E8F0",
            fontFamily: "var(--font-space-mono, monospace)",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
          onBlur={(e) => { e.target.style.borderColor = "#2A2A3E"; }}
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-[12px]" style={{ color: "#8888A0" }}>
            {text.split("\n").filter((l) => l.trim()).length} line(s)
          </p>
          <button
            onClick={handlePreview}
            disabled={!text.trim()}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white cursor-pointer transition-all"
            style={{
              background: text.trim() ? "rgba(255,107,53,0.15)" : "rgba(255,107,53,0.05)",
              color: text.trim() ? "#FF6B35" : "#8888A0",
              border: "1px solid",
              borderColor: text.trim() ? "rgba(255,107,53,0.3)" : "#2A2A3E",
            }}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div
          className="rounded-2xl border p-4 mb-4 flex items-center gap-3"
          style={{
            background: result.error_count === 0 ? "rgba(0,230,118,0.08)" : "rgba(255,179,0,0.08)",
            borderColor: result.error_count === 0 ? "rgba(0,230,118,0.2)" : "rgba(255,179,0,0.2)",
          }}
        >
          <div className="text-[13px]">
            <span className="font-semibold" style={{ color: result.error_count === 0 ? "#00E676" : "#FFB300" }}>
              {result.created_count} created
            </span>
            {result.error_count > 0 && (
              <span className="ml-2 font-semibold" style={{ color: "#FF5252" }}>{result.error_count} errors</span>
            )}
            {result.error_count === 0 && (
              <span className="ml-2" style={{ color: "#8888A0" }}>Redirecting to markets…</span>
            )}
          </div>
        </div>
      )}

      {/* Preview table */}
      {parsed && parsed.length > 0 && (
        <div>
          <div className="rounded-2xl border border-[#1E1E2E] overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ background: "#0D0D1A", borderBottom: "1px solid #1E1E2E" }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>#</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Question</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Category</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Deadline</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((m, i) => (
                    <tr
                      key={i}
                      style={{
                        background: i % 2 === 0 ? "#0A0A12" : "#0D0D1A",
                        borderBottom: "1px solid #1E1E2E",
                        opacity: m.valid ? 1 : 0.6,
                      }}
                    >
                      <td className="px-4 py-3" style={{ color: "#8888A0" }}>{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-white line-clamp-2 max-w-[300px]">{m.question || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px]" style={{ color: "#C4B5FD" }}>{m.category || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: "#8888A0" }}>{m.resolution_deadline || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {m.valid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: "rgba(0,230,118,0.12)", color: "#00E676" }}>
                            ✓ Valid
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md mb-1" style={{ background: "rgba(255,82,82,0.12)", color: "#FF5252" }}>
                              ✗ Error
                            </span>
                            <p className="text-[11px]" style={{ color: "#FF5252" }}>{m.error}</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary + action */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-[#2A2A3E]" style={{ background: "#12121E" }}>
            <div className="text-[13px]">
              <span style={{ color: "#00E676" }} className="font-semibold">{parsed.filter((p) => p.valid).length} valid</span>
              {parsed.filter((p) => !p.valid).length > 0 && (
                <span className="ml-2" style={{ color: "#FF5252" }}>{parsed.filter((p) => !p.valid).length} invalid (will be skipped)</span>
              )}
            </div>
            <button
              onClick={handleCreateAll}
              disabled={creating || parsed.filter((p) => p.valid).length === 0}
              className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white cursor-pointer transition-all"
              style={{
                background: "linear-gradient(135deg, #FF6B35, #FF4500)",
                opacity: creating || parsed.filter((p) => p.valid).length === 0 ? 0.6 : 1,
              }}
            >
              {creating ? "Creating…" : `Create ${parsed.filter((p) => p.valid).length} Markets`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
