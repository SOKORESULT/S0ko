"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { MOCK_USER } from "@/lib/mock-data";

const PERSONAL_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];

const PUB_TYPES = [
  { value: "newspaper",    label: "Newspaper" },
  { value: "tv",           label: "TV" },
  { value: "radio",        label: "Radio" },
  { value: "online",       label: "Online Media" },
  { value: "freelance",    label: "Freelance" },
  { value: "blog",         label: "Blog" },
];

const BEATS = [
  { value: "politics",      label: "Politics" },
  { value: "sports",        label: "Sports" },
  { value: "entertainment", label: "Entertainment" },
  { value: "fashion",       label: "Fashion" },
  { value: "business",      label: "Business" },
  { value: "general",       label: "General" },
];

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-white mb-1.5">{label}</label>
      {children}
      {error ? (
        <p className="text-[11px] mt-1" style={{ color: "#FF5252" }}>{error}</p>
      ) : hint ? (
        <p className="text-[11px] mt-1" style={{ color: "#8888A0" }}>{hint}</p>
      ) : null}
    </div>
  );
}

const INPUT_STYLE = {
  base: "w-full px-3 py-2.5 rounded-xl text-[13px] text-white outline-none border transition-colors",
  bg: "#0D0D1A",
  border: "#1E1E2E",
  focus: "#3B82F6",
};

export default function CorrespondentApplyPage() {
  const router    = useRouter();
  const showToast = useToast();

  const [pubName, setPubName]       = useState("");
  const [pubType, setPubType]       = useState("online");
  const [email, setEmail]           = useState("");
  const [xHandle, setXHandle]       = useState("");
  const [portfolio, setPortfolio]   = useState("");
  const [bio, setBio]               = useState("");
  const [beat, setBeat]             = useState("politics");
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  // Word count for bio
  const wordCount = bio.trim().split(/\s+/).filter(Boolean).length;

  // Check KYC — in mock, MOCK_USER.kycTier = 1 so it passes
  if (MOCK_USER.kycTier < 1) {
    return (
      <div className="px-4 py-12 max-w-lg mx-auto text-center">
        <p className="text-white text-[18px] font-bold mb-2">KYC Required</p>
        <p className="text-[14px] mb-4" style={{ color: "#8888A0" }}>
          You must complete KYC verification before applying to become a correspondent.
        </p>
        <button onClick={() => router.push("/kyc")}
          className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white cursor-pointer"
          style={{ background: "#3B82F6" }}>
          Verify Identity →
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="px-4 py-12 max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(59,130,246,0.15)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p className="text-white text-[20px] font-bold mb-2">Application Submitted!</p>
        <p className="text-[14px] mb-6" style={{ color: "#8888A0" }}>
          We&apos;ll review your application within 48 hours and notify you via email.
        </p>
        <button onClick={() => router.push("/markets")}
          className="px-6 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-all"
          style={{ background: "#1E1E35", color: "#C4B5FD", border: "1px solid #2A2A4A" }}>
          Back to Markets
        </button>
      </div>
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!pubName.trim())        e.pubName = "Required";
    if (wordCount < 50)         e.bio = `Bio must be at least 50 words (currently ${wordCount})`;
    if (!email && !xHandle)     e.email = "Provide a work email or X handle";
    if (email) {
      const domain = email.split("@")[1]?.toLowerCase();
      if (PERSONAL_DOMAINS.includes(domain)) e.email = "Use a work email, not a personal address";
    }
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    // Mock: simulate submit
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
    showToast("Application submitted!", "success");
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(59,130,246,0.15)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
            </svg>
          </div>
          <h1 className="text-white text-[22px] font-bold">Become a Correspondent</h1>
        </div>
        <p className="text-[14px] mt-1" style={{ color: "#8888A0" }}>
          Get paid to report verified news that moves prediction markets. KES 50 per published story.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Publication name */}
        <Field label="Publication Name *" error={errors.pubName}
          hint="Where do you work? e.g. KTN News, The Standard, Freelance">
          <input value={pubName} onChange={(e) => setPubName(e.target.value)}
            placeholder="e.g. Nation Africa, Capital FM, Freelance"
            className={INPUT_STYLE.base}
            style={{ background: INPUT_STYLE.bg, borderColor: errors.pubName ? "#FF5252" : INPUT_STYLE.border }}
            onFocus={(e) => { e.target.style.borderColor = INPUT_STYLE.focus; }}
            onBlur={(e) => { e.target.style.borderColor = errors.pubName ? "#FF5252" : INPUT_STYLE.border; }} />
        </Field>

        {/* Publication type */}
        <Field label="Publication Type *">
          <select value={pubType} onChange={(e) => setPubType(e.target.value)}
            className={INPUT_STYLE.base + " cursor-pointer"}
            style={{ background: INPUT_STYLE.bg, borderColor: INPUT_STYLE.border }}>
            {PUB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>

        {/* Email */}
        <Field label="Work Email" error={errors.email}
          hint="Use your work email. If you don't have one, provide your X handle instead.">
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
            placeholder="you@yourpublication.co.ke"
            className={INPUT_STYLE.base}
            style={{ background: INPUT_STYLE.bg, borderColor: errors.email ? "#FF5252" : INPUT_STYLE.border }}
            onFocus={(e) => { e.target.style.borderColor = INPUT_STYLE.focus; }}
            onBlur={(e) => { e.target.style.borderColor = errors.email ? "#FF5252" : INPUT_STYLE.border; }} />
        </Field>

        {/* X handle */}
        <Field label="X (Twitter) Handle" hint="Required if you don't have a work email. Helps us verify your journalist identity.">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px]" style={{ color: "#8888A0" }}>@</span>
            <input value={xHandle} onChange={(e) => setXHandle(e.target.value.replace(/^@/, ""))}
              placeholder="journalist_name"
              className={INPUT_STYLE.base + " pl-7"}
              style={{ background: INPUT_STYLE.bg, borderColor: INPUT_STYLE.border }}
              onFocus={(e) => { e.target.style.borderColor = INPUT_STYLE.focus; }}
              onBlur={(e) => { e.target.style.borderColor = INPUT_STYLE.border; }} />
          </div>
        </Field>

        {/* Portfolio */}
        <Field label="Portfolio URL" hint="Link to published work, LinkedIn, or personal site (optional)">
          <input type="url" value={portfolio} onChange={(e) => setPortfolio(e.target.value)}
            placeholder="https://your-portfolio.com"
            className={INPUT_STYLE.base}
            style={{ background: INPUT_STYLE.bg, borderColor: INPUT_STYLE.border }}
            onFocus={(e) => { e.target.style.borderColor = INPUT_STYLE.focus; }}
            onBlur={(e) => { e.target.style.borderColor = INPUT_STYLE.border; }} />
        </Field>

        {/* Bio */}
        <Field label="Bio / Experience *" error={errors.bio}
          hint={`Tell us about your journalism experience. Min 50 words (${wordCount}/50)`}>
          <textarea value={bio} onChange={(e) => { setBio(e.target.value); setErrors((p) => ({ ...p, bio: "" })); }}
            rows={5} maxLength={2000}
            placeholder="I am a political journalist with 5 years of experience covering East African elections and governance..."
            className={INPUT_STYLE.base + " resize-none"}
            style={{ background: INPUT_STYLE.bg, borderColor: errors.bio ? "#FF5252" : INPUT_STYLE.border }}
            onFocus={(e) => { e.target.style.borderColor = INPUT_STYLE.focus; }}
            onBlur={(e) => { e.target.style.borderColor = errors.bio ? "#FF5252" : INPUT_STYLE.border; }} />
        </Field>

        {/* Beat */}
        <Field label="Beat / Specialty *">
          <select value={beat} onChange={(e) => setBeat(e.target.value)}
            className={INPUT_STYLE.base + " cursor-pointer"}
            style={{ background: INPUT_STYLE.bg, borderColor: INPUT_STYLE.border }}>
            {BEATS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </Field>

        {/* Earning note */}
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className="text-[13px] font-semibold text-white mb-0.5">Correspondent Earnings</p>
            <p className="text-[12px]" style={{ color: "#8888A0" }}>
              Earn KES 50 per verified story published. Payouts via M-Pesa once you reach KES 500 minimum (10 stories). Your accuracy score affects future opportunities.
            </p>
          </div>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full py-3.5 rounded-xl text-[14px] font-bold text-white cursor-pointer transition-all flex items-center justify-center gap-2"
          style={{ background: submitting ? "#1E1E35" : "#3B82F6", opacity: submitting ? 0.7 : 1 }}
          onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
          {submitting && (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          )}
          {submitting ? "Submitting…" : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
