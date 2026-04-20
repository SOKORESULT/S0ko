import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

/**
 * GET /api/news/feed
 * Query params:
 *   category  = all | breaking | politics | sports | entertainment | fashion
 *   number    = 1-100 (default 60)
 *   offset    = pagination offset (default 0)
 *
 * Returns stories from Supabase `news_stories` table.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "all";
  const number   = Math.min(parseInt(searchParams.get("number") ?? "60", 10), 100);
  const offset   = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    let query = sb
      .from("news_stories")
      .select("*")
      .order("published_at", { ascending: false })
      .range(offset, offset + number - 1);

    if (category === "breaking") {
      query = query.gte("urgency", 4);
    } else if (category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ news: data ?? [], source: "live", total: (data ?? []).length });

  } catch {
    return NextResponse.json({ news: [], source: "live", total: 0 });
  }
}
