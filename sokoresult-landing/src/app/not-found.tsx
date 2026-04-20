"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: "#0A0A12" }}>

      {/* Logo */}
      <Link href="/markets" className="mb-10 block">
        <span className="text-[18px] font-bold" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
          <span style={{ color: "#00E676" }}>$OKO</span>
          <span style={{ color: "#E8E8F0" }}>RESULT</span>
        </span>
      </Link>

      {/* 404 */}
      <div className="text-[80px] font-bold leading-none mb-2"
        style={{
          fontFamily: "var(--font-space-mono, monospace)",
          background: "linear-gradient(135deg, #7B2FBE, #00E676)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
        404
      </div>

      <h1 className="text-[20px] font-semibold text-white mb-2">Page not found</h1>
      <p className="text-[14px] text-[#8888A0] max-w-sm mb-8">
        Looks like this market doesn&apos;t exist. It may have been resolved or the URL is incorrect.
      </p>

      <Link
        href="/markets"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-[14px] font-semibold text-white transition-all duration-200"
        style={{ background: "#7B2FBE" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#9B4FDE"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#7B2FBE"; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Browse Markets
      </Link>
    </div>
  );
}
