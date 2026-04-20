"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";

const TOKEN_UTILITIES = [
  {
    title: "30% Fee Discount",
    description: "Pay all trading fees in $OKO and keep more of your profits.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
    color: "#00E676",
  },
  {
    title: "Create Markets",
    description: "Stake $OKO to propose and launch your own prediction markets.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    color: "#C4B5FD",
  },
  {
    title: "Earn via Airdrops",
    description: "Get $OKO for signing up, referring traders, and maintaining winning streaks.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    color: "#F472B6",
  },
  {
    title: "Governance Voting",
    description: "Vote on new market categories, fee structures, and protocol upgrades.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z"/>
      </svg>
    ),
    color: "#7B2FBE",
    comingSoon: true,
  },
];

const TOKEN_STATS = [
  { label: "Total Supply", value: "1,000,000,000", suffix: " $OKO" },
  { label: "Initial Circulation", value: "150,000,000", suffix: " $OKO" },
  { label: "Network", value: "Polygon", suffix: "" },
  { label: "Launch Price", value: "KES 2.45", suffix: "" },
];

function OKOCoin() {
  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#F472B6]/25 to-[#C084FC]/15 blur-[50px]" />

      {/* Real coin image */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-full h-full"
      >
        <Image
          src="/oko-coin.png"
          alt="$OKO Token coin"
          fill
          className="object-contain drop-shadow-[0_20px_40px_rgba(212,149,110,0.5)]"
          priority
        />
      </motion.div>

      {/* Floating sparkles */}
      {[["-top-2", "-right-4"], ["top-1/4", "-left-6"], ["-bottom-3", "right-1/4"]].map(([t, r], i) => (
        <motion.div
          key={i}
          className={`absolute ${t} ${r}`}
          animate={{ y: [0, -4, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#F472B6">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

export default function OKOTokenSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="token" className="py-24 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A12] via-[#110B1E] to-[#0A0A12] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#7B2FBE]/8 blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="tag-pill bg-[#7B2FBE]/15 text-[#C4B5FD] border border-[#7B2FBE]/25 mb-4 inline-block">
            $OKO Token
          </span>
          <h2 className="font-black text-[2.5rem] sm:text-[3rem] leading-tight tracking-tight mb-4" style={{ fontFamily: "Satoshi, sans-serif" }}>
            Own a Piece of the Market
          </h2>
          <p className="text-[#94A3B8] text-[17px] max-w-xl mx-auto leading-relaxed">
            $OKO is the utility token that powers the entire SokoResult ecosystem. Trade. Stake. Govern. Earn.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Coin */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex justify-center"
          >
            <OKOCoin />
          </motion.div>

          {/* Utilities */}
          <div>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {TOKEN_UTILITIES.map((util, i) => (
                <motion.div
                  key={util.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                  className="glass glass-hover rounded-xl p-5 cursor-pointer relative"
                >
                  {util.comingSoon && (
                    <span className="absolute top-3 right-3 tag-pill bg-[#64748B]/20 text-[#64748B] border border-[#64748B]/20">
                      Soon
                    </span>
                  )}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: `${util.color}15`, color: util.color }}
                  >
                    {util.icon}
                  </div>
                  <h4 className="font-bold text-[17px] text-white mb-1">{util.title}</h4>
                  <p className="text-[17px] text-[#64748B] leading-relaxed">{util.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Token stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="glass rounded-xl p-5 border border-[#7B2FBE]/20"
            >
              <div className="grid grid-cols-2 gap-4">
                {TOKEN_STATS.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-[14px] text-[#64748B] font-medium mb-1">{stat.label}</p>
                    <p className="text-[17px] font-black text-white mono">{stat.value}{stat.suffix}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="mt-5"
            >
              <a
                href="#waitlist"
                className="cursor-pointer inline-flex items-center gap-2 bg-gradient-to-r from-[#7B2FBE] to-[#9B4FDE] text-white font-bold text-[17px] px-6 py-3 rounded-xl hover:shadow-[0_0_30px_rgba(123,47,190,0.4)] transition-all duration-200"
              >
                Get $OKO
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
