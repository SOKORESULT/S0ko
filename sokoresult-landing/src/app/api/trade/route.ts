import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { calculateNewPrice } from "@/lib/pricing/engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function POST(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!result.profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  if ((result.profile.kyc_tier ?? 0) < 1) {
    return Response.json({ error: "Identity verification required to trade", code: "KYC_REQUIRED" }, { status: 403 });
  }

  let body: { market_id: string; outcome: "yes" | "no"; side: "buy" | "sell"; quantity: number };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }

  const { market_id, outcome, side, quantity } = body;

  if (!market_id || !["yes", "no"].includes(outcome) || !["buy", "sell"].includes(side)) {
    return Response.json({ error: "Invalid trade parameters" }, { status: 400 });
  }
  if (!quantity || quantity <= 0 || quantity > 10000 || !Number.isInteger(quantity)) {
    return Response.json({ error: "Quantity must be a whole number between 1 and 10,000" }, { status: 400 });
  }

  // Fetch market
  const { data: market, error: mErr } = await sb
    .from("markets").select("*").eq("id", market_id).single();
  if (mErr || !market) return Response.json({ error: "Market not found" }, { status: 404 });
  if (market.status !== "open") return Response.json({ error: "Market is not open for trading" }, { status: 400 });

  const userId = result.profile.id;
  const currentPrice: number = outcome === "yes" ? market.yes_price : market.no_price; // KES 1-99

  // ── BUY ──────────────────────────────────────────────────────────────────────
  if (side === "buy") {
    const cost    = quantity * currentPrice;                 // KES
    const fee     = Math.floor(cost * 0.02);               // KES
    const total   = cost + fee;                             // KES
    const totalPaisa = total * 100;                        // paisa

    if (result.profile.kes_balance < totalPaisa) {
      return Response.json({ error: "Insufficient KES balance" }, { status: 400 });
    }

    // Fetch latest AI prediction (non-blocking — null if not available)
    const { data: aiRows } = await sb
      .from("ai_predictions")
      .select("probability")
      .eq("market_id", market_id)
      .order("created_at", { ascending: false })
      .limit(1);
    const aiProbability: number | undefined = aiRows?.[0]?.probability;

    // Price movement via pricing engine (crowd + AI gravity + house margin)
    const priceUpdate = calculateNewPrice(market.yes_price, outcome, side, quantity, aiProbability);
    const newYesPrice = priceUpdate.newYesPrice;
    const newNoPrice  = priceUpdate.newNoPrice;
    const balanceAfterPaisa = result.profile.kes_balance - totalPaisa;

    // 1. Debit balance
    const { error: balErr } = await sb.from("profiles")
      .update({ kes_balance: balanceAfterPaisa }).eq("id", userId);
    if (balErr) return Response.json({ error: "Balance update failed" }, { status: 500 });

    // 2. Upsert position
    const { data: existing } = await sb.from("positions")
      .select("*").eq("user_id", userId).eq("market_id", market_id).single();

    if (existing) {
      const oldYes    = existing.yes_shares ?? 0;
      const oldNo     = existing.no_shares  ?? 0;
      const oldAvgY   = existing.avg_buy_price_yes ?? currentPrice;
      const oldAvgN   = existing.avg_buy_price_no  ?? currentPrice;
      const newYes    = outcome === "yes" ? oldYes + quantity : oldYes;
      const newNo     = outcome === "no"  ? oldNo  + quantity : oldNo;
      const newAvgY   = outcome === "yes" && newYes > 0
        ? Math.round(((oldAvgY * oldYes) + (currentPrice * quantity)) / newYes)
        : oldAvgY;
      const newAvgN   = outcome === "no"  && newNo  > 0
        ? Math.round(((oldAvgN * oldNo)  + (currentPrice * quantity)) / newNo)
        : oldAvgN;

      await sb.from("positions").update({
        yes_shares:        newYes,
        no_shares:         newNo,
        avg_buy_price_yes: newAvgY,
        avg_buy_price_no:  newAvgN,
      }).eq("id", existing.id);
    } else {
      await sb.from("positions").insert({
        user_id:           userId,
        market_id,
        yes_shares:        outcome === "yes" ? quantity : 0,
        no_shares:         outcome === "no"  ? quantity : 0,
        avg_buy_price_yes: outcome === "yes" ? currentPrice : null,
        avg_buy_price_no:  outcome === "no"  ? currentPrice : null,
        realized_pnl:      0,
      });
    }

    // 3. Insert trade record
    const { data: trade } = await sb.from("trades").insert({
      market_id,
      buyer_id:      userId,
      seller_id:     "00000000-0000-0000-0000-000000000001",
      outcome_token: outcome,
      price:         currentPrice,
      quantity,
      total_value:   cost * 100,    // paisa
      fee_amount:    fee  * 100,    // paisa
      fee_token:     "kes",
    }).select("id").single();

    const tradeId = trade?.id ?? null;

    // 4. Two transaction records
    await sb.from("transactions").insert([
      {
        user_id:       userId,
        type:          "trade_buy",
        amount:        cost * 100,
        currency:      "kes",
        direction:     "debit",
        reference_id:  tradeId,
        balance_after: (balanceAfterPaisa + fee * 100), // after cost deduction, before fee
        description:   `Bought ${quantity} ${outcome.toUpperCase()} shares at KES ${currentPrice}`,
      },
      {
        user_id:       userId,
        type:          "fee",
        amount:        fee  * 100,
        currency:      "kes",
        direction:     "debit",
        reference_id:  tradeId,
        balance_after: balanceAfterPaisa,
        description:   `Trading fee — ${quantity} ${outcome.toUpperCase()} @ KES ${currentPrice}`,
      },
    ]);

    // 5. Update market
    await sb.from("markets").update({
      yes_price:    newYesPrice,
      no_price:     newNoPrice,
      total_volume: (market.total_volume ?? 0) + cost * 100,
      total_trades: (market.total_trades ?? 0) + 1,
    }).eq("id", market_id);

    // 6. Insert price_history (non-blocking — table may not exist yet)
    await sb.from("price_history").insert({
      market_id,
      yes_price: newYesPrice,
      no_price:  newNoPrice,
      volume:    cost * 100,
      trade_count: 1,
    }).then(() => {}).catch(() => {});

    return Response.json({
      ok:               true,
      trade_id:         tradeId,
      shares_bought:    quantity,
      price_paid:       currentPrice,
      new_market_price: { yes: newYesPrice, no: newNoPrice },
      fee,
      balance_after:    balanceAfterPaisa / 100,
    });
  }

  // ── SELL ─────────────────────────────────────────────────────────────────────
  // Check position
  const { data: position } = await sb.from("positions")
    .select("*").eq("user_id", userId).eq("market_id", market_id).single();

  if (!position) return Response.json({ error: "No position in this market" }, { status: 400 });

  const heldShares = outcome === "yes" ? (position.yes_shares ?? 0) : (position.no_shares ?? 0);
  if (heldShares < quantity) {
    return Response.json({ error: `Insufficient shares — you hold ${heldShares}` }, { status: 400 });
  }

  const revenue    = quantity * currentPrice;              // KES
  const fee        = Math.floor(revenue * 0.02);          // KES
  const net        = revenue - fee;                        // KES
  const netPaisa   = net * 100;                           // paisa
  const balanceAfterPaisa = result.profile.kes_balance + netPaisa;

  // Fetch AI prediction for sell pricing
  const { data: aiRowsSell } = await sb
    .from("ai_predictions")
    .select("probability")
    .eq("market_id", market_id)
    .order("created_at", { ascending: false })
    .limit(1);
  const aiProbabilitySell: number | undefined = aiRowsSell?.[0]?.probability;

  const sellUpdate = calculateNewPrice(market.yes_price, outcome, "sell", quantity, aiProbabilitySell);
  const newYesPrice = sellUpdate.newYesPrice;
  const newNoPrice  = sellUpdate.newNoPrice;

  // Realized P&L
  const avgPrice   = outcome === "yes" ? (position.avg_buy_price_yes ?? currentPrice) : (position.avg_buy_price_no ?? currentPrice);
  const profitLoss = (currentPrice - avgPrice) * quantity; // KES

  // 1. Credit balance
  const { error: balErr } = await sb.from("profiles")
    .update({ kes_balance: balanceAfterPaisa }).eq("id", userId);
  if (balErr) return Response.json({ error: "Balance update failed" }, { status: 500 });

  // 2. Update position
  const newYes = outcome === "yes" ? (position.yes_shares - quantity) : position.yes_shares;
  const newNo  = outcome === "no"  ? (position.no_shares  - quantity) : position.no_shares;
  await sb.from("positions").update({
    yes_shares:   newYes,
    no_shares:    newNo,
    realized_pnl: (position.realized_pnl ?? 0) + profitLoss * 100,
  }).eq("id", position.id);

  // 3. Insert trade record
  const { data: trade } = await sb.from("trades").insert({
    market_id,
    buyer_id:      "00000000-0000-0000-0000-000000000001",
    seller_id:     userId,
    outcome_token: outcome,
    price:         currentPrice,
    quantity,
    total_value:   revenue * 100,
    fee_amount:    fee     * 100,
    fee_token:     "kes",
  }).select("id").single();

  const tradeId = trade?.id ?? null;

  // 4. Two transaction records
  await sb.from("transactions").insert([
    {
      user_id:       userId,
      type:          "trade_sell",
      amount:        revenue * 100,
      currency:      "kes",
      direction:     "credit",
      reference_id:  tradeId,
      balance_after: result.profile.kes_balance + revenue * 100,
      description:   `Sold ${quantity} ${outcome.toUpperCase()} shares at KES ${currentPrice}`,
    },
    {
      user_id:       userId,
      type:          "fee",
      amount:        fee * 100,
      currency:      "kes",
      direction:     "debit",
      reference_id:  tradeId,
      balance_after: balanceAfterPaisa,
      description:   `Trading fee — ${quantity} ${outcome.toUpperCase()} sell @ KES ${currentPrice}`,
    },
  ]);

  // 5. Update market
  await sb.from("markets").update({
    yes_price:    newYesPrice,
    no_price:     newNoPrice,
    total_volume: (market.total_volume ?? 0) + revenue * 100,
    total_trades: (market.total_trades ?? 0) + 1,
  }).eq("id", market_id);

  // 6. Insert price_history
  await sb.from("price_history").insert({
    market_id,
    yes_price: newYesPrice,
    no_price:  newNoPrice,
    volume:    revenue * 100,
    trade_count: 1,
  }).then(() => {}).catch(() => {});

  return Response.json({
    ok:               true,
    trade_id:         tradeId,
    shares_sold:      quantity,
    revenue,
    fee,
    profit_loss:      profitLoss,
    new_market_price: { yes: newYesPrice, no: newNoPrice },
    balance_after:    balanceAfterPaisa / 100,
  });
}
