import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Only available in development
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not available in production" }, { status: 403 });
  }

  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!result.profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  const userId = result.profile.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any;

  // Get available markets
  const { data: markets, error: mErr } = await sb
    .from("markets")
    .select("id,yes_price,no_price")
    .eq("status", "open")
    .limit(6);

  if (mErr || !markets?.length) {
    return Response.json({ error: "No open markets found — run the market seed first" }, { status: 400 });
  }

  // Clear existing demo data for this user
  await sb.from("positions").delete().eq("user_id", userId);
  await sb.from("trades").delete().eq("buyer_id", userId);

  // Insert positions
  const positions = markets.slice(0, 5).map((m: { id: string; yes_price: number; no_price: number }, i: number) => ({
    user_id:           userId,
    market_id:         m.id,
    yes_shares:        i % 2 === 0 ? Math.floor(50 + Math.random() * 150) : 0,
    no_shares:         i % 2 !== 0 ? Math.floor(30 + Math.random() * 100) : 0,
    avg_buy_price_yes: m.yes_price - Math.floor(Math.random() * 20),
    avg_buy_price_no:  m.no_price  - Math.floor(Math.random() * 15),
    realized_pnl:      Math.floor((Math.random() - 0.35) * 50000),
  }));

  const { error: posErr } = await sb.from("positions").insert(positions);
  if (posErr) return Response.json({ error: posErr.message }, { status: 500 });

  // Insert trades spread over last 30 days
  const trades = [];
  const now = Date.now();
  for (let i = 0; i < 18; i++) {
    const market = markets[i % markets.length] as { id: string; yes_price: number; no_price: number };
    const isBuy  = Math.random() > 0.4;
    const qty    = Math.floor(10 + Math.random() * 90);
    const price  = market.yes_price + Math.floor((Math.random() - 0.5) * 20);
    const total  = price * qty;
    const fee    = Math.floor(total * 0.02);
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);

    trades.push({
      market_id:    market.id,
      buyer_id:     isBuy  ? userId : "00000000-0000-0000-0000-000000000001",
      seller_id:    !isBuy ? userId : "00000000-0000-0000-0000-000000000001",
      outcome_token: Math.random() > 0.5 ? "yes" : "no",
      price,
      quantity:     qty,
      total_value:  total,
      fee_amount:   fee,
      fee_token:    "kes",
      created_at:   new Date(now - daysAgo * 86_400_000 - hoursAgo * 3_600_000).toISOString(),
    });
  }

  const { error: tradeErr } = await sb.from("trades").insert(trades);
  if (tradeErr) return Response.json({ error: tradeErr.message }, { status: 500 });

  return Response.json({ ok: true, positions: positions.length, trades: trades.length });
}
