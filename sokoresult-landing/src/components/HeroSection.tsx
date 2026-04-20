"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import PredictionChart from "./PredictionChart";

function CountUp({ end, duration = 2000, prefix = "", suffix = "" }: { end: number; duration?: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let startTime: number | null = null;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, end, duration]);

  const formatted = count >= 1000000
    ? (count / 1000000).toFixed(1) + "M"
    : count >= 1000
    ? (count / 1000).toFixed(1) + "K"
    : count.toLocaleString();

  return (
    <span ref={ref} className="mono">
      {prefix}{formatted}{suffix}
    </span>
  );
}

const STATS = [
  { label: "Active Markets", value: 247, prefix: "" },
  { label: "Total Volume", value: 48600000, prefix: "KES " },
  { label: "Traders", value: 12841, prefix: "" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-20 pb-0 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute inset-0 radial-purple pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#7B2FBE]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#00E676]/3 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* Left: Text content */}
          <div className="relative z-10">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-[#7B2FBE]/15 border border-[#7B2FBE]/30 rounded-full px-4 py-2 mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] live-dot" />
              <span className="text-[17px] font-semibold text-[#C4B5FD] tracking-wide">Now Live — Nairobi, Kenya</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-black leading-[1.05] tracking-tight mb-5"
              style={{ fontFamily: "Satoshi, sans-serif", fontSize: "clamp(2.8rem, 6vw, 4.5rem)" }}
            >
              Africa&apos;s{" "}
              <span className="text-[#00E676] text-glow-green">
                Prediction
              </span>
              <br />
              Market.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[#94A3B8] text-[17px] sm:text-[17px] leading-relaxed mb-8 max-w-[480px]"
            >
              Buy and sell shares in real-world outcomes.{" "}
              <span className="text-white/70">Politics. Sports. Entertainment. Fashion.</span>{" "}
              Profit when you&apos;re right — or sell early when the price moves.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3 mb-10"
            >
              <a
                href="/signup"
                className="cursor-pointer inline-flex items-center gap-2 bg-[#00E676] text-[#0A0A12] font-black text-[14px] px-7 py-3.5 rounded-xl hover:bg-[#00C853] transition-all duration-200 hover:shadow-[0_0_30px_rgba(0,230,118,0.3)]"
              >
                Start Trading
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
              <a
                href="#whitepaper"
                className="cursor-pointer inline-flex items-center gap-2 border border-white/[0.15] text-white font-bold text-[14px] px-7 py-3.5 rounded-xl hover:bg-white/[0.05] hover:border-white/30 transition-all duration-200"
              >
                Read Whitepaper
              </a>
            </motion.div>

            {/* Payment badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex items-center gap-3 flex-wrap"
            >
              <span className="text-[14px] text-[#64748B] font-medium uppercase tracking-wider">Pay via</span>
              {/* M-Pesa */}
              <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5">
                <svg width="22" height="14" viewBox="0 0 120 60" fill="none">
                  <rect width="120" height="60" rx="8" fill="#4DB848"/>
                  <text x="10" y="42" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="32" fill="white">M</text>
                  <text x="48" y="28" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="13" fill="white">PESA</text>
                  <text x="48" y="44" fontFamily="Arial, sans-serif" fontSize="9" fill="rgba(255,255,255,0.8)">Safaricom</text>
                </svg>
              </div>
              {/* Visa */}
              <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5">
                <svg width="28" height="14" viewBox="0 0 100 60" fill="none">
                  <rect width="100" height="60" rx="6" fill="#1A1F71"/>
                  <text x="50" y="40" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="30" fontStyle="italic" fill="white" letterSpacing="-1">VISA</text>
                </svg>
              </div>
              {/* Mastercard */}
              <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5">
                <svg width="22" height="14" viewBox="0 0 100 60" fill="none">
                  <rect width="100" height="60" rx="6" fill="#252525"/>
                  <circle cx="38" cy="30" r="18" fill="#EB001B"/>
                  <circle cx="62" cy="30" r="18" fill="#F79E1B"/>
                  <path d="M50 14.6a18 18 0 010 30.8A18 18 0 0150 14.6z" fill="#FF5F00"/>
                </svg>
              </div>
              {/* OKO */}
              <div className="flex items-center gap-1.5 bg-[#7B2FBE]/15 border border-[#7B2FBE]/30 rounded-lg px-2.5 py-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/oko-coin.png" alt="$OKO" className="w-4 h-4 object-contain" />
                <span className="text-[17px] font-bold text-[#C4B5FD]">$OKO</span>
              </div>
            </motion.div>
          </div>

          {/* Right: Prediction chart */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="glass rounded-2xl p-5 relative overflow-hidden border border-[#7B2FBE]/20">
              <div className="absolute inset-0 bg-gradient-to-br from-[#7B2FBE]/5 to-transparent pointer-events-none rounded-2xl" />
              <PredictionChart />
            </div>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 relative"
        >
          <div className="border-t border-white/[0.07] pt-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-white/[0.07]">
              {STATS.map((stat, i) => (
                <div key={stat.label} className="md:px-8 first:pl-0">
                  <p className="text-[24px] sm:text-[28px] font-black text-white mb-0.5">
                    <CountUp end={stat.value} prefix={stat.prefix} />
                  </p>
                  <p className="text-[17px] text-[#64748B] font-medium">{stat.label}</p>
                </div>
              ))}
              <div className="md:px-8">
                <p className="text-[24px] sm:text-[28px] font-black mb-0.5 flex items-center gap-2">
                  <span className="mono text-white">KES 2.45</span>
                  <span className="text-[17px] text-[#00E676] font-bold">▲4.2%</span>
                </p>
                <p className="text-[17px] text-[#64748B] font-medium">$OKO Price</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
