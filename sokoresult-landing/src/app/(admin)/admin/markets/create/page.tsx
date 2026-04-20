"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

const CATEGORIES = [
  { value: "politics", label: "🏛️ Politics" },
  { value: "sports", label: "⚽ Sports" },
  { value: "entertainment", label: "🎬 Entertainment" },
  { value: "fashion", label: "👗 Fashion" },
];

const CATEGORY_META: Record<string, { bg: string; color: string; emoji: string }> = {
  politics: { bg: "rgba(123,47,190,0.18)", color: "#C4B5FD", emoji: "🏛️" },
  sports: { bg: "rgba(0,150,136,0.15)", color: "#4DB6AC", emoji: "⚽" },
  entertainment: { bg: "rgba(244,114,182,0.15)", color: "#F472B6", emoji: "🎬" },
  fashion: { bg: "rgba(255,179,0,0.12)", color: "#FFB300", emoji: "👗" },
};

function generateSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function MarketPreview({
  question,
  category,
  yesPrice,
  deadline,
}: {
  question: string;
  category: string;
  yesPrice: number;
  deadline: string;
}) {
  const catMeta = CATEGORY_META[category];
  const noPrice = 100 - yesPrice;
  const deadlineStr = deadline
    ? new Date(deadline).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: "#12121E", borderColor: "#2A2A3E" }}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#FF6B35" }}>
        Live Preview
      </p>

      <div className="rounded-xl border p-4" style={{ background: "#0A0A12", borderColor: "#2A2A3E" }}>
        {/* Category */}
        {catMeta && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md mb-2"
            style={{ background: catMeta.bg, color: catMeta.color }}
          >
            {catMeta.emoji} {category}
          </span>
        )}

        {/* Question */}
        <p className="text-white font-semibold leading-snug mb-3 text-[14px]">
          {question || "Your market question will appear here…"}
        </p>

        {/* Prices */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 rounded-lg p-2 text-center" style={{ background: "rgba(0,230,118,0.08)" }}>
            <p className="text-[10px] font-semibold mb-0.5" style={{ color: "#00E676" }}>YES</p>
            <p className="text-[16px] font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
              {yesPrice}¢
            </p>
          </div>
          <div className="flex-1 rounded-lg p-2 text-center" style={{ background: "rgba(255,82,82,0.08)" }}>
            <p className="text-[10px] font-semibold mb-0.5" style={{ color: "#FF5252" }}>NO</p>
            <p className="text-[16px] font-bold" style={{ color: "#FF5252", fontFamily: "var(--font-space-mono, monospace)" }}>
              {noPrice}¢
            </p>
          </div>
        </div>

        {/* Deadline */}
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#8888A0" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Resolves {deadlineStr}
        </div>
      </div>
    </div>
  );
}

export default function CreateMarketPage() {
  const router = useRouter();
  const showToast = useToast();

  const [question, setQuestion] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("politics");
  const [deadline, setDeadline] = useState("");
  const [deadlineWarning, setDeadlineWarning] = useState(false);
  const [yesPrice, setYesPrice] = useState(50);
  const [resolutionSource, setResolutionSource] = useState("");
  const [keywords, setKeywords] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate slug from question
  useEffect(() => {
    if (!slugManual) {
      setSlug(generateSlug(question));
    }
  }, [question, slugManual]);

  // Deadline warning (> 2 years away)
  useEffect(() => {
    if (!deadline) { setDeadlineWarning(false); return; }
    const twoYears = new Date();
    twoYears.setFullYear(twoYears.getFullYear() + 2);
    setDeadlineWarning(new Date(deadline) > twoYears);
  }, [deadline]);

  function checkSlug() {
    // Mock: no duplicate check needed
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!question.trim()) newErrors.question = "Question is required";
    if (!category) newErrors.category = "Category is required";
    if (!deadline) newErrors.deadline = "Deadline is required";
    else if (new Date(deadline) <= new Date()) newErrors.deadline = "Deadline must be in the future";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    showToast("Market created!", "success");
    router.push("/admin/markets");
    setSubmitting(false);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg border border-[#2A2A3E] transition-colors cursor-pointer"
          style={{ color: "#8888A0" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#E8E8F0"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8888A0"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-white text-[22px] font-bold">Create Market</h1>
          <p className="text-[13px]" style={{ color: "#8888A0" }}>Add a new prediction market</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Question */}
          <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
            <label className="block text-[13px] font-semibold text-white mb-2">
              Question <span style={{ color: "#FF5252" }}>*</span>
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Will William Ruto win the 2027 Presidential Election?"
              className="w-full px-4 py-3 rounded-xl text-[14px] text-white outline-none border transition-colors resize-none"
              style={{
                background: "#0A0A12",
                borderColor: errors.question ? "#FF5252" : question ? "#3A3A5E" : "#2A2A3E",
              }}
              onFocus={(e) => { if (!errors.question) e.target.style.borderColor = "#FF6B35"; }}
              onBlur={(e) => { e.target.style.borderColor = errors.question ? "#FF5252" : question ? "#3A3A5E" : "#2A2A3E"; }}
            />
            <div className="flex items-center justify-between mt-1.5">
              {errors.question ? (
                <p className="text-[12px]" style={{ color: "#FF5252" }}>{errors.question}</p>
              ) : (
                <p className="text-[12px]" style={{ color: "#8888A0" }}>Must be a clear YES/NO question</p>
              )}
              <p className="text-[12px]" style={{ color: question.length > 180 ? "#FFB300" : "#8888A0" }}>
                {question.length}/200
              </p>
            </div>
          </div>

          {/* Slug */}
          <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
            <label className="block text-[13px] font-semibold text-white mb-2">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugManual(true); setSlugError(""); }}
              placeholder="will-ruto-win-2027"
              className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none border transition-colors"
              style={{
                background: "#0A0A12",
                borderColor: slugError ? "#FF5252" : "#2A2A3E",
                fontFamily: "var(--font-space-mono, monospace)",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
              onBlur={(e) => { e.target.style.borderColor = slugError ? "#FF5252" : "#2A2A3E"; checkSlug(); }}
            />
            {slugError && <p className="text-[12px] mt-1" style={{ color: "#FF5252" }}>{slugError}</p>}
            {!slugError && <p className="text-[12px] mt-1" style={{ color: "#8888A0" }}>Auto-generated from question. Edit if needed.</p>}
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
            <label className="block text-[13px] font-semibold text-white mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Resolves YES if William Ruto is declared winner by IEBC. Resolves NO otherwise."
              className="w-full px-4 py-3 rounded-xl text-[13px] text-white outline-none border transition-colors resize-none"
              style={{ background: "#0A0A12", borderColor: "#2A2A3E" }}
              onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
              onBlur={(e) => { e.target.style.borderColor = "#2A2A3E"; }}
            />
            <p className="text-[12px] mt-1 text-right" style={{ color: description.length > 900 ? "#FFB300" : "#8888A0" }}>
              {description.length}/1000
            </p>
          </div>

          {/* Category + Deadline row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
              <label className="block text-[13px] font-semibold text-white mb-2">
                Category <span style={{ color: "#FF5252" }}>*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none border border-[#2A2A3E] cursor-pointer"
                style={{ background: "#0A0A12" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
              <label className="block text-[13px] font-semibold text-white mb-2">
                Resolution Deadline <span style={{ color: "#FF5252" }}>*</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={today}
                className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none border transition-colors"
                style={{
                  background: "#0A0A12",
                  borderColor: errors.deadline ? "#FF5252" : "#2A2A3E",
                  colorScheme: "dark",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
                onBlur={(e) => { e.target.style.borderColor = errors.deadline ? "#FF5252" : "#2A2A3E"; }}
              />
              {errors.deadline && <p className="text-[12px] mt-1" style={{ color: "#FF5252" }}>{errors.deadline}</p>}
              {deadlineWarning && !errors.deadline && (
                <p className="text-[12px] mt-1" style={{ color: "#FFB300" }}>
                  ⚠️ Deadline is more than 2 years away
                </p>
              )}
            </div>
          </div>

          {/* YES Price slider */}
          <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
            <label className="block text-[13px] font-semibold text-white mb-3">
              Initial YES Price — {yesPrice}¢ ({yesPrice}% probability)
            </label>
            <input
              type="range"
              min={1}
              max={99}
              value={yesPrice}
              onChange={(e) => setYesPrice(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer mb-4"
              style={{
                background: `linear-gradient(to right, #00E676 0%, #00E676 ${yesPrice}%, #FF5252 ${yesPrice}%, #FF5252 100%)`,
                accentColor: "#00E676",
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(0,230,118,0.08)" }}>
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: "#00E676" }}>YES</p>
                <p className="text-[18px] font-bold" style={{ color: "#00E676", fontFamily: "var(--font-space-mono, monospace)" }}>
                  {yesPrice}¢
                </p>
                <p className="text-[11px]" style={{ color: "#00E676", opacity: 0.7 }}>{yesPrice}% probability</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,82,82,0.08)" }}>
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: "#FF5252" }}>NO</p>
                <p className="text-[18px] font-bold" style={{ color: "#FF5252", fontFamily: "var(--font-space-mono, monospace)" }}>
                  {100 - yesPrice}¢
                </p>
                <p className="text-[11px]" style={{ color: "#FF5252", opacity: 0.7 }}>{100 - yesPrice}% probability</p>
              </div>
            </div>
            <p className="text-[12px] mt-3" style={{ color: "#8888A0" }}>
              Start at 50 for most markets. Adjust if you have prior knowledge.
            </p>
          </div>

          {/* Resolution Source */}
          <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
            <label className="block text-[13px] font-semibold text-white mb-2">Resolution Source</label>
            <input
              type="text"
              value={resolutionSource}
              onChange={(e) => setResolutionSource(e.target.value)}
              placeholder="Official IEBC results announcement"
              className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none border transition-colors"
              style={{ background: "#0A0A12", borderColor: "#2A2A3E" }}
              onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
              onBlur={(e) => { e.target.style.borderColor = "#2A2A3E"; }}
            />
            <p className="text-[12px] mt-1" style={{ color: "#8888A0" }}>Where will the answer come from?</p>
          </div>

          {/* Keywords */}
          <div className="rounded-2xl border border-[#2A2A3E] p-5" style={{ background: "#12121E" }}>
            <label className="block text-[13px] font-semibold text-white mb-2">Keywords / Tags</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="ruto, election, 2027, president, kenya"
              className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none border transition-colors"
              style={{ background: "#0A0A12", borderColor: "#2A2A3E" }}
              onFocus={(e) => { e.target.style.borderColor = "#FF6B35"; }}
              onBlur={(e) => { e.target.style.borderColor = "#2A2A3E"; }}
            />
            <p className="text-[12px] mt-1" style={{ color: "#8888A0" }}>
              Comma-separated. Matched against news headlines for market linking.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white transition-all cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #FF6B35, #FF4500)",
              opacity: submitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
            onMouseLeave={(e) => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            {submitting ? "Creating…" : "Create Market"}
          </button>
        </form>

        {/* Preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <MarketPreview
            question={question}
            category={category}
            yesPrice={yesPrice}
            deadline={deadline}
          />
        </div>
      </div>
    </div>
  );
}
