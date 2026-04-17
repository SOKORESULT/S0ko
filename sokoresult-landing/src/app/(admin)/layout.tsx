"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ToastProvider } from "@/components/ui/toast";
import type { Profile } from "@/lib/types/database";
import { NewsAutoPoller } from "@/components/news-auto-poller";

const ADMIN_NAV = [
  {
    href: "/admin/markets",
    label: "Markets",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: "/admin/markets/create",
    label: "Create Market",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    href: "/admin/markets/bulk",
    label: "Bulk Create",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/admin/news",
    label: "News Engine",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
        <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/>
      </svg>
    ),
  },
  {
    href: "/admin/ai",
    label: "AI Predictions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
      </svg>
    ),
  },
  {
    href: "/admin/suggestions",
    label: "Suggestions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    href: "/admin/emotions",
    label: "Emotions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  {
    href: "/admin/correspondents",
    label: "Correspondents",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ background: "#080810" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 border-b"
        style={{ height: 64, background: "rgba(8,8,16,0.95)", backdropFilter: "blur(12px)", borderColor: "#1E1E2E" }}
      >
        <div className="flex items-center gap-4">
          <span
            className="text-[17px] font-bold"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            <span style={{ color: "#FF6B35" }}>ADMIN</span>
            <span className="text-white"> · SokoResult</span>
          </span>
        </div>
        <Link
          href="/markets"
          className="flex items-center gap-1.5 text-[13px] font-medium transition-colors"
          style={{ color: "#8888A0" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#E8E8F0"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#8888A0"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to App
        </Link>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav
          className="hidden md:flex flex-col fixed left-0 top-16 bottom-0 border-r z-40 overflow-y-auto"
          style={{ width: 220, background: "#080810", borderColor: "#1E1E2E", paddingTop: 16, paddingBottom: 16 }}
        >
          <div className="px-5 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#FF6B35", opacity: 0.7 }}>
              Admin Panel
            </span>
          </div>
          {ADMIN_NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== "/admin/markets" && pathname.startsWith(href));
            const exactActive = href === "/admin/markets" && (pathname === href || (pathname.startsWith("/admin/markets/") && !pathname.startsWith("/admin/markets/create") && !pathname.startsWith("/admin/markets/bulk")));
            const isActive = href === "/admin/markets" ? exactActive : active;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-5 py-3 text-[13px] font-medium transition-all duration-150"
                style={{
                  color: isActive ? "#FF6B35" : "#8888A0",
                  borderLeft: isActive ? "2px solid #FF6B35" : "2px solid transparent",
                  background: isActive ? "rgba(255,107,53,0.06)" : "transparent",
                }}
              >
                <span style={{ color: isActive ? "#FF6B35" : "#8888A0" }}>{icon}</span>
                {label}
              </Link>
            );
          })}

          <div className="mt-auto px-5 pt-6 border-t" style={{ borderColor: "#1E1E2E", marginTop: "auto" }}>
            <p className="text-[11px]" style={{ color: "#8888A0" }}>
              Admin access only.<br />Changes take effect immediately.
            </p>
          </div>
        </nav>

        {/* Main */}
        <main className="flex-1 md:ml-[220px]" style={{ minHeight: "calc(100vh - 64px)" }}>
          <NewsAutoPoller />
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile) { router.replace("/signup/complete"); return; }
    if (!(profile as Profile & { is_admin?: boolean }).is_admin) {
      router.replace("/markets");
    }
  }, [user, profile, loading, router]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080810" }}>
        <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#1E1E2E" strokeWidth="3" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (!(profile as Profile & { is_admin?: boolean }).is_admin) {
    return null;
  }

  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
