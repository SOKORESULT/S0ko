import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!result.profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("positions")
    .select("*, market:markets(id,slug,question,category,yes_price,no_price,status,total_volume)")
    .eq("user_id", result.profile.id)
    .or("yes_shares.gt.0,no_shares.gt.0");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Enrich with unrealized P&L
  const positions = (data ?? []).map((p: Record<string, unknown> & { market?: Record<string, number>; yes_shares?: number; no_shares?: number; avg_buy_price_yes?: number; avg_buy_price_no?: number }) => {
    const yesShares   = p.yes_shares ?? 0;
    const noShares    = p.no_shares ?? 0;
    const yesPrice    = p.market?.yes_price ?? 50;
    const noPrice     = p.market?.no_price  ?? 50;
    const avgYes      = p.avg_buy_price_yes ?? yesPrice;
    const avgNo       = p.avg_buy_price_no  ?? noPrice;

    const unrealizedYes = (yesPrice - avgYes) * yesShares;
    const unrealizedNo  = (noPrice  - avgNo)  * noShares;
    const unrealized_pnl = unrealizedYes + unrealizedNo;

    const position_value = (yesPrice * yesShares + noPrice * noShares) / 100;

    return { ...p, unrealized_pnl, position_value };
  });

  // Sort by position value desc
  positions.sort((a: { position_value: number }, b: { position_value: number }) => b.position_value - a.position_value);

  return Response.json({ positions });
}
