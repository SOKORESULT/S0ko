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
    .select("id, total_earned")
    .eq("user_id", result.profile.id)
    .single();

  if (!correspondent) return Response.json({ total_earned: 0, pending: 0, payments: [] });

  const { data: payments } = await sb
    .from("correspondent_payments")
    .select("*")
    .eq("correspondent_id", correspondent.id)
    .order("created_at", { ascending: false });

  const pending = (payments ?? [])
    .filter((p: { status: string; amount: number }) => p.status === "pending")
    .reduce((s: number, p: { amount: number }) => s + p.amount, 0);

  return Response.json({
    total_earned: correspondent.total_earned ?? 0,
    pending,
    payments: payments ?? [],
  });
}
