// src/app/api/ai/suggest-markets/route.ts
import { NextResponse } from "next/server";
import { suggestMarketsFromNews } from "@/lib/ai/suggest-markets";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const markets = await suggestMarketsFromNews();
    return NextResponse.json({ suggested: markets.length, markets });
  } catch (err) {
    console.error("[suggest-markets route]", err);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}

// Also support GET for Vercel cron
export async function GET(request: Request) {
  return POST(request);
}
