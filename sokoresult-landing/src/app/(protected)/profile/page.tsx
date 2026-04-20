"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { MOCK_USER } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";

// ─── Auth provider badge ──────────────────────────────────────────────────────

function AuthProviderBadge({ provider }: { provider?: string | null }) {
  if (provider === "google") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md"
        style={{ background: "rgba(66,133,244,0.15)", color: "#4285F4" }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md"
      style={{ background: "rgba(76,175,80,0.15)", color: "#4CAF50" }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      Phone
    </span>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className="relative w-10 h-6 rounded-full transition-all duration-200 cursor-pointer flex-shrink-0"
      style={{ background: enabled ? "#7B2FBE" : "#2A2A3E" }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200"
        style={{ left: enabled ? "calc(100% - 22px)" : "2px" }} />
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { signOut } = useAuth();
  const router = useRouter();
  const showToast = useToast();

  const [displayName, setDisplayName]     = useState(MOCK_USER.displayName);
  const [editingName, setEditingName]     = useState(false);
  const [feeInOko, setFeeInOko]           = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [copied, setCopied]               = useState(false);

  function copyReferral() {
    const link = `sokoresult.com/signup?ref=${MOCK_USER.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Referral link copied!", "success");
  }

  function saveName() {
    setEditingName(false);
    showToast("Name updated", "success");
  }

  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="px-4 md:px-6 py-6 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-[24px] font-bold">Profile</h1>
        {MOCK_USER.isAdmin && (
          <Link href="/admin/markets"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
            style={{ background: "rgba(255,107,53,0.12)", color: "#FF6B35", border: "1px solid rgba(255,107,53,0.25)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,107,53,0.2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,107,53,0.12)"; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
            Admin Panel
          </Link>
        )}
      </div>

      {/* Avatar + name */}
      <div className="rounded-2xl border border-[#2A2A3E] p-5 mb-4" style={{ background: "#12121E" }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-[20px] font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7B2FBE, #9B4FDE)" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <AuthProviderBadge provider={MOCK_USER.authProvider} />
              {/* KYC badge */}
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md"
                style={{ background: "rgba(0,230,118,0.12)", color: "#00E676" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Verified
              </span>
            </div>
            {!editingName ? (
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-semibold text-white truncate">{displayName}</p>
                <button onClick={() => setEditingName(true)}
                  className="p-1 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                  style={{ color: "#8888A0" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#E8E8F0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#8888A0"; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  className="flex-1 bg-transparent border-b text-[15px] text-white outline-none min-w-0"
                  style={{ borderColor: "#7B2FBE" }} autoFocus maxLength={50} />
                <button onClick={saveName}
                  className="text-[12px] font-semibold px-3 py-1 rounded-lg cursor-pointer"
                  style={{ background: "#7B2FBE", color: "white" }}>
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[13px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8888A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span className="text-[#8888A0]">+254 712 *** 78</span>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8888A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            <span className="text-[#8888A0]">ko***a@gmail.com</span>
          </div>
        </div>
      </div>

      {/* KYC status */}
      <div className="rounded-2xl border border-[#2A2A3E] p-4 mb-4" style={{ background: "#12121E" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-white mb-0.5">Identity Verification</p>
            <p className="text-[12px] text-[#8888A0]">Identity verified — Tier 1</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(0,230,118,0.12)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span className="text-[11px] font-bold text-[#00E676]">Verified</span>
          </div>
        </div>
      </div>

      {/* Referral */}
      <div className="rounded-2xl border p-5 mb-4" style={{ background: "#12121E", borderColor: "rgba(123,47,190,0.3)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-bold text-white">Referral Program</p>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
            style={{ background: "rgba(0,230,118,0.12)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span className="text-[11px] font-bold text-[#00E676]">{MOCK_USER.referralCount} referred</span>
          </div>
        </div>

        {/* Code */}
        <div className="flex items-center justify-center gap-3 py-4 rounded-xl mb-3"
          style={{ background: "#0A0A12", border: "1px solid #2A2A3E" }}>
          <p className="text-[24px] font-bold text-[#C4B5FD] tracking-[0.15em]"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
            {MOCK_USER.referralCode}
          </p>
        </div>

        <p className="text-[11px] text-[#8888A0] mb-3 text-center">
          sokoresult.com/signup?ref={MOCK_USER.referralCode}
        </p>

        <div className="flex gap-2">
          <button onClick={copyReferral}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-all border border-[#2A2A3E]"
            style={{ color: copied ? "#00E676" : "#E8E8F0" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7B2FBE"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {copied ? <polyline points="20 6 9 17 4 12"/> : <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>}
            </svg>
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={() => { if (navigator.share) navigator.share({ title: "SokoResult", url: `https://sokoresult.com/signup?ref=${MOCK_USER.referralCode}` }).catch(() => {}); else copyReferral(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-all border border-[#2A2A3E]"
            style={{ color: "#E8E8F0" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7B2FBE"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-[#2A2A3E] p-4 mb-4" style={{ background: "#12121E" }}>
        <p className="text-[13px] font-bold text-white mb-4">Settings</p>
        <div className="flex flex-col gap-4">
          {/* Fee preference */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-white">Pay fees in $OKO</p>
              <p className="text-[11px] text-[#8888A0]">30% discount on trading fees</p>
            </div>
            <Toggle enabled={feeInOko} onToggle={() => { setFeeInOko((v) => !v); showToast(feeInOko ? "Fees now in KES" : "Fees now in $OKO (30% discount)", "success"); }} />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#8888A0]">Push Notifications</p>
              <p className="text-[11px] text-[#4A4A6A]">Coming soon</p>
            </div>
            <Toggle enabled={notifications} onToggle={() => {}} />
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="rounded-2xl border border-[#2A2A3E] p-4" style={{ background: "#12121E" }}>
        {!showSignOutConfirm ? (
          <button onClick={() => setShowSignOutConfirm(true)}
            className="w-full flex items-center gap-3 text-[13px] font-medium text-[#FF5252] cursor-pointer transition-opacity hover:opacity-80">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        ) : (
          <div>
            <p className="text-[13px] text-[#E8E8F0] mb-3 font-medium">Sign out of SokoResult?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all border border-[#2A2A3E] text-[#8888A0]">
                Cancel
              </button>
              <button onClick={signOut}
                className="flex-1 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all text-white"
                style={{ background: "#FF5252" }}>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-[#4A4A6A] mt-6">SokoResult v0.1 — Demo Mode</p>
    </div>
  );
}
