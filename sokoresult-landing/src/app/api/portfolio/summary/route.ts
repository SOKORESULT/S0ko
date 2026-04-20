import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!result.profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  const userId = result.profile.id;
  const kesBalance = result.profile.kes_balance ?? 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any;

  // Positions with current market prices
  const { data: positions } = await sb
    .from("positions")
    .select("yes_shares,no_shares,avg_buy_price_yes,avg_buy_price_no,realized_pnl,market:markets(yes_price,no_price,status)")
    .eq("user_id", userId);

  // Trade counts
  const { count: buyCount } = await sb
    .from("trades")
    .select("*", { count: "exact", head: true })
    .eq("buyer_id", userId);

  const { count: sellCount } = await sb
    .from("trades")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", userId);

  // Distinct markets traded
  const { data: buyMarkets } = await sb
    .from("trades")
    .select("market_id")
    .eq("buyer_id", userId);

  const { data: sellMarkets } = await sb
    .from("trades")
    .select("market_id")
    .eq("seller_id", userId);

  const allMarketIds = new Set([
    ...((buyMarkets ?? []).map((t: { market_id: string }) => t.market_id)),
    ...((sellMarkets ?? []).map((t: { market_id: string }) => t.market_id)),
  ]);

  // Calculate P&L
  let unrealized_pnl   = 0;
  let realized_pnl     = 0;
  let position_value   = 0;
  let resolved_count   = 0;
  let win_count        = 0;

  for (const p of (positions ?? [])) {
    const yesShares = p.yes_shares ?? 0;
    const noShares  = p.no_shares  ?? 0;
    const yesPrice  = p.market?.yes_price ?? 50;
    const noPrice   = p.market?.no_price  ?? 50;
    const avgYes    = p.avg_buy_price_yes ?? yesPrice;
    const avgNo     = p.avg_buy_price_no  ?? noPrice;

    unrealized_pnl += (yesPrice - avgYes) * yesShares + (noPrice - avgNo) * noShares;
    realized_pnl   += p.realized_pnl ?? 0;
    position_value += (yesPrice * yesShares + noPrice * noShares) / 100;

    if (p.market?.status === "resolved") {
      resolved_count++;
      if ((p.realized_pnl ?? 0) > 0) win_count++;
    }
  }

  const total_portfolio_value = position_value + kesBalance / 100;
  const net_pnl = unrealized_pnl + realized_pnl;
  const total_trades = (buyCount ?? 0) + (sellCount ?? 0);
  const markets_traded = allMarketIds.size;
  const win_rate = resolved_count > 0 ? Math.round((win_count / resolved_count) * 100) : null;

  return Response.json({
    total_portfolio_value,
    unrealized_pnl,
    realized_pnl,
    net_pnl,
    total_trades,
    markets_traded,
    win_rate,
    win_count,
    resolved_count,
    kes_balance: kesBalance / 100,
  });
}
