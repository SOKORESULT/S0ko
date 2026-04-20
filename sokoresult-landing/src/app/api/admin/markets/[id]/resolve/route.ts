import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

// POST /api/admin/markets/[id]/resolve
export async function POST(
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

  let body: { outcome: "yes" | "no" };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { outcome } = body;
  if (!outcome || !["yes", "no"].includes(outcome)) {
    return Response.json({ error: "outcome must be 'yes' or 'no'" }, { status: 400 });
  }

  // Fetch market
  const { data: market, error: mErr } = await sb
    .from("markets")
    .select("*")
    .eq("id", id)
    .single();

  if (mErr || !market) return Response.json({ error: "Market not found" }, { status: 404 });

  if (!["open", "closed"].includes(market.status)) {
    return Response.json({ error: `Market is already ${market.status}` }, { status: 400 });
  }

  // Get all positions with any shares
  const { data: positions, error: posErr } = await sb
    .from("positions")
    .select("*")
    .eq("market_id", id)
    .or("yes_shares.gt.0,no_shares.gt.0");

  if (posErr) return Response.json({ error: posErr.message }, { status: 500 });

  let winnersCount = 0;
  let totalPayout = 0; // in paisa

  // Process payouts
  for (const pos of positions ?? []) {
    const winningShares: number = outcome === "yes" ? pos.yes_shares : pos.no_shares;
    if (winningShares <= 0) continue;

    const payoutKes = winningShares * 100; // KES (each share pays 100 KES)
    const payoutPaisa = payoutKes * 100;   // paisa (kes_balance is stored in paisa)

    // Fetch current user balance
    const { data: profileRow } = await sb
      .from("profiles")
      .select("kes_balance")
      .eq("id", pos.user_id)
      .single();

    if (!profileRow) continue;

    const newBalance = (profileRow.kes_balance ?? 0) + payoutPaisa;

    // Credit user balance
    await sb.from("profiles")
      .update({ kes_balance: newBalance })
      .eq("id", pos.user_id);

    // Calculate realized PnL
    const avgBuyPrice: number = outcome === "yes"
      ? (pos.avg_buy_price_yes ?? 0)
      : (pos.avg_buy_price_no ?? 0);
    const pnlKes = payoutKes - avgBuyPrice * winningShares;

    // Update position realized_pnl
    await sb.from("positions")
      .update({ realized_pnl: (pos.realized_pnl ?? 0) + pnlKes })
      .eq("id", pos.id);

    // Create payout transaction
    await sb.from("transactions").insert({
      user_id: pos.user_id,
      type: "trade_sell",
      amount: payoutPaisa,
      currency: "kes",
      direction: "credit",
      reference_id: id,
      balance_after: newBalance,
      description: `Market resolved ${outcome.toUpperCase()} — ${winningShares} shares × KES 100`,
    });

    winnersCount++;
    totalPayout += payoutPaisa;
  }

  // Update market to resolved
  const { error: resolveErr } = await sb
    .from("markets")
    .update({
      status: "resolved",
      outcome,
      resolved_at: new Date().toISOString(),
      resolver_type: "admin",
    })
    .eq("id", id);

  if (resolveErr) return Response.json({ error: resolveErr.message }, { status: 500 });

  return Response.json({
    resolved: true,
    outcome,
    winners_count: winnersCount,
    total_payout: totalPayout, // paisa
    total_payout_kes: Math.round(totalPayout / 100),
  });
}
