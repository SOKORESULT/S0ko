"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// M-Pesa SVG — accurate brand colors (green #4DB848, red #E2231A)
const MPesaLogo = () => (
  <svg width="72" height="40" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="60" rx="8" fill="#4DB848"/>
    {/* M */}
    <text x="10" y="42" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="32" fill="white">M</text>
    {/* -Pesa */}
    <text x="42" y="28" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="11" fill="white">-</text>
    <text x="48" y="28" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="13" fill="white">PESA</text>
    {/* Safaricom byline */}
    <text x="48" y="44" fontFamily="Arial, sans-serif" fontWeight="400" fontSize="9" fill="rgba(255,255,255,0.8)">Safaricom</text>
  </svg>
);

// Visa SVG — accurate brand (blue #1A1F71, yellow #F7A600)
const VisaLogo = () => (
  <svg width="60" height="40" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" rx="6" fill="#1A1F71"/>
    <text x="50" y="40" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="30" fontStyle="italic" fill="white" letterSpacing="-1">VISA</text>
  </svg>
);

// Mastercard SVG — accurate brand (red #EB001B, orange #F79E1B, overlap #FF5F00)
const MastercardLogo = () => (
  <svg width="60" height="40" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" rx="6" fill="#252525"/>
    <circle cx="38" cy="30" r="18" fill="#EB001B"/>
    <circle cx="62" cy="30" r="18" fill="#F79E1B"/>
    {/* Overlap blend */}
    <path d="M50 14.6a18 18 0 010 30.8A18 18 0 0150 14.6z" fill="#FF5F00"/>
  </svg>
);

const PAYMENT_METHODS = [
  {
    name: "M-Pesa",
    tagline: "Deposit instantly with M-Pesa STK Push. Your money, your phone, your trades.",
    color: "#4DB848",
    bgColor: "rgba(77, 184, 72, 0.05)",
    borderColor: "rgba(77, 184, 72, 0.15)",
    logo: <MPesaLogo />,
    features: ["Instant STK Push", "No bank account needed", "Available 24/7"],
  },
  {
    name: "Visa / Mastercard",
    tagline: "Visa and Mastercard accepted. 3D Secure. Funds credited instantly to your trading account.",
    color: "#60A5FA",
    bgColor: "rgba(96, 165, 250, 0.04)",
    borderColor: "rgba(96, 165, 250, 0.12)",
    logo: (
      <div className="flex items-center gap-3">
        <VisaLogo />
        <MastercardLogo />
      </div>
    ),
    features: ["3D Secure verified", "Instant crediting", "Visa & Mastercard"],
  },
  {
    name: "$OKO Token",
    tagline: "Trade with $OKO for 30% off all fees. Convert KES ↔ $OKO in one tap — no wallet needed.",
    color: "#C4B5FD",
    bgColor: "rgba(196, 181, 253, 0.04)",
    borderColor: "rgba(123, 47, 190, 0.18)",
    logo: (
      <div className="relative w-16 h-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/oko-coin.png" alt="$OKO" className="w-full h-full object-contain" />
      </div>
    ),
    features: ["30% fee discount", "KES ↔ $OKO swap", "On Polygon network"],
  },
];

export default function PaymentSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-40" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="tag-pill bg-[#60A5FA]/10 text-[#60A5FA] border border-[#60A5FA]/20 mb-4 inline-block">
            Payments
          </span>
          <h2 className="font-black text-[2.5rem] sm:text-[3rem] leading-tight tracking-tight mb-4" style={{ fontFamily: "Satoshi, sans-serif" }}>
            Pay Your Way
          </h2>
          <p className="text-[#94A3B8] text-[17px] max-w-xl mx-auto">
            From M-Pesa on your Nokia to crypto on Polygon — we meet you where you are.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {PAYMENT_METHODS.map((method, i) => (
            <motion.div
              key={method.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-2xl p-7 glass glass-hover cursor-pointer group"
              style={{ background: method.bgColor, borderColor: method.borderColor }}
            >
              <div className="mb-5">{method.logo}</div>
              <h3 className="font-black text-[17px] text-white mb-3" style={{ fontFamily: "Satoshi, sans-serif" }}>
                {method.name}
              </h3>
              <p className="text-[14px] text-[#94A3B8] leading-relaxed mb-5">{method.tagline}</p>
              <ul className="space-y-2">
                {method.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={method.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-[17px] text-[#94A3B8]">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex items-center justify-center gap-6 flex-wrap"
        >
          {[
            { icon: "shield", text: "KYC Verified Platform" },
            { icon: "age", text: "Age 18+ Required" },
            { icon: "lock", text: "Funds Secured" },
          ].map((badge) => (
            <div key={badge.text} className="flex items-center gap-2 text-[17px] text-[#64748B]">
              {badge.icon === "shield" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              )}
              {badge.icon === "age" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              )}
              {badge.icon === "lock" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              )}
              <span>{badge.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
