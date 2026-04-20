import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const market_id    = searchParams.get("market_id");
  const sort         = searchParams.get("sort") ?? "newest";
  const holders_only = searchParams.get("holders_only") === "true";
  const page         = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
  const limit        = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const offset       = (page - 1) * limit;

  if (!market_id) return Response.json({ error: "market_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any;

  // Fetch top-level comments
  let query = sb
    .from("comments")
    .select(`
      id, body, image_url, likes_count, created_at,
      user:profiles!user_id(id, display_name, avatar_url, kyc_tier),
      replies:comments!parent_id(
        id, body, image_url, likes_count, created_at,
        user:profiles!user_id(id, display_name, avatar_url, kyc_tier)
      )
    `, { count: "exact" })
    .eq("market_id", market_id)
    .is("parent_id", null);

  if (sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (sort === "liked") query = query.order("likes_count", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  query = query.range(offset, offset + limit - 1);

  let { data, error, count } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // If holders_only: filter to users who hold a position in this market
  if (holders_only && data?.length) {
    const { data: holders } = await sb
      .from("positions")
      .select("user_id")
      .eq("market_id", market_id)
      .or("yes_shares.gt.0,no_shares.gt.0");

    const holderIds = new Set((holders ?? []).map((h: { user_id: string }) => h.user_id));
    data = data.filter((c: { user?: { id: string } }) => holderIds.has(c.user?.id));
  }

  return Response.json({ comments: data ?? [], total: count ?? 0, page, limit, has_more: offset + limit < (count ?? 0) });
}

export async function POST(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!result.profile) return Response.json({ error: "Profile not found" }, { status: 404 });
  if ((result.profile.kyc_tier ?? 0) < 1) {
    return Response.json({ error: "Verification required to comment", code: "KYC_REQUIRED" }, { status: 403 });
  }

  let body: { market_id: string; body: string; parent_id?: string; image_url?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }

  const { market_id, body: text, parent_id, image_url } = body;
  if (!market_id || !text?.trim()) return Response.json({ error: "market_id and body required" }, { status: 400 });
  if (text.length > 1000) return Response.json({ error: "Comment too long (max 1000 chars)" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("comments")
    .insert({ market_id, user_id: result.profile.id, body: text.trim(), parent_id: parent_id ?? null, image_url: image_url ?? null })
    .select(`id, body, image_url, likes_count, created_at, user:profiles!user_id(id, display_name, avatar_url, kyc_tier)`)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ comment: data }, { status: 201 });
}
