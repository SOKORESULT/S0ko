import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: market, error } = await (supabaseAdmin as any)
    .from("markets")
    .select("id,yes_price,no_price,total_volume,total_trades")
    .eq("slug", slug)
    .single();

  if (error || !market) return Response.json({ error: "Market not found" }, { status: 404 });

  // Binary market outcomes — structured for multi-outcome support later
  const outcomes = [
    {
      id:         "yes",
      name:       "Yes",
      price:      market.yes_price,
      no_price:   market.no_price,
      volume:     Math.round((market.total_volume ?? 0) * (market.yes_price / 100)),
      change_24h: Math.round((Math.random() - 0.45) * 8), // TODO: derive from real price snapshots
    },
    {
      id:         "no",
      name:       "No",
      price:      market.no_price,
      no_price:   market.yes_price,
      volume:     Math.round((market.total_volume ?? 0) * (market.no_price / 100)),
      change_24h: Math.round((Math.random() - 0.55) * 8),
    },
  ];

  return Response.json({ outcomes, market_id: market.id });
}
