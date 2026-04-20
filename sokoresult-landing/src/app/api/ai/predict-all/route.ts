import { NextResponse } from "next/server";
import { predictMarket } from "@/lib/ai/gemini";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function POST(request: Request) {
  // Auth: cron secret or admin bearer token
  const cronSecret = process.env.CRON_SECRET;
  const auth       = request.headers.get("authorization") ?? "";
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { data: markets } = await sb.from("markets").select("*").eq("status", "open");
  if (!markets) return NextResponse.json({ error: "No markets" }, { status: 404 });

  const results: unknown[] = [];

  for (const market of markets) {
    try {
      // Recent news linked to this market
      const { data: news } = await sb
        .from("news_stories")
        .select("title, source_name, published_at")
        .contains("linked_market_ids", [market.id])
        .order("published_at", { ascending: false })
        .limit(10);

      // Emotion/sentiment from topic_emotions table (no external API cost)
      let sentimentContext = "";
      try {
        const { data: emotionRow } = await sb
          .from("topic_emotions")
          .select("positive_pct, negative_pct, momentum, sentiment_summary, post_count")
          .eq("market_id", market.id)
          .order("analyzed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (emotionRow) {
          sentimentContext = `Public sentiment: ${emotionRow.positive_pct}% positive, ${emotionRow.negative_pct}% negative. Momentum: ${emotionRow.momentum}. ${emotionRow.sentiment_summary ?? ""}`;
        }
      } catch { /* emotion context is optional — proceed without it */ }

      // Run Gemini prediction
      const prediction = await predictMarket(
        market.question as string,
        market.yes_price as number,
        (news ?? []).map((n: { title: string; source_name: string; published_at: string }) => ({
          title:       n.title,
          source:      n.source_name,
          publishedAt: n.published_at,
        })),
        { sampleTweets: sentimentContext ? [sentimentContext] : [] },
      );

      const prob = Math.max(1, Math.min(99, Number(prediction.probability ?? market.yes_price)));

      await sb.from("ai_predictions").insert({
        market_id:    market.id,
        probability:  prob,
        confidence:   prediction.confidence ?? "low",
        reasoning:    prediction.reasoning  ?? "",
        key_factors:  prediction.key_factors ?? [],
        news_analyzed: (news ?? []).length,
        model_used:   "gemini-2.0-flash",
      });

      results.push({
        market:     market.slug,
        crowd:      market.yes_price,
        ai:         prob,
        divergence: prob - (market.yes_price as number),
        confidence: prediction.confidence,
      });

      await new Promise((r) => setTimeout(r, 1000));

    } catch (err) {
      console.error(`Prediction failed for ${market.slug as string}:`, (err as Error).message);
      results.push({ market: market.slug, error: true });
    }
  }

  return NextResponse.json({ predicted: results.length, results });
}
