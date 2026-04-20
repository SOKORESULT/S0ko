"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className="mt-0.5 flex-shrink-0 flex items-center justify-center rounded transition-colors duration-150 cursor-pointer"
        style={{
          width: 20, height: 20,
          border: `1px solid ${checked ? "#7B2FBE" : "#2A2A3E"}`,
          background: checked ? "#7B2FBE" : "transparent",
        }}
      >
        {checked && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className="text-[14px] text-[#8888A0] leading-relaxed">{children}</span>
    </label>
  );
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  const [authReady, setAuthReady] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") ?? "");
  const [isOver18, setIsOver18] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!initialized.current) {
        initialized.current = true;
        // Pre-fill display name from Google
        if (user.displayName) setDisplayName(user.displayName);

        // Check if profile already exists
        const token = await user.getIdToken();
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.profile) { router.replace("/markets"); return; }
      }
      setAuthReady(true);
    });
    return unsub;
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setError("Display name must be 2–50 characters.");
      return;
    }
    if (!isOver18) { setError("You must confirm you are 18 or older."); return; }
    if (!agreedToTerms) { setError("You must agree to the Terms of Service."); return; }

    setError("");
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: trimmed, referral_code: referralCode.trim() || undefined, is_over_18: true }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create profile."); return; }
      router.push("/markets");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!authReady) {
    return (
      <div className="flex justify-center py-10">
        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#2A2A3E" strokeWidth="3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#7B2FBE" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  return (
    <div style={{ animation: "authFadeIn 400ms ease-out both" }}>
      <style>{`@keyframes authFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <h1
        className="text-white text-center font-bold mb-2"
        style={{ fontSize: 28, fontFamily: "var(--font-dm-sans, sans-serif)" }}
      >
        Set up your profile
      </h1>
      <p className="text-[14px] text-[#8888A0] text-center mb-7">One last step before you start trading.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Display name */}
        <div className="border border-[#2A2A3E] rounded-xl overflow-hidden">
          <input
            type="text"
            placeholder="Your display name"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setError(""); }}
            maxLength={50}
            className="w-full bg-transparent px-4 py-4 text-[16px] text-white placeholder-[#555555] focus:outline-none"
          />
        </div>

        {/* Referral code */}
        <div className="border border-[#2A2A3E] rounded-xl overflow-hidden">
          <input
            type="text"
            placeholder="Referral code (optional)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            maxLength={8}
            className="w-full bg-transparent px-4 py-4 text-[16px] text-white placeholder-[#555555] focus:outline-none uppercase tracking-wider"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          />
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 pt-2">
          <Checkbox checked={isOver18} onChange={(v) => { setIsOver18(v); setError(""); }}>
            I confirm I am <span className="text-white font-medium">18 years or older</span>
          </Checkbox>
          <Checkbox checked={agreedToTerms} onChange={(v) => { setAgreedToTerms(v); setError(""); }}>
            I agree to the{" "}
            <a href="/terms" className="text-[#7B2FBE] hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="text-[#7B2FBE] hover:underline">Privacy Policy</a>
          </Checkbox>
        </div>

        {error && (
          <div className="rounded-lg px-4 py-2.5 text-[13px] text-[#FF5252]" style={{ background: "rgba(255,82,82,0.1)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 font-semibold text-[16px] text-[#0A0A12] rounded-xl cursor-pointer disabled:opacity-60 transition-all duration-200 mt-2"
          style={{ height: 52, background: "linear-gradient(135deg, #00E676, #00C853)" }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = "brightness(1.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
        >
          {loading && (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          )}
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>
    </div>
  );
}
