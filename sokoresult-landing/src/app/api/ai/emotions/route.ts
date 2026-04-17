// src/app/api/ai/emotions/route.ts
import { NextResponse } from "next/server";
import { analyzeAllMarketEmotions } from "@/lib/ai/emotions";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await analyzeAllMarketEmotions();
    return NextResponse.json({ analyzed: results.length, results });
  } catch (err) {
    console.error("[emotions route]", err);
    return NextResponse.json({ error: "Emotion analysis failed" }, { status: 500 });
  }
}

// Support GET for Vercel cron
export async function GET(request: Request) {
  return POST(request);
}
