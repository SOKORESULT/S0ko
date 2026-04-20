import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return Response.json({ error: msg }, { status: msg.includes("Forbidden") ? 403 : 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { verification_status } = body;

  const validStatuses = ["pending", "approved", "rejected", "suspended"];
  if (!validStatuses.includes(verification_status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const update: Record<string, unknown> = { verification_status };
  if (verification_status === "approved") {
    update.verified_at = new Date().toISOString();
    update.verified_by = admin.id;
  }

  const { data, error } = await sb
    .from("correspondents")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ correspondent: data });
}
