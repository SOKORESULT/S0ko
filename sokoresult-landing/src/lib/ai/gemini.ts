import OpenAI from "openai";

const client = new OpenAI({
  apiKey:  process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const MODEL = "gemini-2.0-flash";

function parseAIJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

// ─── 1. Classify a news story ─────────────────────────────────────────────────

export async function classifyStory(title: string, body?: string) {
  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role:    "system",
          content: "You are a news classifier for SokoResult, a Kenyan prediction market. Return ONLY valid JSON — no explanation, no markdown.",
        },
        {
          role:    "user",
          content: `Title: ${title}\nBody: ${body ?? "N/A"}\n\nReturn:\n{"category":"politics|sports|entertainment|fashion","sentiment":"positive|negative|neutral","urgency":3,"entities":[{"name":"Example","type":"person|org|event|place"}],"summary":"one line","keywords":["kw1","kw2"]}`,
        },
      ],
      temperature: 0.3,
      max_tokens:  500,
    });
    return parseAIJson(res.choices[0]?.message?.content ?? "{}");
  } catch (err) {
    console.error("classifyStory failed:", err);
    return {
      category:  "politics",
      sentiment: "neutral",
      urgency:   2,
      entities:  [] as unknown[],
      summary:   title,
      keywords:  title.toLowerCase().split(" ").filter((w) => w.length > 3).slice(0, 5),
    };
  }
}

// ─── 2. Predict market probability ───────────────────────────────────────────

export async function predictMarket(
  marketQuestion: string,
  currentCrowdPrice: number,
  recentNews: { title: string; source: string; publishedAt: string }[],
  socialSentiment: { sampleTweets: string[] },
) {
  const newsCtx = recentNews.slice(0, 10).map((n, i) =>
    `${i + 1}. [${n.source}] ${n.title} (${n.publishedAt})`
  ).join("\n");

  const tweetCtx = socialSentiment.sampleTweets.length > 0
    ? `\n\nPublic sentiment from X/Twitter:\n${socialSentiment.sampleTweets.slice(0, 8).map((t) => `- "${t.slice(0, 150)}"`).join("\n")}`
    : "";

  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role:    "system",
          content: "You are a probability analyst for SokoResult, a Kenyan prediction market. Analyze news and social sentiment to estimate event probability. Be calibrated. Return ONLY valid JSON.",
        },
        {
          role:    "user",
          content: `Market: "${marketQuestion}"\nCrowd price: ${currentCrowdPrice}%\nDate: ${new Date().toISOString().split("T")[0]}\n\nRecent news:\n${newsCtx || "No recent news"}${tweetCtx}\n\nReturn:\n{"probability":65,"confidence":"low|medium|high","reasoning":"2-3 sentence analysis","key_factors":["f1","f2","f3"],"sentiment_score":0,"news_momentum":"rising|falling|stable"}`,
        },
      ],
      temperature: 0.4,
      max_tokens:  800,
    });
    return parseAIJson(res.choices[0]?.message?.content ?? "{}");
  } catch (err) {
    console.error("predictMarket failed:", err);
    return {
      probability:    currentCrowdPrice,
      confidence:     "low",
      reasoning:      "AI prediction unavailable — using crowd price as fallback.",
      key_factors:    [] as unknown[],
      sentiment_score: 0,
      news_momentum:  "stable",
    };
  }
}

// ─── 3. Analyse social sentiment ──────────────────────────────────────────────

export async function analyzeSentiment(tweets: string[], topic: string) {
  if (tweets.length === 0) {
    return { positive: 33, negative: 33, neutral: 34, summary: "No social data available" };
  }
  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Analyze public sentiment from social media. Return ONLY valid JSON." },
        {
          role:    "user",
          content: `Topic: "${topic}"\n\nPosts:\n${tweets.map((t) => `- "${t.slice(0, 200)}"`).join("\n")}\n\nReturn: {"positive":40,"negative":30,"neutral":30,"summary":"one sentence"}`,
        },
      ],
      temperature: 0.3,
      max_tokens:  300,
    });
    return parseAIJson(res.choices[0]?.message?.content ?? "{}");
  } catch {
    return { positive: 33, negative: 33, neutral: 34, summary: "Sentiment analysis unavailable" };
  }
}
