"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0A12]/90 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 cursor-pointer">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden">
            <Image src="/sokoresult-logo.png" alt="SokoResult" fill className="object-cover" />
          </div>
          <span className="font-black text-[14px] tracking-tight text-white" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            $OKO<span className="text-[#00E676]">RESULT</span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7">
          {["Markets", "How It Works", "Token", "Developers"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              className="text-[14px] font-medium text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer"
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/login"
            className="text-[14px] font-semibold text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer px-3 py-1.5"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="cursor-pointer text-[14px] font-bold px-4 py-2 rounded-lg bg-[#00E676] text-[#0A0A12] hover:bg-[#00C853] transition-colors duration-200"
          >
            Start Trading
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-[#0F0F1C] border-b border-white/[0.07] px-4 py-4 flex flex-col gap-3"
        >
          {["Markets", "How It Works", "Token", "Developers"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              onClick={() => setMenuOpen(false)}
              className="text-[15px] font-medium text-[#94A3B8] py-2 cursor-pointer"
            >
              {item}
            </a>
          ))}
          <a
            href="/signup"
            onClick={() => setMenuOpen(false)}
            className="mt-2 text-center font-bold text-[15px] py-3 rounded-xl bg-[#00E676] text-[#0A0A12] cursor-pointer"
          >
            Start Trading
          </a>
        </motion.div>
      )}
    </motion.nav>
  );
}
