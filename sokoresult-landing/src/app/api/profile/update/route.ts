import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!result.profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  let body: { display_name?: string; fee_preference?: "kes" | "oko" };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }

  const updates: Record<string, unknown> = {};
  if (body.display_name !== undefined) {
    const trimmed = body.display_name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) return Response.json({ error: "Name must be 2–50 chars" }, { status: 400 });
    updates.display_name = trimmed;
  }
  if (body.fee_preference !== undefined) {
    if (!["kes", "oko"].includes(body.fee_preference)) return Response.json({ error: "Invalid fee_preference" }, { status: 400 });
    updates.fee_preference = body.fee_preference;
  }

  if (Object.keys(updates).length === 0) return Response.json({ error: "Nothing to update" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any).from("profiles").update(updates).eq("id", result.profile.id).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ profile: data });
}
