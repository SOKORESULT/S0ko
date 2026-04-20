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
    .select("id,category")
    .eq("slug", slug)
    .single();

  if (!market) return Response.json({ markets: [] });

  const { data } = await sb
    .from("markets")
    .select("id,slug,question,category,yes_price,no_price,total_volume")
    .eq("status", "open")
    .eq("category", market.category)
    .neq("id", market.id)
    .order("total_volume", { ascending: false })
    .limit(3);

  return Response.json({ markets: data ?? [] });
}
