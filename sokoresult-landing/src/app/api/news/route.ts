import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabaseAdmin as any)
    .from("news_stories")
    .select("id,title,body,source_name,source_type,source_url,image_url,category,urgency,verification_status,published_at,created_at")
    .order("published_at", { ascending: false })
    .limit(50);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ stories: data ?? [] });
}
