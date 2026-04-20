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
    .select("id")
    .eq("slug", slug)
    .single();

  if (!market) return Response.json({ trades: [] });

  const { data: trades, error } = await sb
    .from("trades")
    .select("id, outcome_token, price, quantity, total_value, created_at, buyer:profiles!buyer_id(display_name), seller:profiles!seller_id(display_name)")
    .eq("market_id", market.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Anonymize: show first 3 chars + "***" for privacy
  const anonymize = (name: string | null | undefined) => {
    if (!name) return "Anon";
    return name.slice(0, 3) + "***";
  };

  const activity = (trades ?? []).map((t: {
    id: string;
    outcome_token: string;
    price: number;
    quantity: number;
    total_value: number;
    created_at: string;
    buyer: { display_name: string | null } | null;
    seller: { display_name: string | null } | null;
  }) => ({
    id:            t.id,
    outcome:       t.outcome_token,
    price:         t.price,
    quantity:      t.quantity,
    total_value:   t.total_value,
    created_at:    t.created_at,
    buyer_name:    anonymize(t.buyer?.display_name),
    seller_name:   anonymize(t.seller?.display_name),
  }));

  return Response.json({ trades: activity });
}
