"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const API_CARDS = [
  {
    title: "Market API",
    description: "REST endpoints for market data, prices, order books, and historical resolution data.",
    method: "GET",
    endpoint: "/v1/markets/{id}",
    color: "#00E676",
    snippet: `{
  "id": "ruto-2027",
  "yes_price": 0.62,
  "volume_24h": 420000,
  "liquidity": 180000,
  "closes_at": "2027-08-09"
}`,
  },
  {
    title: "CLOB API",
    description: "Full order book access. Place limit and market orders. WebSocket stream for real-time fills.",
    method: "POST",
    endpoint: "/v1/orders",
    color: "#C4B5FD",
    snippet: `{
  "market": "ruto-2027",
  "side": "YES",
  "size": 100,
  "price": 0.62,
  "type": "limit"
}`,
  },
  {
    title: "Subgraph (GraphQL)",
    description: "On-chain data via The Graph. Query settlements, positions, and token flows on Polygon.",
    method: "GQL",
    endpoint: "query { markets }",
    color: "#F472B6",
    snippet: `query {
  markets(first: 10) {
    id
    yesPrice
    totalVolume
    resolved
  }
}`,
  },
];

export default function DeveloperSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="developers" className="py-24 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-30" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="grid lg:grid-cols-2 gap-12 items-center mb-14"
        >
          <div>
            <span className="tag-pill bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20 mb-4 inline-block">
              For Developers
            </span>
            <h2 className="font-black text-[2.5rem] sm:text-[3rem] leading-tight tracking-tight mb-4" style={{ fontFamily: "Satoshi, sans-serif" }}>
              Build on
              <br />
              <span className="gradient-text-green">SokoResult</span>
            </h2>
            <p className="text-[#94A3B8] text-[17px] leading-relaxed">
              Open REST APIs. Real-time WebSocket streams. On-chain data via The Graph. Build trading bots, dashboards, and integrations on top of Africa&apos;s prediction infrastructure.
            </p>
          </div>

          <div className="glass rounded-2xl p-6 border border-[#00E676]/10 font-mono text-[14px]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-[#F87171]" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <div className="w-3 h-3 rounded-full bg-[#00E676]" />
              <span className="text-[#64748B] text-[14px] ml-2">terminal</span>
            </div>
            <div className="space-y-1.5">
              <p><span className="text-[#7B2FBE]">$</span> <span className="text-[#94A3B8]">curl</span> <span className="text-[#00E676]">api.sokoresult.io/v1/markets</span></p>
              <p className="text-[#64748B]">  -H <span className="text-[#F472B6]">&quot;Authorization: Bearer $API_KEY&quot;</span></p>
              <p className="text-white mt-3">{"{"}</p>
              <p className="text-white ml-4"><span className="text-[#C4B5FD]">&quot;markets&quot;</span>: [</p>
              <p className="text-white ml-8">{"{"} <span className="text-[#C4B5FD]">&quot;id&quot;</span>: <span className="text-[#00E676]">&quot;ruto-2027&quot;</span>, <span className="text-[#C4B5FD]">&quot;yes&quot;</span>: <span className="text-[#F59E0B]">0.62</span> {"}"}</p>
              <p className="text-white ml-4">]</p>
              <p className="text-white">{"}"}</p>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {API_CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="glass glass-hover rounded-xl overflow-hidden cursor-pointer"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/[0.06]">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="tag-pill"
                    style={{ background: `${card.color}15`, color: card.color, border: `1px solid ${card.color}25` }}
                  >
                    {card.method}
                  </div>
                </div>
                <h4 className="font-black text-[17px] text-white mb-2" style={{ fontFamily: "Satoshi, sans-serif" }}>{card.title}</h4>
                <p className="text-[14px] text-[#64748B] leading-relaxed">{card.description}</p>
                <p className="text-[13px] mono mt-3" style={{ color: card.color }}>{card.endpoint}</p>
              </div>

              {/* Code snippet */}
              <div className="p-4 bg-black/20">
                <pre className="text-[13px] text-[#94A3B8] leading-relaxed overflow-x-auto mono whitespace-pre-wrap">
                  {card.snippet}
                </pre>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mt-8 text-center"
        >
          <a
            href="#"
            className="cursor-pointer inline-flex items-center gap-2 border border-white/[0.12] text-[#94A3B8] font-semibold text-[17px] px-6 py-3 rounded-xl hover:bg-white/[0.05] hover:text-white hover:border-white/20 transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            Read API Docs
          </a>
        </motion.div>
      </div>
    </section>
  );
}
