import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!result.profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabaseAdmin as any)
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("referred_by", result.profile.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ count: count ?? 0 });
}
