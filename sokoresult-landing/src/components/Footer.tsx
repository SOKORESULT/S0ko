"use client";

import Image from "next/image";

const LINKS = {
  Product: ["Markets", "How It Works", "$OKO Token", "Leaderboard"],
  Company: ["About", "Careers", "Blog", "Contact"],
  Resources: ["Whitepaper", "API Docs", "Subgraph", "Brand Kit"],
  Legal: ["Terms of Service", "Privacy Policy", "Cookie Policy", "Responsible Trading"],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0A0A10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        {/* Top: Logo + links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Logo / brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                <Image src="/sokoresult-logo.png" alt="SokoResult" fill className="object-cover" />
              </div>
              <span className="font-black text-[14px] text-white" style={{ fontFamily: "Satoshi, sans-serif" }}>
                $OKO<span className="text-[#00E676]">RESULT</span>
              </span>
            </div>
            <p className="text-[17px] text-[#64748B] leading-relaxed mb-4 max-w-[180px]">
              Africa&apos;s first prediction market. Put your money where your mouth is.
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {[
                { label: "Twitter/X", icon: <path d="M4 4l16 16M4 20L20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/> },
                { label: "Telegram", icon: <path d="M21 5L2 12.5l7 1M21 5l-4 14-8-5.5M9 13.5l2 5.5 3-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/> },
                { label: "Discord", icon: <path d="M9 12a1 1 0 100-2 1 1 0 000 2zM15 12a1 1 0 100-2 1 1 0 000 2zM7.5 7.5C9 6.5 10.5 6 12 6s3 .5 4.5 1.5M7.5 16.5C9 17.5 10.5 18 12 18s3-.5 4.5-1.5M5 5l1 2M19 5l-1 2M5 19l1-2M19 19l-1-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/> },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#64748B] hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-200 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">{social.icon}</svg>
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(LINKS).map(([category, items]) => (
            <div key={category}>
              <p className="text-[14px] font-bold text-[#64748B] uppercase tracking-wider mb-4">{category}</p>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-[14px] text-[#64748B] hover:text-white transition-colors duration-200 cursor-pointer"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[17px] text-[#64748B]">
            © 2026 SokoResult Inc. — Nairobi, Kenya
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00E676] opacity-80" />
            <span className="text-[17px] text-[#64748B]">All systems operational</span>
          </div>
          <p className="text-[17px] text-[#64748B]">
            Built on{" "}
            <span className="text-[#C4B5FD] font-semibold">Polygon</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
