// src/app/api/news/auto-ingest/route.ts
import { NextResponse } from "next/server";
import { scrapeRSSFeeds, scrapeWebSources } from "@/lib/news/scraper";
import { classifyStory } from "@/lib/ai/gemini";
import { linkStoryToMarkets } from "@/lib/news/linker";
import { determineVerificationTier } from "@/lib/news/verification";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (
    secret !== process.env.CRON_SECRET &&
    process.env.NODE_ENV !== "development"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ingested = 0, skipped = 0, errors = 0;

  try {
    const [rssResult, webResult] = await Promise.allSettled([
      scrapeRSSFeeds(),
      scrapeWebSources(),
    ]);

    const allStories = [
      ...(rssResult.status === "fulfilled" ? rssResult.value : []),
      ...(webResult.status === "fulfilled" ? webResult.value : []),
    ];

    for (const story of allStories) {
      try {
        // Dedupe by URL
        const { data: byUrl } = await sb
          .from("news_stories")
          .select("id")
          .eq("source_url", story.url)
          .limit(1);
        if (byUrl && byUrl.length > 0) { skipped++; continue; }

        // Dedupe by title prefix
        const prefix = story.title.slice(0, 50);
        const { data: byTitle } = await sb
          .from("news_stories")
          .select("id")
          .ilike("title", `%${prefix}%`)
          .limit(1);
        if (byTitle && byTitle.length > 0) { skipped++; continue; }

        const cls = await classifyStory(story.title, story.body);
        const linkedIds = await linkStoryToMarkets(
          (cls.entities ?? []) as { name: string; type: string }[],
          (cls.keywords ?? []) as string[],
          story.title,
        );
        const vrf = determineVerificationTier(story.source, story.sourceType);

        const { error: insErr } = await sb.from("news_stories").insert({
          title:               story.title,
          body:                story.body || cls.summary,
          source_name:         story.source,
          source_type:         story.sourceType === "mainstream" ? "media" : "contributor",
          source_url:          story.url,
          image_url:           story.imageUrl,
          category:            cls.category ?? "politics",
          urgency:             cls.urgency  ?? 2,
          verification_status: vrf.status,
          entities:            cls.entities ?? [],
          linked_market_ids:   linkedIds,
          published_at:        story.publishedAt ?? new Date().toISOString(),
        });

        if (insErr) { errors++; } else { ingested++; }
        await new Promise((r) => setTimeout(r, 300));
      } catch { errors++; }
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({
    ingested, skipped, errors,
    timestamp: new Date().toISOString(),
    nextRun: "10 minutes",
  });
}
