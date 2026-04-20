import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result?.profile) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: correspondent } = await sb
    .from("correspondents")
    .select("id")
    .eq("user_id", result.profile.id)
    .single();

  if (!correspondent) return Response.json({ stories: [] });

  const { data: stories } = await sb
    .from("news_stories")
    .select("id, title, category, urgency, verification_status, published_at, created_at")
    .eq("correspondent_id", correspondent.id)
    .order("created_at", { ascending: false });

  return Response.json({ stories: stories ?? [] });
}
