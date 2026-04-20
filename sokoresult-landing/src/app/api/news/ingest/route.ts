import { NextResponse } from "next/server";
import { scrapeRSSFeeds, scrapeWebSources } from "@/lib/news/scraper";
import { classifyStory } from "@/lib/ai/gemini";
import { linkStoryToMarkets } from "@/lib/news/linker";
import { determineVerificationTier } from "@/lib/news/verification";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function POST(request: Request) {
  // Auth: accept cron secret header OR admin bearer token
  const cronSecret = process.env.CRON_SECRET;
  const auth       = request.headers.get("authorization") ?? "";

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    // Dev bypass: allow when no CRON_SECRET set
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let ingested = 0;
  let skipped  = 0;
  let errors   = 0;
  const errorList: string[] = [];

  try {
    // ── Step 1: scrape all sources ──────────────────────────────────────────────
    const [rssStories, webStories] = await Promise.allSettled([
      scrapeRSSFeeds(),
      scrapeWebSources(),
    ]);

    const allStories = [
      ...(rssStories.status === "fulfilled" ? rssStories.value : []),
      ...(webStories.status === "fulfilled" ? webStories.value : []),
    ];

    // ── Step 2: process each story ─────────────────────────────────────────────
    for (const story of allStories) {
      try {
        // Dedupe by URL
        const { data: byUrl } = await sb
          .from("news_stories")
          .select("id")
          .eq("source_url", story.url)
          .limit(1);

        if (byUrl && byUrl.length > 0) { skipped++; continue; }

        // Dedupe by similar title (first 50 chars)
        const titlePrefix = story.title.slice(0, 50);
        const { data: byTitle } = await sb
          .from("news_stories")
          .select("id")
          .ilike("title", `%${titlePrefix}%`)
          .limit(1);

        if (byTitle && byTitle.length > 0) { skipped++; continue; }

        // Classify with Gemini
        const cls = await classifyStory(story.title, story.body);

        // Link to open markets
        const linkedIds = await linkStoryToMarkets(
          (cls.entities ?? []) as { name: string; type: string }[],
          (cls.keywords ?? []) as string[],
          story.title,
        );

        // Verification tier
        const vrf = determineVerificationTier(story.source, story.sourceType);

        // Insert
        const { error: insErr } = await sb.from("news_stories").insert({
          title:               story.title,
          body:                story.body || cls.summary,
          source_name:         story.source,
          source_type:         story.sourceType === "mainstream" ? "media" : story.sourceType === "specialized" ? "media" : "contributor",
          source_url:          story.url,
          image_url:           story.imageUrl,
          category:            cls.category ?? "politics",
          urgency:             cls.urgency  ?? 2,
          verification_status: vrf.status,
          entities:            cls.entities ?? [],
          linked_market_ids:   linkedIds,
          published_at:        story.publishedAt ?? new Date().toISOString(),
        });

        if (insErr) { console.error("Insert failed:", insErr); errors++; }
        else         { ingested++; }

        // Rate-limit between AI calls (stay within Gemini free tier)
        await new Promise((r) => setTimeout(r, 500));

      } catch (storyErr) {
        const msg = (storyErr as Error).message;
        console.error("Story processing failed:", msg);
        errorList.push(msg);
        errors++;
      }
    }
  } catch (err) {
    console.error("Ingestion failed:", err);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }

  return NextResponse.json({
    ingested,
    skipped,
    errors,
    total: ingested + skipped + errors,
    errorSamples: errorList.slice(0, 5),
  });
}
