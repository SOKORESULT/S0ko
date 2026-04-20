import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("markets")
    .select("id,slug,question,category,yes_price,no_price,total_volume,total_trades,participant_count,resolution_deadline")
    .eq("status", "open")
    .order("total_volume", { ascending: false })
    .limit(4);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ markets: data ?? [] });
}
