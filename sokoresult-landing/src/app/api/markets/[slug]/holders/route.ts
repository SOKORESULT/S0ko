import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any;

  const { data: market } = await sb
    .from("markets")
    .select("id,yes_price,no_price")
    .eq("slug", slug)
    .single();

  if (!market) return Response.json({ holders: [] });

  const { data: positions, error } = await sb
    .from("positions")
    .select("user_id, yes_shares, no_shares, avg_buy_price_yes, avg_buy_price_no, user:profiles!user_id(display_name, avatar_url, kyc_tier)")
    .eq("market_id", market.id)
    .or("yes_shares.gt.0,no_shares.gt.0");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const holders = (positions ?? [])
    .map((p: {
      user_id: string;
      yes_shares: number;
      no_shares: number;
      avg_buy_price_yes: number | null;
      avg_buy_price_no:  number | null;
      user: { display_name: string | null; avatar_url: string | null; kyc_tier: number };
    }) => ({
      user_id:           p.user_id,
      display_name:      p.user?.display_name ?? "Anonymous",
      avatar_url:        p.user?.avatar_url ?? null,
      yes_shares:        p.yes_shares ?? 0,
      no_shares:         p.no_shares  ?? 0,
      avg_buy_price_yes: p.avg_buy_price_yes,
      avg_buy_price_no:  p.avg_buy_price_no,
      position_value:    ((p.yes_shares ?? 0) * market.yes_price + (p.no_shares ?? 0) * market.no_price) / 100,
    }))
    .sort((a: { position_value: number }, b: { position_value: number }) => b.position_value - a.position_value)
    .slice(0, 50);

  return Response.json({ holders });
}
