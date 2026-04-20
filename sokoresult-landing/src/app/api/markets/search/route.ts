import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return Response.json({ markets: [] });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("markets")
    .select("id,slug,question,category,yes_price,no_price,total_volume")
    .eq("status", "open")
    .ilike("question", `%${q}%`)
    .order("total_volume", { ascending: false })
    .limit(10);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ markets: data ?? [] });
}
