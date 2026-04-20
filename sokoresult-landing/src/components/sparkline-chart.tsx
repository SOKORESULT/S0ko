"use client";

// Reusable dual-line SVG sparkline chart.
// Used on market listing cards, portfolio position cards, and news widgets.

export interface SparkPoint { yes: number; no?: number }

// ─── Smooth bezier via Catmull-Rom → cubic bezier conversion ─────────────────

function catmullRomPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SparklineChartProps {
  data: SparkPoint[];
  /** Logical height in px — width always stretches to 100% of container */
  height?: number;
  className?: string;
  /** Render only the YES line (e.g. featured banner mini-charts) */
  singleLine?: boolean;
}

export function SparklineChart({ data, height = 80, className, singleLine = false }: SparklineChartProps) {
  if (!data.length) return null;

  // Logical canvas — we use viewBox so SVG scales to container width
  const VW = 300;
  const VH = height;
  const PAD_X = 3;  // left/right padding so end dots aren't clipped
  const PAD_Y = 5;  // top/bottom padding

  // Map price (0–100) to SVG y-coordinate (0 = top, VH = bottom)
  const toY = (price: number) => PAD_Y + (1 - price / 100) * (VH - PAD_Y * 2);
  const toX = (i: number)     => PAD_X + (i / (data.length - 1)) * (VW - PAD_X * 2);

  const yesPts = data.map((d, i) => ({ x: toX(i), y: toY(d.yes) }));
  const noPts  = data.map((d, i) => ({ x: toX(i), y: toY(d.no ?? (100 - d.yes)) }));

  const yesLine = catmullRomPath(yesPts);
  const noLine  = catmullRomPath(noPts);

  // Area fills — close path at bottom corners
  const yesArea = `${yesLine} L ${(VW - PAD_X).toFixed(2)},${VH} L ${PAD_X},${VH} Z`;
  const noArea  = `${noLine}  L ${(VW - PAD_X).toFixed(2)},${VH} L ${PAD_X},${VH} Z`;

  const lastYes = yesPts[yesPts.length - 1];
  const lastNo  = noPts[noPts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      {/* Area fills */}
      <path d={yesArea} fill="rgba(0,230,118,0.08)" stroke="none" />
      {!singleLine && <path d={noArea} fill="rgba(255,82,82,0.05)" stroke="none" />}

      {/* Lines */}
      <path d={yesLine} fill="none" stroke="#00E676" strokeWidth="2"   strokeLinecap="round" strokeLinejoin="round" />
      {!singleLine && (
        <path d={noLine} fill="none" stroke="#FF5252" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* End dots — current price */}
      <circle cx={lastYes.x} cy={lastYes.y} r="3.5" fill="#00E676" />
      {!singleLine && <circle cx={lastNo.x} cy={lastNo.y} r="3" fill="#FF5252" />}
    </svg>
  );
}

// ─── Seeded random sparkline generator ───────────────────────────────────────
// Used client-side so listing cards don't need extra API calls.
// Same seed → same shape, always ends at the market's current yes_price.

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateSparklineData(marketId: string, endPrice: number, days = 30): SparkPoint[] {
  const seed = marketId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRand(seed);

  // Start from a varied point that will drift toward endPrice
  let price = Math.max(5, Math.min(95, endPrice + (rand() - 0.5) * 32));
  const out: SparkPoint[] = [];

  for (let i = 0; i < days; i++) {
    // Drift toward end price gets stronger near the end
    const progress = i / (days - 1);
    const driftStr = 0.06 + progress * 0.12;
    const drift    = (endPrice - price) * driftStr;
    const noise    = (rand() - 0.5) * 5;
    price          = Math.max(1, Math.min(99, price + drift + noise));
    out.push({ yes: Math.round(price * 10) / 10, no: Math.round((100 - price) * 10) / 10 });
  }

  // Pin last point to exact current price
  out[out.length - 1] = { yes: endPrice, no: 100 - endPrice };
  return out;
}
