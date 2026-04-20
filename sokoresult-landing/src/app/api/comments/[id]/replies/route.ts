import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: parent_id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any;
  const { data, error } = await sb
    .from("comments")
    .select(`
      id, body, image_url, likes_count, created_at,
      user:profiles!user_id(id, display_name, avatar_url, kyc_tier)
    `)
    .eq("parent_id", parent_id)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ replies: data ?? [] });
}
