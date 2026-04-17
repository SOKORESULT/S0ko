// src/lib/ai/emotions.ts
import OpenAI from "openai";
import axios from "axios";
import * as cheerio from "cheerio";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

function parseAIJson(text: string): Record<string, unknown> {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export type MomentumType = "surging_positive" | "rising" | "stable" | "declining" | "surging_negative";

export interface EmotionRecord {
  id?: string;
  topic: string;
  market_id: string | null;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  anger: number;
  hope: number;
  fear: number;
  excitement: number;
  sarcasm: number;
  sample_posts: { text: string }[];
  post_count: number;
  sentiment_summary: string;
  momentum: MomentumType;
  analyzed_at?: string;
}

async function scrapePublicPosts(topic: string): Promise<string[]> {
  const posts: string[] = [];
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

  // Method 1: Nitter public Twitter mirror
  const nitterInstances = [
    "https://nitter.poast.org",
    "https://nitter.privacydev.net",
    "https://nitter.cz",
  ];

  for (const instance of nitterInstances) {
    try {
      const { data: html } = await axios.get(
        `${instance}/search?q=${encodeURIComponent(topic + " kenya")}&f=tweets`,
        { timeout: 10000, headers: { "User-Agent": ua } }
      );
      const $ = cheerio.load(html as string);
      $(".tweet-content, .tweet-body, [class*='tweet-content']").slice(0, 25).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20 && text.length < 500) posts.push(text);
      });
      if (posts.length > 0) break;
    } catch { continue; }
  }

  // Method 2: Google search snippets
  if (posts.length < 5) {
    try {
      const q = encodeURIComponent(`${topic} kenya site:twitter.com OR site:reddit.com`);
      const { data: html } = await axios.get(
        `https://www.google.com/search?q=${q}&tbs=qdr:w`,
        { timeout: 10000, headers: { "User-Agent": ua } }
      );
      const $ = cheerio.load(html as string);
      $("h3, .BNeawe").slice(0, 10).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) posts.push(text);
      });
    } catch { /* Google may block — fine */ }
  }

  // Method 3: Reddit r/Kenya
  if (posts.length < 5) {
    try {
      const { data: html } = await axios.get(
        `https://www.reddit.com/r/Kenya/search/?q=${encodeURIComponent(topic)}&sort=new&t=week`,
        { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0 (compatible; SokoResultBot/1.0)" } }
      );
      const $ = cheerio.load(html as string);
      $("h3, [slot='title'], .Post h3").slice(0, 10).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 5) posts.push(text);
      });
    } catch { /* Reddit may block — fine */ }
  }

  // Deduplicate and filter to reasonable length
  return [...new Set(posts)].filter((p) => p.length >= 20 && p.length <= 500);
}

export async function analyzeTopicEmotions(
  topic: string,
  marketId?: string
): Promise<EmotionRecord | null> {
  const posts = await scrapePublicPosts(topic);

  const baseRecord = {
    topic,
    market_id: marketId ?? null,
  };

  if (posts.length === 0) {
    const record: EmotionRecord = {
      ...baseRecord,
      positive_pct:      33,
      negative_pct:      33,
      neutral_pct:       34,
      anger:             0,
      hope:              0,
      fear:              0,
      excitement:        0,
      sarcasm:           0,
      sample_posts:      [],
      post_count:        0,
      sentiment_summary: "No social media data available for this topic.",
      momentum:          "stable",
    };
    await sb.from("topic_emotions").insert(record);
    return record;
  }

  try {
    const response = await client.chat.completions.create({
      model: "gemini-2.0-flash",
      temperature: 0.4,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: "You are a social media sentiment analyst specialising in Kenyan public opinion. Consider Kenyan slang, Sheng, sarcasm, and cultural context. Return ONLY valid JSON — no markdown.",
        },
        {
          role: "user",
          content: `Topic: "${topic}"\n\nSocial media posts:\n${posts.map((p, i) => `${i + 1}. "${p}"`).join("\n")}\n\nReturn:\n{"positive_pct":40,"negative_pct":35,"neutral_pct":25,"emotions":{"anger":20,"hope":25,"fear":15,"excitement":30,"sarcasm":10},"momentum":"surging_positive|rising|stable|declining|surging_negative","summary":"Kenyans are mostly [emotion] about [topic] because...","notable_quotes":["quote1","quote2"]}`,
        },
      ],
    });

    const analysis = parseAIJson(response.choices[0]?.message?.content ?? "{}");
    const emotions = (analysis.emotions as Record<string, number>) ?? {};
    const quotes = (analysis.notable_quotes as string[]) ?? posts.slice(0, 3);

    const record: EmotionRecord = {
      ...baseRecord,
      positive_pct:      (analysis.positive_pct as number) ?? 33,
      negative_pct:      (analysis.negative_pct as number) ?? 33,
      neutral_pct:       (analysis.neutral_pct  as number) ?? 34,
      anger:             emotions.anger      ?? 0,
      hope:              emotions.hope       ?? 0,
      fear:              emotions.fear       ?? 0,
      excitement:        emotions.excitement ?? 0,
      sarcasm:           emotions.sarcasm    ?? 0,
      sample_posts:      quotes.map((t: string) => ({ text: t })),
      post_count:        posts.length,
      sentiment_summary: (analysis.summary as string) ?? "Analysis complete.",
      momentum:          (analysis.momentum as MomentumType) ?? "stable",
    };

    await sb.from("topic_emotions").insert(record);
    return record;
  } catch (err) {
    console.error("[emotions] Gemini analysis failed:", err);
    return null;
  }
}

export async function analyzeAllMarketEmotions(): Promise<
  { market: string; topic: string; result: EmotionRecord | null }[]
> {
  const { data: markets, error } = await sb
    .from("markets")
    .select("id, question, keywords")
    .eq("status", "open");

  if (error) {
    console.error("[emotions] Failed to fetch markets:", error);
    return [];
  }

  if (!markets) return [];

  const results: { market: string; topic: string; result: EmotionRecord | null }[] = [];

  for (const market of markets as { id: string; question: string; keywords?: string[] }[]) {
    const topic =
      (market.keywords && market.keywords[0]) ??
      market.question
        .replace(/^(Will|Is|Does)\s+|\?$/gi, "")
        .split(" ")
        .slice(0, 4)
        .join(" ");

    const result = await analyzeTopicEmotions(topic, market.id);
    results.push({ market: market.question, topic, result });
    await new Promise((r) => setTimeout(r, 2000));
  }

  return results;
}
