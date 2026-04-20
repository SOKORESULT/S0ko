"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const STEPS = [
  {
    number: "01",
    title: "Pick a Take",
    description: "Browse markets across politics, sports, entertainment, and fashion. Every question has a price.",
    color: "#7B2FBE",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="12" rx="10" ry="6.5" />
        <circle cx="12" cy="12" r="3" />
        <path d="M2 12s3-6 10-6 10 6 10 6-3 6-10 6-10-6-10-6z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Buy Shares",
    description: "Buy YES or NO shares at the current probability price. Pay with M-Pesa, card, or $OKO tokens.",
    color: "#9B4FDE",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    number: "03",
    title: "Profit",
    description: "Sell when news moves the price, or hold to resolution. Every correct YES share pays 100 KES.",
    color: "#00E676",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/>
        <polyline points="16,7 22,7 22,13"/>
      </svg>
    ),
  },
];

const TRADE_TIMELINE = [
  { label: "Amina buys", detail: "100 YES shares at KES 50", value: "−KES 5,000", color: "#94A3B8", icon: "buy" },
  { label: "News breaks", detail: "Opposition candidate withdraws", value: "+17pts", color: "#F472B6", icon: "news" },
  { label: "Price jumps", detail: "Market reprices to KES 75", value: "KES 75", color: "#C4B5FD", icon: "price" },
  { label: "Amina sells", detail: "100 shares at KES 75", value: "+KES 7,500", color: "#00E676", icon: "profit" },
];

function StepIcon({ type }: { type: string }) {
  if (type === "buy") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
  if (type === "news") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/>
      <line x1="10" y1="7" x2="18" y2="7"/><line x1="10" y1="11" x2="18" y2="11"/><line x1="10" y1="15" x2="14" y2="15"/>
    </svg>
  );
  if (type === "price") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  );
}

export default function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 radial-green pointer-events-none opacity-40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-xl"
        >
          <span className="tag-pill bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20 mb-4 inline-block">
            How It Works
          </span>
          <h2 className="font-black text-[2.5rem] sm:text-[3rem] leading-tight tracking-tight mb-4" style={{ fontFamily: "Satoshi, sans-serif" }}>
            Trade What You Know
          </h2>
          <p className="text-[#94A3B8] text-[17px] leading-relaxed">
            Three simple steps. Real money. Real outcomes. The crowd knows more than any expert.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="glass glass-hover rounded-2xl p-7 relative overflow-hidden cursor-pointer group"
            >
              {/* Background accent */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 transition-opacity duration-300 group-hover:opacity-40"
                style={{ background: step.color }}
              />

              <div className="relative">
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${step.color}20`, color: step.color, border: `1px solid ${step.color}30` }}
                  >
                    {step.icon}
                  </div>
                  <span
                    className="font-black text-[3rem] leading-none opacity-10"
                    style={{ fontFamily: "var(--font-space-mono)", color: step.color }}
                  >
                    {step.number}
                  </span>
                </div>

                <h3 className="font-black text-[22px] text-white mb-3" style={{ fontFamily: "Satoshi, sans-serif" }}>
                  {step.title}
                </h3>
                <p className="text-[#64748B] text-[15px] leading-relaxed">{step.description}</p>
              </div>

              {/* Connector arrow (not last) */}
              {i < 2 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-[#0A0A12] border border-white/10 items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Worked example */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass rounded-2xl p-7 border border-[#00E676]/10"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-[#00E676]" />
            <span className="text-[14px] font-bold text-[#00E676] uppercase tracking-wider">Worked Example</span>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h4 className="font-black text-[17px] text-white mb-2" style={{ fontFamily: "Satoshi, sans-serif" }}>
                The Amina Trade
              </h4>
              <p className="text-[#64748B] text-[15px] leading-relaxed mb-4">
                Amina follows Kenyan politics closely. She sees YES at 50¢ and knows something the market doesn&apos;t yet.
              </p>
              <div className="bg-[#00E676]/10 border border-[#00E676]/20 rounded-xl px-5 py-4 inline-block">
                <span className="text-[#00E676] font-black text-[28px]" style={{ fontFamily: "var(--font-space-mono)" }}>
                  +KES 2,500
                </span>
                <p className="text-[#00E676]/70 text-[17px] font-medium mt-0.5">Net profit in one trade</p>
              </div>
            </div>

            <div className="space-y-3">
              {TRADE_TIMELINE.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 16 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
                  className="flex items-center gap-4"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${item.color}15`, color: item.color }}
                  >
                    <StepIcon type={item.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-white">{item.label}</span>
                      <span
                        className="text-[14px] font-black mono"
                        style={{ color: item.color }}
                      >
                        {item.value}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#64748B]">{item.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
