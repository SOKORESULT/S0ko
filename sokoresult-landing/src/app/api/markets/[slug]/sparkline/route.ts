import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// TODO: Replace with real TimescaleDB price snapshots when trading engine is live.
// For now generates deterministic mock data seeded by the market ID,
// so the same market always renders the same sparkline shape.

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: market, error } = await (supabaseAdmin as any)
    .from("markets")
    .select("id,yes_price")
    .eq("slug", slug)
    .single();

  if (error || !market) return Response.json({ error: "Market not found" }, { status: 404 });

  const endPrice = market.yes_price as number;
  const seed     = (market.id as string).split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
  const rand     = seededRand(seed);
  const days     = 30;

  let price = Math.max(5, Math.min(95, endPrice + (rand() - 0.5) * 32));
  const data: { day: number; yes: number; no: number }[] = [];

  for (let i = 0; i < days; i++) {
    const progress = i / (days - 1);
    const drift    = (endPrice - price) * (0.06 + progress * 0.12);
    const noise    = (rand() - 0.5) * 5;
    price          = Math.max(1, Math.min(99, price + drift + noise));
    data.push({ day: i, yes: Math.round(price * 10) / 10, no: Math.round((100 - price) * 10) / 10 });
  }

  // Pin last point to exact current price
  data[data.length - 1] = { day: days - 1, yes: endPrice, no: 100 - endPrice };

  return Response.json({ data, market_id: market.id });
}
