import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("markets")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return Response.json({ error: "Market not found" }, { status: 404 });

  return Response.json({ market: data });
}
