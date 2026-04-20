import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generatePrediction } from "@/lib/ai/predict-market";
import type { Market, NewsStory } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return Response.json({ error: msg }, { status: msg.includes("Forbidden") ? 403 : 401 });
  }

  const { marketId } = await params;

  const { data: market } = await sb.from("markets").select("*").eq("id", marketId).single();
  if (!market) return Response.json({ error: "Market not found" }, { status: 404 });

  // Fetch recent linked news stories
  const { data: news } = await sb
    .from("news_stories")
    .select("*")
    .contains("linked_market_ids", [marketId])
    .order("published_at", { ascending: false })
    .limit(10);

  const prediction = await generatePrediction(market as Market, (news ?? []) as NewsStory[]);

  // Store in ai_predictions
  await sb.from("ai_predictions").insert({
    market_id: marketId,
    probability: prediction.probability,
    confidence: prediction.confidence,
    reasoning: prediction.reasoning,
    key_factors: prediction.key_factors,
    news_analyzed: prediction.news_analyzed,
    model_used: prediction.model_used,
  });

  return Response.json({ prediction });
}
