import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return Response.json({ error: msg }, { status: 401 });
  }

  const { id } = await params;
  const { data } = await sb
    .from("correspondent_payments")
    .select("*")
    .eq("correspondent_id", id)
    .order("created_at", { ascending: false });

  return Response.json({ payments: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return Response.json({ error: msg }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { amount, reason } = body;

  if (!amount || !reason) return Response.json({ error: "Amount and reason required" }, { status: 400 });

  const { data, error } = await sb
    .from("correspondent_payments")
    .insert({ correspondent_id: id, amount, reason, status: "pending" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ payment: data });
}
