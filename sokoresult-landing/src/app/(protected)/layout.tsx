"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { KycBadge } from "@/components/kyc-badge";
import { ToastProvider } from "@/components/ui/toast";

// ── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  { href: "/markets",   label: "Markets",   icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { href: "/news",      label: "News",      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/></svg> },
  { href: "/portfolio", label: "Portfolio", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
  { href: "/wallet",    label: "Wallet",    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><circle cx="18" cy="12" r="2"/></svg> },
  { href: "/profile",   label: "Profile",   icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
];

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ photoURL, displayName }: { photoURL?: string | null; displayName?: string | null }) {
  const initials = (displayName ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (photoURL) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden border border-[#2A2A3E] flex-shrink-0">
        <Image src={photoURL} alt={displayName ?? "Avatar"} width={32} height={32} className="object-cover w-full h-full" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
      style={{ background: "linear-gradient(135deg, #7B2FBE, #9B4FDE)" }}>
      {initials}
    </div>
  );
}

// ── KYC Banner ────────────────────────────────────────────────────────────────
function KycBanner() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const dismissed = localStorage.getItem("kyc-banner-dismissed");
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem("kyc-banner-dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"
      style={{ background: "rgba(255,179,0,0.1)", borderBottom: "1px solid rgba(255,179,0,0.2)" }}>
      <span className="text-[#FFB300]">
        ⚠️ Complete verification to start trading —{" "}
        <button onClick={() => router.push("/kyc")} className="underline font-semibold cursor-pointer hover:text-[#FFD54F] transition-colors">
          Verify Now →
        </button>
      </span>
      <button onClick={dismiss} className="text-[#FFB300]/60 hover:text-[#FFB300] transition-colors cursor-pointer flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [isCorrespondent, setIsCorrespondent] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const token = await user.getIdToken();
      const res = await fetch("/api/correspondent/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled) setIsCorrespondent(data.correspondent?.verification_status === "approved");
    })();
    return () => { cancelled = true; };
  }, [user]);

  const nav = isCorrespondent
    ? [
        ...NAV.slice(0, 2),
        { href: "/correspondent/dashboard", label: "Correspondent", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/></svg> },
        ...NAV.slice(2),
      ]
    : NAV;

  return (
    <div className="min-h-screen" style={{ background: "#0A0A12" }}>

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 border-b border-[#2A2A3E]"
        style={{ height: 64, background: "rgba(10,10,18,0.92)", backdropFilter: "blur(12px)" }}>

        {/* Logo */}
        <Link href="/markets" className="flex-shrink-0">
          <span className="text-[17px] font-bold" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
            <span className="text-[#00E676]">$OKO</span><span className="text-white">RESULT</span>
          </span>
        </Link>

        {/* Ticker — desktop only */}
        <div className="hidden md:flex items-center text-[12px] text-[#8888A0]"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
          247 Markets &nbsp;•&nbsp; KES 48.6M Volume &nbsp;•&nbsp; $OKO KES 2.45
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <KycBadge tier={(profile?.kyc_tier ?? 0) as 0 | 1 | 2} size="sm" />

          {/* Bell */}
          <button className="relative p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8888A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-[#0A0A12]"
              style={{ background: "#FF5252" }}>3</span>
          </button>

          {/* Avatar */}
          <Link href="/profile">
            <Avatar photoURL={user?.photoURL} displayName={profile?.display_name ?? user?.displayName} />
          </Link>
        </div>
      </header>

      {/* KYC Banner */}
      {(profile?.kyc_tier ?? 0) === 0 && <KycBanner />}

      <div className="flex">
        {/* Desktop side nav */}
        <nav className="hidden md:flex flex-col fixed left-0 top-16 bottom-0 border-r border-[#2A2A3E] z-40 overflow-y-auto"
          style={{ width: 240, background: "#0A0A12", paddingTop: 16, paddingBottom: 16 }}>
          {nav.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-5 py-3 text-[14px] font-medium transition-all duration-150"
                style={{
                  color: active ? "#00E676" : "#8888A0",
                  borderLeft: active ? "2px solid #7B2FBE" : "2px solid transparent",
                  background: active ? "rgba(123,47,190,0.06)" : "transparent",
                }}
              >
                <span style={{ color: active ? "#00E676" : "#8888A0" }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 md:ml-[240px] pb-20 md:pb-0" style={{ minHeight: "calc(100vh - 64px)" }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-[#2A2A3E]"
        style={{ height: "calc(64px + env(safe-area-inset-bottom))", background: "rgba(10,10,18,0.96)", backdropFilter: "blur(12px)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {nav.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors duration-150"
              style={{ color: active ? "#00E676" : "#8888A0" }}>
              <span style={{ color: active ? "#00E676" : "#8888A0" }}>{icon}</span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ── Auth guard ────────────────────────────────────────────────────────────────
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile) { router.replace("/signup/complete"); return; }
  }, [user, profile, loading, router]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A12" }}>
        <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#2A2A3E" strokeWidth="3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#7B2FBE" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  return (
    <ToastProvider>
      <DashboardShell>{children}</DashboardShell>
    </ToastProvider>
  );
}
