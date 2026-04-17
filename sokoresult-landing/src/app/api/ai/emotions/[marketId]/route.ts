// src/app/api/ai/emotions/[marketId]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const { marketId } = await params;

  const { data, error } = await sb
    .from("topic_emotions")
    .select("*")
    .eq("market_id", marketId)
    .order("analyzed_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[emotions/marketId]", error);
    return NextResponse.json({ emotions: [] });
  }

  return NextResponse.json({ emotions: data ?? [] });
}
