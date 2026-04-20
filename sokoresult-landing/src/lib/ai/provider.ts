import OpenAI from "openai";

export function getAIClient(): OpenAI {
  const provider = process.env.AI_PROVIDER ?? "gemini";

  if (provider === "gemini") {
    return new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }

  if (provider === "groq") {
    return new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  throw new Error('AI_PROVIDER must be "gemini" or "groq"');
}

export function getModelName(): string {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  if (provider === "gemini") return "gemini-2.0-flash";
  if (provider === "groq")   return "llama-3.3-70b-versatile";
  return "gemini-2.0-flash";
}
