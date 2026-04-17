import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

function parseAIJson(text: string): unknown[] {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function suggestMarketsFromNews(): Promise<string[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentNews } = await sb
    .from("news_stories")
    .select("id, title, category, urgency, entities")
    .gte("published_at", since)
    .order("urgency", { ascending: false })
    .limit(30);

  if (!recentNews || recentNews.length === 0) return [];

  const { data: existingMarkets } = await sb
    .from("markets")
    .select("question")
    .in("status", ["open", "closed"]);

  const { data: existingSuggestions } = await sb
    .from("market_suggestions")
    .select("question")
    .eq("status", "pending");

  const existingQs: string[] = (existingMarkets ?? []).map(
    (m: { question: string }) => m.question.toLowerCase()
  );
  const pendingQs: string[] = (existingSuggestions ?? []).map(
    (s: { question: string }) => s.question.toLowerCase()
  );

  const newsContext = (recentNews as { category: string; title: string; urgency: number }[])
    .map((n, i) => `${i + 1}. [${n.category}] ${n.title} (urgency: ${n.urgency}/5)`)
    .join("\n");

  const existingContext = existingQs
    .slice(0, 20)
    .map((q) => `- ${q}`)
    .join("\n");

  const response = await client.chat.completions.create({
    model: "gemini-2.0-flash",
    temperature: 0.7,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content: `You are a prediction market creator for SokoResult, a Kenyan prediction market platform. Based on trending news, suggest NEW prediction markets that Kenyans would want to bet on. Markets must be:
- Clear YES/NO questions with a definitive resolution date
- About topics Kenyans care about (politics, sports, entertainment, fashion)
- Timely (resolve within 3-18 months from today, 2026-04-17)
- Not duplicates of existing markets
- Controversial enough that people disagree (not obvious outcomes)
Return ONLY valid JSON array — no markdown, no explanation.`,
      },
      {
        role: "user",
        content: `Today's trending news from Kenya:\n${newsContext}\n\nExisting markets (DO NOT duplicate):\n${existingContext || "None yet"}\n\nSuggest 3-5 NEW prediction markets. Return JSON array:\n[{"question":"Will X happen by Y date?","category":"politics|sports|entertainment|fashion","probability":55,"reasoning":"Based on [news]...","resolution_deadline":"2026-12-31","description":"Resolves YES if... Resolves NO if...","keywords":["kw1","kw2"],"source_news_indices":[1,3]}]`,
      },
    ],
  });

  const suggestions = parseAIJson(
    response.choices[0]?.message?.content ?? "[]"
  ) as {
    question: string;
    category: string;
    probability: number;
    reasoning: string;
    resolution_deadline: string;
    description: string;
    keywords: string[];
    source_news_indices: number[];
  }[];

  const inserted: string[] = [];

  for (const s of suggestions) {
    const qLower = s.question.toLowerCase();

    // Skip if too similar to existing markets or pending suggestions
    const isDupe =
      existingQs.some(
        (eq) =>
          eq.includes(qLower.substring(0, 30)) ||
          qLower.includes(eq.substring(0, 30))
      ) ||
      pendingQs.some((pq) => pq.includes(qLower.substring(0, 30)));

    if (isDupe) continue;

    const slug = s.question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 60);

    const sourceNewsIds = (s.source_news_indices ?? [])
      .filter((i: number) => i >= 1 && i <= recentNews.length)
      .map((i: number) => (recentNews as { id: string }[])[i - 1].id);

    const { error } = await sb.from("market_suggestions").insert({
      question:              s.question,
      suggested_slug:        slug,
      description:           s.description,
      category:              s.category,
      suggested_probability: Math.max(5, Math.min(95, Math.round(s.probability))),
      reasoning:             s.reasoning,
      source_news_ids:       sourceNewsIds,
      keywords:              s.keywords ?? [],
      resolution_deadline:   s.resolution_deadline,
    });

    if (!error) inserted.push(s.question);
  }

  return inserted;
}
