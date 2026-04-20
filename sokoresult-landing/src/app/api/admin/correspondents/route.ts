import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return Response.json({ error: msg }, { status: msg.includes("Forbidden") ? 403 : 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  let query = sb
    .from("correspondents")
    .select(`
      *,
      profiles!correspondents_user_id_fkey(display_name, email, avatar_url)
    `)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("verification_status", status);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ correspondents: data ?? [] });
}
