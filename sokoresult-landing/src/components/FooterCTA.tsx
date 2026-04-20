"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

export default function FooterCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [submitted, setSubmitted] = useState(false);
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) setSubmitted(true);
  };

  return (
    <section id="waitlist" className="py-28 relative overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A12] via-[#0D0A1A] to-[#0A0A12]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-[#7B2FBE]/12 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] rounded-full bg-[#00E676]/5 blur-[80px] pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-[#00E676]/10 border border-[#00E676]/20 rounded-full px-4 py-2 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] live-dot" />
            <span className="text-[13px] font-bold text-[#00E676]">Early Access — Limited Spots</span>
          </div>

          <h2
            className="font-black leading-[1.05] tracking-tight mb-6"
            style={{ fontFamily: "Satoshi, sans-serif", fontSize: "clamp(2.5rem, 6vw, 4.2rem)" }}
          >
            The crowd is already
            <br />
            trading. <span className="gradient-text-green">Are you in?</span>
          </h2>

          <p className="text-[#94A3B8] text-[17px] leading-relaxed mb-10 max-w-xl mx-auto">
            Join the waitlist for early access, $OKO token airdrops, and zero trading fees for your first month.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Phone number or email"
                className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-xl px-5 py-3.5 text-white text-[15px] placeholder-[#64748B] focus:outline-none focus:border-[#00E676]/50 focus:bg-white/[0.08] transition-all duration-200"
                aria-label="Phone number or email"
              />
              <button
                type="submit"
                className="cursor-pointer bg-[#00E676] text-[#0A0A12] font-black text-[14px] px-7 py-3.5 rounded-xl whitespace-nowrap hover:bg-[#00C853] transition-all duration-200 hover:shadow-[0_0_30px_rgba(0,230,118,0.4)]"
              >
                Join Waitlist
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto mb-6 bg-[#00E676]/10 border border-[#00E676]/30 rounded-xl px-6 py-5"
            >
              <div className="flex items-center gap-3 justify-center">
                <div className="w-8 h-8 rounded-full bg-[#00E676] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-bold text-[14px] text-[#00E676]">You&apos;re on the list!</p>
                  <p className="text-[13px] text-[#64748B]">We&apos;ll reach out when early access opens.</p>
                </div>
              </div>
            </motion.div>
          )}

          <p className="text-[17px] text-[#64748B]">
            No spam. Unsubscribe anytime. By joining, you agree to our{" "}
            <a href="#" className="text-[#94A3B8] hover:text-white underline cursor-pointer">Terms</a> and{" "}
            <a href="#" className="text-[#94A3B8] hover:text-white underline cursor-pointer">Privacy Policy</a>.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
