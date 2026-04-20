import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

function generateSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

// POST /api/admin/markets/bulk — bulk create markets
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status = msg.includes("Forbidden") ? 403 : 401;
    return Response.json({ error: msg }, { status });
  }

  let body: {
    markets: Array<{
      question: string;
      category: "politics" | "sports" | "entertainment" | "fashion";
      resolution_deadline: string;
      description?: string;
    }>;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.markets) || body.markets.length === 0) {
    return Response.json({ error: "markets array is required" }, { status: 400 });
  }

  const created = [];
  const errors = [];

  for (const item of body.markets) {
    if (!item.question?.trim() || !item.category || !item.resolution_deadline) {
      errors.push({ question: item.question, error: "Missing required fields" });
      continue;
    }

    let slug = generateSlug(item.question);
    const { data: existing } = await sb.from("markets").select("id").eq("slug", slug).single();
    if (existing) slug = `${slug}-${Date.now()}`;

    const { data: market, error } = await sb
      .from("markets")
      .insert({
        question: item.question.trim(),
        slug,
        description: item.description?.trim() ?? null,
        category: item.category,
        status: "open",
        yes_price: 50,
        no_price: 50,
        total_volume: 0,
        total_trades: 0,
        participant_count: 0,
        resolution_deadline: item.resolution_deadline,
        keywords: [],
      })
      .select()
      .single();

    if (error) {
      errors.push({ question: item.question, error: error.message });
    } else {
      created.push(market);
      // Insert initial price_history
      await sb.from("price_history").insert({
        market_id: market.id,
        yes_price: 50,
        no_price: 50,
      });
    }
  }

  return Response.json({ created, errors, created_count: created.length, error_count: errors.length });
}
