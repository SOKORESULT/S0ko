import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

const INTERVAL_MAP: Record<string, string> = {
  "24h": "1 day",
  "7d":  "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

export async function GET(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!result.profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  const { searchParams } = request.nextUrl;
  const interval = searchParams.get("interval") ?? "30d";
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
  const limit    = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const offset   = (page - 1) * limit;

  const userId = result.profile.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any;

  // Base query — fetch trades for buyer or seller
  // Supabase doesn't support OR across different columns directly via .or() on foreign key joins,
  // so we run two queries and merge.
  const fields = "id,outcome_token,price,quantity,total_value,fee_amount,fee_token,created_at,buyer_id,seller_id,market:markets(id,slug,question)";

  let buyQuery  = sb.from("trades").select(fields).eq("buyer_id",  userId).order("created_at", { ascending: false });
  let sellQuery = sb.from("trades").select(fields).eq("seller_id", userId).order("created_at", { ascending: false });

  if (interval !== "all" && INTERVAL_MAP[interval]) {
    const cutoff = new Date(Date.now() - parseDays(interval) * 86_400_000).toISOString();
    buyQuery  = buyQuery.gte("created_at", cutoff);
    sellQuery = sellQuery.gte("created_at", cutoff);
  }

  const [{ data: buys }, { data: sells }] = await Promise.all([buyQuery, sellQuery]);

  // Merge, deduplicate (a user can be both buyer and seller in edge cases), sort
  const allMap = new Map<string, Record<string, unknown>>();
  for (const t of [...(buys ?? []), ...(sells ?? [])]) {
    if (!allMap.has(t.id)) {
      allMap.set(t.id, {
        ...t,
        side: t.buyer_id === userId ? "buy" : "sell",
      });
    }
  }

  const all = Array.from(allMap.values()).sort(
    (a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
  );

  const total = all.length;
  const trades = all.slice(offset, offset + limit);

  return Response.json({ trades, total, page, limit, has_more: offset + limit < total });
}

function parseDays(interval: string): number {
  if (interval === "24h") return 1;
  if (interval === "7d")  return 7;
  if (interval === "30d") return 30;
  if (interval === "90d") return 90;
  return 30;
}
