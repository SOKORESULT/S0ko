"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const NEWS_ITEMS = [
  {
    source: "KTN News",
    verified: true,
    headline: "Opposition candidate officially withdraws from 2027 presidential race citing health concerns",
    time: "3 min ago",
    market: "Will William Ruto win 2027?",
    priceChange: +17,
  },
  {
    source: "The Standard",
    verified: true,
    headline: "FIFA shortlists Kenya as potential host for U-20 World Cup 2027 alongside South Africa",
    time: "18 min ago",
    market: "Will Kenya host FIFA U-20 WC?",
    priceChange: +8,
  },
  {
    source: "Pulse Nigeria",
    verified: false,
    headline: "Nollywood director announces film entered in next year's Oscar consideration campaign",
    time: "42 min ago",
    market: "Nollywood Oscar by 2028?",
    priceChange: +5,
  },
  {
    source: "Nairobi News",
    verified: true,
    headline: "Harambee Stars secure crucial AFCON qualifier win in Addis Ababa — 2-1 final",
    time: "1 hr ago",
    market: "Harambee Stars AFCON 2027?",
    priceChange: +11,
  },
  {
    source: "The East African",
    verified: true,
    headline: "Lagos Fashion Week reveals record 820K viewers for last season, sets 1M target for 2025",
    time: "2 hrs ago",
    market: "Lagos Fashion Week 1M viewers?",
    priceChange: +6,
  },
];

function NewsCard({ item, index, inView }: { item: typeof NEWS_ITEMS[0]; index: number; inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="glass rounded-xl p-4 border-l-2 cursor-pointer"
      style={{ borderLeftColor: item.verified ? "#00E676" : "#F59E0B" }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[14px] font-bold text-white/90 truncate">{item.source}</span>
          {item.verified ? (
            <div className="flex items-center gap-1 bg-[#00E676]/10 border border-[#00E676]/20 rounded-full px-2 py-0.5 shrink-0">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-[9px] font-bold text-[#00E676]">Verified</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-full px-2 py-0.5 shrink-0">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="text-[9px] font-bold text-[#F59E0B]">Pending</span>
            </div>
          )}
        </div>
        <span className="text-[14px] text-[#64748B] shrink-0 mono">{item.time}</span>
      </div>

      <p className="text-[14px] text-white/80 leading-snug mb-3 line-clamp-2">{item.headline}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
            <polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/>
          </svg>
          <span className="text-[14px] text-[#64748B] truncate">{item.market}</span>
        </div>
        <span className="text-[14px] font-bold text-[#00E676] mono shrink-0">+{item.priceChange}pts</span>
      </div>
    </motion.div>
  );
}

export default function NewsFeedSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Left: Messaging */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="lg:sticky lg:top-24"
          >
            <span className="tag-pill bg-[#F472B6]/10 text-[#F472B6] border border-[#F472B6]/20 mb-5 inline-block">
              Verified Intel
            </span>
            <h2 className="font-black text-[2.5rem] sm:text-[3.2rem] leading-[1.05] tracking-tight mb-6" style={{ fontFamily: "Satoshi, sans-serif" }}>
              Information
              <br />
              <span className="text-[#F472B6]">Moves</span> Money.
            </h2>
            <p className="text-[#94A3B8] text-[17px] leading-relaxed mb-8 max-w-md">
              Our network of <span className="text-white font-semibold">50+ verified correspondents</span> across Africa delivers breaking news before anyone else. Every story is verified. Every story moves markets.
            </p>

            <div className="space-y-4 mb-8">
              {[
                { icon: "verify", label: "Verified by our correspondents" , desc: "Every story goes through our editorial process before it's tagged as verified." },
                { icon: "speed", label: "Average 4 minute news lag" , desc: "Faster than traditional media. Our network is on the ground." },
                { icon: "globe", label: "Coverage across 14 African countries" , desc: "Kenya, Nigeria, Ghana, South Africa, Ethiopia, Uganda, and more." },
              ].map((item) => (
                <div key={item.label} className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-[#F472B6]/10 border border-[#F472B6]/20 flex items-center justify-center shrink-0">
                    {item.icon === "verify" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <polyline points="9 12 11 14 15 10"/>
                      </svg>
                    )}
                    {item.icon === "speed" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                    )}
                    {item.icon === "globe" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-[17px] font-semibold text-white mb-0.5">{item.label}</p>
                    <p className="text-[17px] text-[#64748B] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 text-[14px] text-[#94A3B8]">
              <span className="font-semibold">See the news.</span>
              <svg width="4" height="4" viewBox="0 0 4 4"><circle cx="2" cy="2" r="2" fill="#64748B"/></svg>
              <span className="font-semibold">Know the odds.</span>
              <svg width="4" height="4" viewBox="0 0 4 4"><circle cx="2" cy="2" r="2" fill="#64748B"/></svg>
              <span className="font-semibold text-[#F472B6]">Make the trade.</span>
            </div>
          </motion.div>

          {/* Right: Live feed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00E676] live-dot" />
                <span className="text-[14px] font-bold text-[#00E676] uppercase tracking-wider">Live Feed</span>
              </div>
              <span className="text-[17px] text-[#64748B] mono">Updates every 90s</span>
            </div>

            <div className="space-y-3">
              {NEWS_ITEMS.map((item, i) => (
                <NewsCard key={i} item={item} index={i} inView={inView} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
