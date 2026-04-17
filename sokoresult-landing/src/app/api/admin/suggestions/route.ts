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

  // Validate status filter
  const VALID_STATUSES = ["pending", "approved", "rejected", "duplicate"];
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

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

  // Batch fetch all referenced news items in one query
  const allNewsIds = [...new Set(
    (data ?? []).flatMap((s: Record<string, unknown>) => (s.source_news_ids as string[]) ?? [])
  )];

  const newsById: Record<string, { id: string; title: string; source_url: string }> = {};
  if (allNewsIds.length > 0) {
    const { data: newsItems } = await sb
      .from("news_stories")
      .select("id, title, source_url")
      .in("id", allNewsIds);
    for (const n of (newsItems ?? []) as { id: string; title: string; source_url: string }[]) {
      newsById[n.id] = n;
    }
  }

  const suggestions = (data ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    source_news: ((s.source_news_ids as string[]) ?? [])
      .map((id) => newsById[id])
      .filter(Boolean),
  }));

  return NextResponse.json({ suggestions });
}
