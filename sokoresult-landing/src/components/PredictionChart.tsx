"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const DATA_POINTS = [
  { x: 0, y: 42 }, { x: 1, y: 40 }, { x: 2, y: 43 }, { x: 3, y: 41 },
  { x: 4, y: 45 }, { x: 5, y: 44 }, { x: 6, y: 47 }, { x: 7, y: 46 },
  { x: 8, y: 49 }, { x: 9, y: 51 }, { x: 10, y: 50 }, { x: 11, y: 53 },
  { x: 12, y: 52 }, { x: 13, y: 55 }, { x: 14, y: 54 }, { x: 15, y: 57 },
  { x: 16, y: 59 }, { x: 17, y: 61 }, { x: 18, y: 63 }, { x: 19, y: 62 },
  { x: 20, y: 65 }, { x: 21, y: 67 }, { x: 22, y: 66 }, { x: 23, y: 70 },
  { x: 24, y: 72 },
];

const VOLUMES = [12, 8, 15, 10, 18, 14, 22, 16, 19, 25, 20, 28, 24, 30, 26, 35, 40, 45, 38, 42, 55, 60, 52, 80, 72];

const NEWS_MARKER_INDEX = 16;

export default function PredictionChart() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [progress, setProgress] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(42);

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    let start: number | null = null;
    const duration = 2000;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);

      const priceIdx = Math.floor(eased * (DATA_POINTS.length - 1));
      setDisplayPrice(DATA_POINTS[priceIdx].y);

      if (p < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [inView]);

  const W = 480;
  const H = 200;
  const PAD = { top: 16, right: 16, bottom: 40, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const xScale = (i: number) => PAD.left + (i / (DATA_POINTS.length - 1)) * chartW;
  const yScale = (v: number) => PAD.top + chartH - ((v - 35) / 45) * chartH;

  const visibleCount = Math.max(2, Math.floor(progress * DATA_POINTS.length));
  const visiblePoints = DATA_POINTS.slice(0, visibleCount);

  const linePath = visiblePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x)} ${yScale(p.y)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L ${xScale(visiblePoints[visiblePoints.length - 1].x)} ${PAD.top + chartH}` +
    ` L ${PAD.left} ${PAD.top + chartH} Z`;

  const lastPoint = visiblePoints[visiblePoints.length - 1];
  const markerX = xScale(NEWS_MARKER_INDEX);
  const markerY = yScale(DATA_POINTS[NEWS_MARKER_INDEX].y);
  const showMarker = visibleCount > NEWS_MARKER_INDEX + 1;

  const maxVol = Math.max(...VOLUMES);
  const volBarW = chartW / VOLUMES.length - 1;

  return (
    <div ref={ref} className="relative">
      {/* Chart header */}
      <div className="flex items-start justify-between mb-3 px-1">
        <div>
          <p className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider mb-1">Will William Ruto win 2027 election?</p>
          <div className="flex items-baseline gap-2">
            <span
              className="font-black text-[32px] leading-none text-[#00E676]"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              {displayPrice}¢
            </span>
            <span className="text-[#00E676] text-[13px] font-semibold">+{(displayPrice - 42).toFixed(0)}pts</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-[#00E676]/10 border border-[#00E676]/20 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] live-dot" />
          <span className="text-[11px] font-bold text-[#00E676]">LIVE</span>
        </div>
      </div>

      {/* SVG chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: "auto" }}
        >
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E676" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00E676" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#00E676" stopOpacity="1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {[40, 50, 60, 70].map((v) => (
            <g key={v}>
              <line
                x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4,4"
              />
              <text
                x={PAD.left - 6} y={yScale(v) + 4}
                fill="#64748B" fontSize="9" textAnchor="end"
                fontFamily="var(--font-space-mono)"
              >
                {v}¢
              </text>
            </g>
          ))}

          {/* Volume bars — grow upward from bottom of SVG */}
          {VOLUMES.slice(0, visibleCount).map((vol, i) => {
            const barH = (vol / maxVol) * 28;
            return (
              <rect
                key={i}
                x={xScale(i) - volBarW / 2}
                y={H - 4 - barH}
                width={volBarW}
                height={barH}
                fill={i >= NEWS_MARKER_INDEX ? "rgba(0,230,118,0.3)" : "rgba(123,47,190,0.3)"}
                rx="1"
              />
            );
          })}

          {/* Area fill */}
          {linePath && (
            <path d={areaPath} fill="url(#lineGrad)" />
          )}

          {/* Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#lineStroke)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* News marker vertical line */}
          {showMarker && (
            <>
              <line
                x1={markerX} y1={PAD.top}
                x2={markerX} y2={PAD.top + chartH}
                stroke="#F472B6" strokeWidth="1.5" strokeDasharray="3,3"
              />
              <circle
                cx={markerX} cy={markerY}
                r="5" fill="#F472B6" stroke="#0A0A12" strokeWidth="2"
              />
              {/* News label */}
              <rect
                x={markerX + 6} y={markerY - 14}
                width="72" height="16"
                fill="#F472B6" rx="3"
                className="cursor-pointer"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              />
              <text
                x={markerX + 10} y={markerY - 3}
                fill="#0A0A12" fontSize="8.5" fontWeight="700"
                fontFamily="var(--font-space-mono)"
                className="cursor-pointer"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                NEWS +17pts
              </text>
            </>
          )}

          {/* Cursor dot */}
          {lastPoint && (
            <circle
              cx={xScale(lastPoint.x)} cy={yScale(lastPoint.y)}
              r="4" fill="#00E676" stroke="#0A0A12" strokeWidth="2"
            />
          )}
        </svg>

        {/* Tooltip */}
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-[30%] left-1/2 -translate-x-1/2 z-10 bg-[#1A1A2E] border border-[#F472B6]/40 rounded-xl p-3 w-64 shadow-2xl"
          >
            <div className="flex items-start gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F472B6] mt-1 shrink-0" />
              <p className="text-[11px] font-semibold text-[#F472B6]">KTN News — Verified</p>
            </div>
            <p className="text-[12px] text-white font-medium leading-snug">
              Opposition candidate withdraws from 2027 race
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-1">Price +17pts in 28 min • 3 hrs ago</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
