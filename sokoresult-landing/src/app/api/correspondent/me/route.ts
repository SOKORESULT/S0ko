import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result?.profile) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await sb
    .from("correspondents")
    .select("*")
    .eq("user_id", result.profile.id)
    .single();

  return Response.json({ correspondent: data ?? null });
}
