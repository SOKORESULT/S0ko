import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await sb
    .from("profiles")
    .update({ kes_balance: 1000000 })
    .eq("kes_balance", 0)
    .select("id");

  if (error) {
    console.error("[credit-all] Failed to credit users:", error);
    return NextResponse.json({ error: "Failed to credit users" }, { status: 500 });
  }

  return NextResponse.json({ credited: (data ?? []).length });
}
