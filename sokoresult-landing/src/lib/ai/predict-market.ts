import { getAIClient, getModelName } from "./provider";
import type { Market, NewsStory } from "@/lib/types/database";

export interface MarketPrediction {
  probability: number; // 0-100
  confidence: "low" | "medium" | "high";
  reasoning: string;
  key_factors: string[];
  news_analyzed: number;
  model_used: string;
}

const FALLBACK: MarketPrediction = {
  probability: 50,
  confidence: "low",
  reasoning: "Insufficient data to make a reliable prediction.",
  key_factors: [],
  news_analyzed: 0,
  model_used: "none",
};

export async function generatePrediction(
  market: Market,
  recentNews: NewsStory[]
): Promise<MarketPrediction> {
  const model = getModelName();

  // Fetch latest emotion data for this market (best-effort — doesn't block prediction)
  let emotionContext = "";
  try {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabaseAdmin as any;
    const { data: emotions } = await sb
      .from("topic_emotions")
      .select("positive_pct, negative_pct, momentum, sentiment_summary, post_count")
      .eq("market_id", market.id)
      .order("analyzed_at", { ascending: false })
      .limit(1);

    if (emotions && emotions.length > 0) {
      const e = emotions[0] as {
        positive_pct: number; negative_pct: number;
        momentum: string; sentiment_summary: string; post_count: number;
      };
      emotionContext = `\n\nPublic sentiment analysis (${e.post_count} social posts):\n- Positive: ${Math.round(e.positive_pct)}% | Negative: ${Math.round(e.negative_pct)}%\n- Momentum: ${e.momentum}\n- Summary: ${e.sentiment_summary}`;
    }
  } catch { /* Emotion fetch is non-blocking — prediction still runs */ }

  try {
    const client = getAIClient();

    const newsSummary = recentNews
      .slice(0, 10)
      .map((n, i) => `${i + 1}. [${n.source_name}] ${n.title}`)
      .join("\n");

    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a probability analyst for SokoResult, a Kenyan prediction market. Based on evidence provided, estimate the probability (0-100) that the outcome occurs. Be calibrated. Return ONLY valid JSON, no markdown.",
        },
        {
          role: "user",
          content: `Market question: "${market.question}"
Current crowd probability: ${market.yes_price}%
Current date: ${new Date().toISOString().split("T")[0]}
Resolution deadline: ${market.resolution_deadline}

Recent related news (${recentNews.length} stories):
${newsSummary || "No related news found."}${emotionContext}

Return JSON: {"probability":0-100,"confidence":"low"|"medium"|"high","reasoning":"2-3 sentences","key_factors":["factor1","factor2","factor3"]}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text.trim()) as Omit<MarketPrediction, "news_analyzed" | "model_used">;

    return {
      ...FALLBACK,
      ...parsed,
      probability: Math.max(0, Math.min(100, parsed.probability)),
      news_analyzed: recentNews.length,
      model_used: model,
    };
  } catch {
    return { ...FALLBACK, model_used: model, news_analyzed: recentNews.length };
  }
}
