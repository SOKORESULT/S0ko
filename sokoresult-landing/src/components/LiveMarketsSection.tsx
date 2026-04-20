"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const CATEGORIES = ["All", "Politics", "Sports", "Entertainment", "Fashion"];

const MARKETS = [
  {
    question: "Will William Ruto win the 2027 Presidential Election?",
    yesPrice: 62,
    volume: "KES 4.2M",
    change: +3.4,
    category: "Politics",
    trending: true,
    timeLeft: "412 days",
  },
  {
    question: "Will Harambee Stars qualify for AFCON 2027?",
    yesPrice: 34,
    volume: "KES 1.8M",
    change: -1.2,
    category: "Sports",
    trending: false,
    timeLeft: "290 days",
  },
  {
    question: "Will a Nollywood film win an Oscar by 2028?",
    yesPrice: 18,
    volume: "KES 890K",
    change: +5.1,
    category: "Entertainment",
    trending: true,
    timeLeft: "620 days",
  },
  {
    question: "Will Lagos Fashion Week surpass 1M global viewers?",
    yesPrice: 71,
    volume: "KES 2.1M",
    change: +2.8,
    category: "Fashion",
    trending: true,
    timeLeft: "85 days",
  },
  {
    question: "Will Kenya host the FIFA U-20 World Cup?",
    yesPrice: 45,
    volume: "KES 3.4M",
    change: +0.5,
    category: "Sports",
    trending: false,
    timeLeft: "530 days",
  },
  {
    question: "Will Burna Boy headline Coachella 2027?",
    yesPrice: 55,
    volume: "KES 1.5M",
    change: +8.2,
    category: "Entertainment",
    trending: false,
    timeLeft: "370 days",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Politics: "#7B2FBE",
  Sports: "#0EA5E9",
  Entertainment: "#F472B6",
  Fashion: "#F59E0B",
};

function MarketCard({ market, index, inView }: { market: typeof MARKETS[0]; index: number; inView: boolean }) {
  const barColor = market.yesPrice >= 50 ? "#00E676" : "#94A3B8";
  const catColor = CATEGORY_COLORS[market.category] || "#94A3B8";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="glass glass-hover rounded-xl p-5 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="tag-pill"
            style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}25` }}
          >
            {market.category}
          </span>
          {market.trending && (
            <span className="tag-pill bg-[#F472B6]/10 text-[#F472B6] border border-[#F472B6]/20">
              Trending
            </span>
          )}
        </div>
        <div
          className={`flex items-center gap-1 text-[13px] font-bold mono shrink-0 ${market.change >= 0 ? "text-[#00E676]" : "text-[#F87171]"}`}
        >
          {market.change >= 0 ? "▲" : "▼"} {Math.abs(market.change)}%
        </div>
      </div>

      <p className="text-[14px] font-semibold text-white leading-snug mb-4 group-hover:text-white/90 transition-colors">
        {market.question}
      </p>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[14px] text-[#64748B] font-medium">YES probability</span>
          <span
            className="text-[17px] font-black mono"
            style={{ color: barColor }}
          >
            {market.yesPrice}¢
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={inView ? { width: `${market.yesPrice}%` } : {}}
            transition={{ duration: 0.8, delay: index * 0.07 + 0.3, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${barColor}80, ${barColor})` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[#64748B] mono">Vol {market.volume}</span>
        <span className="text-[13px] text-[#64748B]">{market.timeLeft} left</span>
      </div>
    </motion.div>
  );
}

export default function LiveMarketsSection() {
  const [activeCategory, setActiveCategory] = useState("All");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const filtered = activeCategory === "All"
    ? MARKETS
    : MARKETS.filter((m) => m.category === activeCategory);

  return (
    <section id="markets" className="py-24 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 radial-purple pointer-events-none opacity-30" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
        >
          <div>
            <span className="tag-pill bg-[#7B2FBE]/15 text-[#C4B5FD] border border-[#7B2FBE]/25 mb-4 inline-block">
              Live Markets
            </span>
            <h2 className="font-black text-[2.5rem] sm:text-[3rem] leading-tight tracking-tight" style={{ fontFamily: "Satoshi, sans-serif" }}>
              What&apos;s Trading Now
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] live-dot" />
            <span className="text-[14px] text-[#00E676] font-semibold">247 markets open</span>
          </div>
        </motion.div>

        {/* Category filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex items-center gap-2 mb-8 flex-wrap"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`cursor-pointer px-4 py-2 rounded-lg text-[14px] font-semibold transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-[#7B2FBE] text-white"
                  : "bg-white/[0.04] text-[#94A3B8] border border-white/[0.07] hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Market cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {filtered.map((market, i) => (
            <MarketCard key={market.question} market={market} index={i} inView={inView} />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center"
        >
          <a
            href="#waitlist"
            className="cursor-pointer inline-flex items-center gap-2 text-[#00E676] font-bold text-[14px] border border-[#00E676]/30 rounded-xl px-7 py-3.5 hover:bg-[#00E676]/10 transition-all duration-200"
          >
            Explore All Markets
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
