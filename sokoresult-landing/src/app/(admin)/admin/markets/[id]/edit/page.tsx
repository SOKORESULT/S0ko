"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";

const CATEGORIES = [
  { value: "politics", label: "🏛️ Politics" },
  { value: "sports", label: "⚽ Sports" },
  { value: "entertainment", label: "🎬 Entertainment" },
  { value: "fashion", label: "👗 Fashion" },
];

interface MarketData {
  id: string;
  slug: string;
  question: string;
  description: string | null;
  category: string;
  status: "open" | "closed" | "disputed" | "resolved";
  yes_price: number;
  no_price: number;
  total_trades: number;
  resolution_deadline: string;
  resolution_source: string | null;
  keywords: string[] | null;
}

export default function EditMarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const showToast = useToast();

  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("politics");
  const [status, setStatus] = useState<"open" | "closed" | "disputed">("open");
  const [deadline, setDeadline] = useState("");
  const [yesPrice, setYesPrice] = useState(50);
  const [resolutionSource, setResolutionSource] = useState("");
  const [keywords, setKeywords] = useState("");

  useEffect(() => {
    async function load() {
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/markets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const m: MarketData = data.market ?? data;
        setMarket(m);
        setQuestion(m.question ?? "");
        setDescription(m.description ?? "");
        setCategory(m.category ?? "politics");
        setStatus((m.status === "resolved" ? "closed" : m.status) as "open" | "closed" | "disputed");
        setDeadline(m.resolution_deadline ? m.resolution_deadline.split("T")[0] : "");
        setYesPrice(m.yes_price ?? 50);
        setResolutionSource(m.resolution_source ?? "");
        setKeywords((m.keywords ?? []).join(", "));
      } else {
        showToast("Market not found", "error");
        router.push("/admin/markets");
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = await user?.getIdToken();
    const keywordArr = keywords.split(",").map((k) => k.trim()).filter(Boolean);

    const res = await fetch(`/api/admin/markets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        question: question.trim(),
        description: description.trim() || null,
        category,
        status,
        yes_price: yesPrice,
        resolution_deadline: deadline,
        resolution_source: resolutionSource.trim() || null,
        keywords: keywordArr,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      showToast("Market updated!", "success");
      router.push("/admin/markets");
    } else {
      showToast(data.error ?? "Update failed", "error");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (deleteText !== "DELETE") return;
    setDeleting(true);
    const token = await user?.getIdToken();
    const res = await fetch(`/api/admin/markets/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Market deleted", "success");
      router.push("/admin/markets");
    } else {
      showToast(data.error ?? "Delete failed", "error");
      setDeleting(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

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
          <h1 className="text-white text-[22px] font-bold">Edit Market</h1>
          <p className="text-[13px] line-clamp-1" style={{ color: "#8888A0" }}>{market?.question}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Question */}
        <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
          <label className="block text-[13px] font-semibold text-white mb-2">Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={200}
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-[14px] text-white outline-none border border-[#2A2A3E] transition-colors resize-none"
            style={{ background: "#0A0A12" }}
            onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
            onBlur={(e) => { e.target.style.borderColor = "#2A2A3E"; }}
          />
          <p className="text-[12px] mt-1 text-right" style={{ color: "#8888A0" }}>{question.length}/200</p>
        </div>

        {/* Description */}
        <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
          <label className="block text-[13px] font-semibold text-white mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] transition-colors resize-none"
            style={{ background: "#0A0A12" }}
            onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
            onBlur={(e) => { e.target.style.borderColor = "#2A2A3E"; }}
          />
        </div>

        {/* Category + Status row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
            <label className="block text-[13px] font-semibold text-white mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] cursor-pointer"
              style={{ background: "#0A0A12" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
            <label className="block text-[13px] font-semibold text-white mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "open" | "closed" | "disputed")}
              className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] cursor-pointer"
              style={{ background: "#0A0A12" }}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>
        </div>

        {/* Deadline */}
        <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
          <label className="block text-[13px] font-semibold text-white mb-2">Resolution Deadline</label>
          <input
            type="date"
            value={deadline}
            min={today}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] transition-colors"
            style={{ background: "#0A0A12", colorScheme: "dark" }}
            onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
            onBlur={(e) => { e.target.style.borderColor = "#2A2A3E"; }}
          />
        </div>

        {/* YES Price */}
        <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
          <label className="block text-[13px] font-semibold text-white mb-3">
            YES Price — {yesPrice}¢
            <span className="ml-2 text-[11px] font-normal" style={{ color: "#FFB300" }}>
              Manual override
            </span>
          </label>
          <input
            type="range"
            min={1}
            max={99}
            value={yesPrice}
            onChange={(e) => setYesPrice(parseInt(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #00E676 0%, #00E676 ${yesPrice}%, #FF5252 ${yesPrice}%, #FF5252 100%)`,
            }}
          />
          <div className="flex justify-between mt-2 text-[12px]" style={{ color: "#8888A0" }}>
            <span style={{ color: "#00E676" }}>YES {yesPrice}¢</span>
            <span style={{ color: "#FF5252" }}>NO {100 - yesPrice}¢</span>
          </div>
        </div>

        {/* Resolution Source */}
        <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
          <label className="block text-[13px] font-semibold text-white mb-2">Resolution Source</label>
          <input
            type="text"
            value={resolutionSource}
            onChange={(e) => setResolutionSource(e.target.value)}
            placeholder="Official IEBC results announcement"
            className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] transition-colors"
            style={{ background: "#0A0A12" }}
            onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
            onBlur={(e) => { e.target.style.borderColor = "#2A2A3E"; }}
          />
        </div>

        {/* Keywords */}
        <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
          <label className="block text-[13px] font-semibold text-white mb-2">Keywords / Tags</label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="ruto, election, 2027, president, kenya"
            className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] transition-colors"
            style={{ background: "#0A0A12" }}
            onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
            onBlur={(e) => { e.target.style.borderColor = "#2A2A3E"; }}
          />
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white transition-all cursor-pointer"
          style={{ background: "linear-gradient(135deg, #FF6B35, #FF4500)", opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Delete section */}
      <div className="mt-6 rounded-2xl border p-5" style={{ background: "#12121E", borderColor: "rgba(255,82,82,0.2)" }}>
        <p className="text-[13px] font-semibold mb-1" style={{ color: "#FF5252" }}>Danger Zone</p>
        {market && market.total_trades > 0 ? (
          <p className="text-[12px]" style={{ color: "#8888A0" }}>
            Cannot delete — this market has {market.total_trades} trades. Close and resolve it instead.
          </p>
        ) : !showDeleteConfirm ? (
          <>
            <p className="text-[12px] mb-3" style={{ color: "#8888A0" }}>
              Permanently delete this market. This cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all border"
              style={{ color: "#FF5252", borderColor: "rgba(255,82,82,0.3)", background: "rgba(255,82,82,0.06)" }}
            >
              Delete Market
            </button>
          </>
        ) : (
          <div>
            <p className="text-[12px] mb-3" style={{ color: "#8888A0" }}>
              This will delete the market and all associated data. Type <strong style={{ color: "#FF5252" }}>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] mb-3"
              style={{ background: "#0A0A12" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border border-[#2A2A3E] cursor-pointer"
                style={{ color: "#8888A0" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteText !== "DELETE" || deleting}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all"
                style={{
                  background: deleteText === "DELETE" ? "#FF5252" : "rgba(255,82,82,0.2)",
                  color: "white",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
