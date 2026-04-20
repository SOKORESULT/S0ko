import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// TODO: Replace with real TimescaleDB price snapshots when trading engine is live.
// For now generates a realistic mock probability curve ending at the current yes_price.

type Point = { timestamp: string; yesPrice: number; noPrice: number; volume: number };

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function intervalConfig(interval: string): { points: number; stepMs: number } {
  switch (interval) {
    case "1h":  return { points: 60,  stepMs: 60 * 1000 };
    case "6h":  return { points: 72,  stepMs: 5 * 60 * 1000 };
    case "1d":  return { points: 48,  stepMs: 30 * 60 * 1000 };
    case "1w":  return { points: 84,  stepMs: 2 * 60 * 60 * 1000 };
    case "1m":  return { points: 90,  stepMs: 8 * 60 * 60 * 1000 };
    case "all": return { points: 104, stepMs: 24 * 60 * 60 * 1000 };
    default:    return { points: 90,  stepMs: 8 * 60 * 60 * 1000 };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const interval = request.nextUrl.searchParams.get("interval") ?? "1m";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: market, error } = await (supabaseAdmin as any)
    .from("markets")
    .select("id,yes_price,no_price,total_volume,created_at")
    .eq("slug", slug)
    .single();

  if (error || !market) return Response.json({ error: "Market not found" }, { status: 404 });

  const { points, stepMs } = intervalConfig(interval);
  const endPrice   = market.yes_price as number;
  const startPrice = Math.max(5, Math.min(95, endPrice + (Math.random() > 0.5 ? 1 : -1) * Math.floor(10 + Math.random() * 25)));
  const seed       = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand       = seededRand(seed);
  const now        = Date.now();

  const data: Point[] = [];
  let price = startPrice;

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    // Drift toward end price + noise
    const drift  = (endPrice - price) * 0.04;
    const noise  = (rand() - 0.5) * 5;
    price        = Math.max(1, Math.min(99, price + drift + noise));

    const volFraction = 0.5 + rand() * 0.8;
    data.push({
      timestamp: new Date(now - (points - 1 - i) * stepMs).toISOString(),
      yesPrice:  Math.round(price * 10) / 10,
      noPrice:   Math.round((100 - price) * 10) / 10,
      volume:    Math.round((market.total_volume ?? 0) * volFraction * 0.03),
    });
  }

  // Last point is always exact current price
  data[data.length - 1].yesPrice = endPrice;
  data[data.length - 1].noPrice  = 100 - endPrice;

  return Response.json({ data, interval, market_id: market.id });
}
