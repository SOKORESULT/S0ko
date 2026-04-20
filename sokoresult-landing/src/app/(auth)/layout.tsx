import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#111111" }}>

      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-1.5">
        <span className="text-[22px] font-bold tracking-tight"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
          <span style={{ color: "#00E676" }}>$OKO</span>
          <span className="text-white">RESULT</span>
        </span>
      </Link>

      {/* Card */}
      <div className="w-full rounded-2xl"
        style={{ maxWidth: 400, background: "#1C1C1C", padding: "36px 32px" }}>
        {children}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center gap-4 text-[12px]" style={{ color: "#555555" }}>
        <Link href="/terms" className="hover:text-[#888] transition-colors">Terms</Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-[#888] transition-colors">Privacy</Link>
        <span>·</span>
        <Link href="/help" className="hover:text-[#888] transition-colors">Help</Link>
      </div>
    </div>
  );
}
