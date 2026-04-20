import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

// GET /api/admin/markets/[id] — get single market by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status = msg.includes("Forbidden") ? 403 : 401;
    return Response.json({ error: msg }, { status });
  }

  const { id } = await params;

  const { data: market, error } = await sb
    .from("markets")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !market) return Response.json({ error: "Market not found" }, { status: 404 });

  return Response.json({ market });
}

// PUT /api/admin/markets/[id] — update market
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status = msg.includes("Forbidden") ? 403 : 401;
    return Response.json({ error: msg }, { status });
  }

  const { id } = await params;

  let body: {
    question?: string;
    description?: string;
    category?: "politics" | "sports" | "entertainment" | "fashion";
    status?: "open" | "closed" | "disputed";
    yes_price?: number;
    resolution_deadline?: string;
    resolution_source?: string;
    keywords?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { data: existing, error: fetchErr } = await sb
    .from("markets")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return Response.json({ error: "Market not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.question !== undefined) updates.question = body.question.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() ?? null;
  if (body.category !== undefined) updates.category = body.category;
  if (body.status !== undefined) updates.status = body.status;
  if (body.resolution_deadline !== undefined) updates.resolution_deadline = body.resolution_deadline;
  if (body.resolution_source !== undefined) updates.resolution_source = body.resolution_source?.trim() ?? null;
  if (body.keywords !== undefined) updates.keywords = body.keywords;

  let priceChanged = false;
  if (body.yes_price !== undefined) {
    const yesPrice = Math.max(1, Math.min(99, Math.round(body.yes_price)));
    updates.yes_price = yesPrice;
    updates.no_price = 100 - yesPrice;
    priceChanged = true;
  }

  const { data: market, error } = await sb
    .from("markets")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (priceChanged) {
    await sb.from("price_history").insert({
      market_id: id,
      yes_price: updates.yes_price,
      no_price: updates.no_price,
    });
  }

  return Response.json({ market });
}

// DELETE /api/admin/markets/[id] — delete market (only if no trades)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status = msg.includes("Forbidden") ? 403 : 401;
    return Response.json({ error: msg }, { status });
  }

  const { id } = await params;

  const { data: market, error: fetchErr } = await sb
    .from("markets")
    .select("id,total_trades,question")
    .eq("id", id)
    .single();

  if (fetchErr || !market) {
    return Response.json({ error: "Market not found" }, { status: 404 });
  }

  if (market.total_trades > 0) {
    return Response.json(
      { error: "Cannot delete market with active trades. Close and resolve it instead." },
      { status: 400 }
    );
  }

  // Delete related price_history first
  await sb.from("price_history").delete().eq("market_id", id);

  const { error: deleteErr } = await sb.from("markets").delete().eq("id", id);
  if (deleteErr) return Response.json({ error: deleteErr.message }, { status: 500 });

  return Response.json({ success: true });
}
