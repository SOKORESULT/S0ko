import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: comment_id } = await params;
  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!result.profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  const userId = result.profile.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any;

  // Check if already liked
  const { data: existing } = await sb
    .from("comment_likes")
    .select("id")
    .eq("comment_id", comment_id)
    .eq("user_id", userId)
    .single();

  let liked: boolean;
  if (existing) {
    // Unlike
    await sb.from("comment_likes").delete().eq("id", existing.id);
    await sb.from("comments").update({ likes_count: sb.rpc("greatest", { a: 0, b: -1 }) }).eq("id", comment_id);
    // Simple decrement — fetch current and subtract
    const { data: c } = await sb.from("comments").select("likes_count").eq("id", comment_id).single();
    await sb.from("comments").update({ likes_count: Math.max(0, (c?.likes_count ?? 1) - 1) }).eq("id", comment_id);
    liked = false;
  } else {
    // Like
    await sb.from("comment_likes").insert({ comment_id, user_id: userId });
    const { data: c } = await sb.from("comments").select("likes_count").eq("id", comment_id).single();
    await sb.from("comments").update({ likes_count: (c?.likes_count ?? 0) + 1 }).eq("id", comment_id);
    liked = true;
  }

  const { data: updated } = await sb.from("comments").select("likes_count").eq("id", comment_id).single();
  return Response.json({ liked, count: updated?.likes_count ?? 0 });
}
