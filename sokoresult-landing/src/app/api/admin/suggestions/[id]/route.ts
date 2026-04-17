// src/app/api/admin/suggestions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin: Profile;
  try {
    admin = await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: msg.includes("Forbidden") ? 403 : 401 });
  }

  const { id } = await params;

  const body = await request.json() as {
    status: "approved" | "rejected" | "duplicate";
  };

  if (!["approved", "rejected", "duplicate"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: suggestion, error: fetchErr } = await sb
    .from("market_suggestions")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !suggestion) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }

  if (body.status === "approved") {
    const { error: marketErr } = await sb.from("markets").insert({
      question:            suggestion.question,
      slug:                suggestion.suggested_slug,
      category:            suggestion.category ?? "politics",
      yes_price:           suggestion.suggested_probability ?? 50,
      no_price:            100 - (suggestion.suggested_probability ?? 50),
      description:         suggestion.description,
      keywords:            suggestion.keywords ?? [],
      resolution_deadline: suggestion.resolution_deadline,
      status:              "open",
      total_volume:        0,
      total_trades:        0,
      participant_count:   0,
    });

    if (marketErr) {
      return NextResponse.json(
        { error: `Market creation failed: ${marketErr.message}` },
        { status: 500 }
      );
    }
  }

  const { data: updated, error: updateErr } = await sb
    .from("market_suggestions")
    .update({
      status:      body.status,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ suggestion: updated });
}
