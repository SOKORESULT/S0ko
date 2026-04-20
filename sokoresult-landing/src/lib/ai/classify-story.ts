import { getAIClient, getModelName } from "./provider";

export interface StoryClassification {
  category: "politics" | "sports" | "entertainment" | "fashion";
  sentiment: "positive" | "negative" | "neutral";
  urgency: number; // 1-5
  entities: { name: string; type: "person" | "org" | "event" | "place" }[];
  summary: string;
  is_credible: boolean;
  keywords: string[];
}

const FALLBACK: StoryClassification = {
  category: "politics",
  sentiment: "neutral",
  urgency: 2,
  entities: [],
  summary: "",
  is_credible: true,
  keywords: [],
};

export async function classifyStory(
  title: string,
  body?: string
): Promise<StoryClassification> {
  try {
    const client = getAIClient();
    const model  = getModelName();

    const response = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            'You are a news classifier for SokoResult, a Kenyan prediction market. Classify news stories. Return ONLY valid JSON with no markdown formatting, no code blocks.',
        },
        {
          role: "user",
          content: `Title: ${title}\nBody: ${body ?? "N/A"}\n\nReturn JSON with these exact fields:\n{"category":"politics"|"sports"|"entertainment"|"fashion","sentiment":"positive"|"negative"|"neutral","urgency":1-5,"entities":[{"name":"string","type":"person"|"org"|"event"|"place"}],"summary":"one sentence","is_credible":true|false,"keywords":["array","of","tags"]}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text.trim()) as StoryClassification;
    return { ...FALLBACK, ...parsed };
  } catch {
    return FALLBACK;
  }
}
