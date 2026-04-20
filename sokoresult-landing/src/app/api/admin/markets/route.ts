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

// GET /api/admin/markets — list all markets (all statuses) for admin
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status = msg.includes("Forbidden") ? 403 : 401;
    return Response.json({ error: msg }, { status });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
  const offset = (page - 1) * limit;

  let query = sb
    .from("markets")
    .select(
      "id,slug,question,category,status,yes_price,no_price,total_volume,total_trades,participant_count,resolution_deadline,resolved_at,outcome,created_at,keywords,resolution_source,description",
      { count: "exact" }
    );

  if (search) {
    query = query.ilike("question", `%${search}%`);
  }

  if (sort === "volume") {
    query = query.order("total_volume", { ascending: false });
  } else if (sort === "trades") {
    query = query.order("total_trades", { ascending: false });
  } else if (sort === "status") {
    query = query.order("status", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    markets: data ?? [],
    total: count ?? 0,
    page,
    limit,
    has_more: offset + limit < (count ?? 0),
  });
}

// POST /api/admin/markets — create a new market
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status = msg.includes("Forbidden") ? 403 : 401;
    return Response.json({ error: msg }, { status });
  }

  let body: {
    question: string;
    slug?: string;
    description?: string;
    category: "politics" | "sports" | "entertainment" | "fashion";
    resolution_deadline: string;
    initial_yes_price?: number;
    resolution_source?: string;
    keywords?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question, description, category, resolution_deadline, resolution_source, keywords } = body;
  const initial_yes_price = body.initial_yes_price ?? 50;

  if (!question?.trim()) return Response.json({ error: "Question is required" }, { status: 400 });
  if (!category) return Response.json({ error: "Category is required" }, { status: 400 });
  if (!resolution_deadline) return Response.json({ error: "Resolution deadline is required" }, { status: 400 });

  if (new Date(resolution_deadline) <= new Date()) {
    return Response.json({ error: "Resolution deadline must be in the future" }, { status: 400 });
  }

  const yesPrice = Math.max(1, Math.min(99, Math.round(initial_yes_price)));
  const noPrice = 100 - yesPrice;

  // Generate/validate slug
  let slug = body.slug?.trim() || generateSlug(question);
  if (!slug) slug = generateSlug(question);

  // Ensure slug uniqueness
  const { data: existing } = await sb.from("markets").select("id").eq("slug", slug).single();
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const { data: market, error } = await sb
    .from("markets")
    .insert({
      question: question.trim(),
      slug,
      description: description?.trim() ?? null,
      category,
      status: "open",
      yes_price: yesPrice,
      no_price: noPrice,
      total_volume: 0,
      total_trades: 0,
      participant_count: 0,
      resolution_deadline,
      resolution_source: resolution_source?.trim() ?? null,
      keywords: keywords ?? [],
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Insert initial price_history record
  await sb.from("price_history").insert({
    market_id: market.id,
    yes_price: yesPrice,
    no_price: noPrice,
  });

  return Response.json({ market }, { status: 201 });
}
