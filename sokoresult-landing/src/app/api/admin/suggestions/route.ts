// src/app/api/admin/suggestions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: msg.includes("Forbidden") ? 403 : 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  let query = sb
    .from("market_suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const suggestions = await Promise.all(
    (data ?? []).map(async (s: Record<string, unknown>) => {
      const sourceNewsIds = (s.source_news_ids as string[]) ?? [];
      if (sourceNewsIds.length === 0) return { ...s, source_news: [] };

      const { data: newsItems } = await sb
        .from("news_stories")
        .select("id, title, source_url")
        .in("id", sourceNewsIds);

      return { ...s, source_news: newsItems ?? [] };
    })
  );

  return NextResponse.json({ suggestions });
}
