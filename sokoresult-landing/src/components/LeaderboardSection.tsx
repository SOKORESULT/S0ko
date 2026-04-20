"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const TRADERS = [
  { rank: 1, name: "MkekaWaBets", profit: "KES 342,100", accuracy: "78%", trades: 214, badge: "gold" },
  { rank: 2, name: "NairobiOracle", profit: "KES 287,600", accuracy: "74%", trades: 186, badge: "silver" },
  { rank: 3, name: "BetKing254", profit: "KES 198,400", accuracy: "71%", trades: 152, badge: "bronze" },
  { rank: 4, name: "LagosAlpha", profit: "KES 156,200", accuracy: "69%", trades: 201, badge: "" },
  { rank: 5, name: "AccraBull", profit: "KES 122,800", accuracy: "67%", trades: 98, badge: "" },
];

const BADGE_COLORS: Record<string, string> = {
  gold: "#F59E0B",
  silver: "#94A3B8",
  bronze: "#CD7C5C",
};

const BAR_WIDTHS = ["100%", "84%", "58%", "46%", "36%"];

export default function LeaderboardSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 radial-purple pointer-events-none opacity-25" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="tag-pill bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 mb-3 inline-block">
                  Leaderboard
                </span>
                <h3 className="font-black text-[22px] text-white" style={{ fontFamily: "Satoshi, sans-serif" }}>
                  Top Predictors
                </h3>
              </div>
              <div className="text-[13px] text-[#64748B] mono">This week</div>
            </div>

            <div className="space-y-3">
              {TRADERS.map((trader, i) => (
                <motion.div
                  key={trader.rank}
                  initial={{ opacity: 0, x: -16 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="glass glass-hover rounded-xl p-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-2">
                    {/* Rank */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-[14px]"
                      style={{
                        background: trader.badge ? `${BADGE_COLORS[trader.badge]}20` : "rgba(255,255,255,0.05)",
                        color: trader.badge ? BADGE_COLORS[trader.badge] : "#64748B",
                        fontFamily: "var(--font-space-mono)",
                      }}
                    >
                      #{trader.rank}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-bold text-white truncate">{trader.name}</span>
                        <span className="text-[15px] font-black text-[#00E676] mono shrink-0">{trader.profit}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[14px] text-[#64748B]">{trader.trades} trades</span>
                        <span className="text-[14px] text-[#94A3B8] font-semibold">{trader.accuracy} accuracy</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit bar */}
                  <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={inView ? { width: BAR_WIDTHS[i] } : {}}
                      transition={{ duration: 0.7, delay: i * 0.07 + 0.3, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        background: trader.badge
                          ? `linear-gradient(90deg, ${BADGE_COLORS[trader.badge]}60, ${BADGE_COLORS[trader.badge]})`
                          : "linear-gradient(90deg, rgba(0,230,118,0.4), rgba(0,230,118,0.7))",
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Messaging */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:pl-8"
          >
            <h2 className="font-black text-[2.8rem] sm:text-[3.2rem] leading-[1.05] tracking-tight mb-5" style={{ fontFamily: "Satoshi, sans-serif" }}>
              The sharpest
              <br />
              minds on the
              <br />
              <span className="gradient-text-green">continent.</span>
            </h2>
            <p className="text-[#94A3B8] text-[17px] leading-relaxed mb-8">
              Knowledge is an edge. On SokoResult, what you know about Africa — politics, culture, sport, fashion — is worth real money.
            </p>

            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { value: "78%", label: "Best accuracy rate" },
                { value: "KES 1.2M", label: "Paid out this week" },
                { value: "4.8x", label: "Best return this month" },
                { value: "50+", label: "African countries covered" },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-4">
                  <p className="font-black text-[22px] text-white mono">{stat.value}</p>
                  <p className="text-[14px] text-[#64748B] mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            <a
              href="#waitlist"
              className="cursor-pointer inline-flex items-center gap-2 bg-[#00E676] text-[#0A0A12] font-black text-[14px] px-7 py-3.5 rounded-xl hover:bg-[#00C853] transition-all duration-200 hover:shadow-[0_0_30px_rgba(0,230,118,0.3)]"
            >
              Join the Top Traders
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
