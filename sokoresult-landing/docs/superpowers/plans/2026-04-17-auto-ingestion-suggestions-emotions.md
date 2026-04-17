# Auto-Ingestion, AI Market Suggestions & Emotion Monitoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three features to SokoResult: fully automated news ingestion via client-side poller, Gemini-powered AI market suggestions for admin approval, and Twitter/X emotion monitoring that feeds into price calculations and AI predictions.

**Architecture:** Each feature is a self-contained lib (`src/lib/ai/`) + API routes (`src/app/api/`) + UI (admin page or component). Emotions feed into pricing and predictions as optional enrichment — existing calls work unchanged with no emotion data. All new routes follow existing patterns: `requireAdmin` for admin routes, `CRON_SECRET` query param for cron routes, `supabaseAdmin` for DB writes.

**Tech Stack:** Next.js App Router, Supabase (postgres + auth), Gemini 2.0 Flash via OpenAI compat (`openai` npm package), axios + cheerio for scraping, Recharts for charts — all already installed.

**Working directory:** `sokoresult-landing/` (all paths below are relative to this)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/app/api/news/auto-ingest/route.ts` | GET endpoint for client-side poller |
| Create | `src/components/news-auto-poller.tsx` | Invisible client component, polls every 10 min |
| Create | `src/lib/ai/suggest-markets.ts` | Gemini market suggestion logic |
| Create | `src/app/api/ai/suggest-markets/route.ts` | POST cron/admin trigger |
| Create | `src/app/api/admin/suggestions/route.ts` | GET list suggestions |
| Create | `src/app/api/admin/suggestions/[id]/route.ts` | PUT approve/reject/duplicate |
| Create | `src/app/(admin)/admin/suggestions/page.tsx` | Admin review UI |
| Create | `src/lib/ai/emotions.ts` | Scraping + Gemini emotion analysis |
| Create | `src/app/api/ai/emotions/route.ts` | POST analyze all markets |
| Create | `src/app/api/ai/emotions/[marketId]/route.ts` | GET emotion history for market |
| Create | `src/components/emotion-widget.tsx` | Market detail sentiment UI |
| Create | `src/app/(admin)/admin/page.tsx` | Admin dashboard overview |
| Modify | `src/app/(admin)/layout.tsx` | Add NewsAutoPoller + Suggestions nav item |
| Modify | `src/lib/pricing/engine.ts` | Add Component 4: sentiment nudge |
| Modify | `src/lib/ai/predict-market.ts` | Add emotion context to prompt |
| Modify | `src/app/(protected)/markets/[slug]/page.tsx` | Add EmotionWidget below AIAnalysisSection |
| Modify | `vercel.json` | Add 2 new cron entries |

---

## Task 1: Database Setup

**Files:** None (SQL only — run in Supabase SQL Editor)

- [ ] **Step 1: Run SQL in Supabase SQL Editor**

Navigate to your Supabase project → SQL Editor → New query. Paste and run:

```sql
-- AI-suggested markets (waiting for admin approval)
CREATE TABLE market_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  suggested_slug TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('politics', 'sports', 'entertainment', 'fashion')),
  suggested_probability INT CHECK (suggested_probability >= 1 AND suggested_probability <= 99),
  reasoning TEXT,
  source_news_ids UUID[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  resolution_deadline TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Twitter/X emotion tracking per topic
CREATE TABLE topic_emotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  market_id UUID REFERENCES markets(id),
  positive_pct FLOAT DEFAULT 0,
  negative_pct FLOAT DEFAULT 0,
  neutral_pct FLOAT DEFAULT 0,
  anger FLOAT DEFAULT 0,
  hope FLOAT DEFAULT 0,
  fear FLOAT DEFAULT 0,
  excitement FLOAT DEFAULT 0,
  sarcasm FLOAT DEFAULT 0,
  sample_posts JSONB DEFAULT '[]',
  post_count INT DEFAULT 0,
  sentiment_summary TEXT,
  momentum TEXT CHECK (momentum IN ('surging_positive', 'rising', 'stable', 'declining', 'surging_negative')),
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_market_suggestions_status ON market_suggestions(status, created_at DESC);
CREATE INDEX idx_topic_emotions_market ON topic_emotions(market_id, analyzed_at DESC);
CREATE INDEX idx_topic_emotions_topic ON topic_emotions(topic, analyzed_at DESC);
```

- [ ] **Step 2: Verify tables exist**

In Supabase → Table Editor, confirm `market_suggestions` and `topic_emotions` appear in the table list.

---

## Task 2: Auto-Ingest GET Route

**Files:**
- Create: `src/app/api/news/auto-ingest/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
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
```

- [ ] **Step 2: Verify in dev**

Start the dev server if not running: `npm run dev`

In a new terminal:
```bash
curl "http://localhost:3000/api/news/auto-ingest?secret=dev" 2>/dev/null
```
Expected output: `{"ingested":N,"skipped":N,"errors":N,"timestamp":"...","nextRun":"10 minutes"}`
(In dev mode the secret check is bypassed)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/news/auto-ingest/route.ts
git commit -m "feat: add GET /api/news/auto-ingest for client-side poller"
```

---

## Task 3: NewsAutoPoller Component

**Files:**
- Create: `src/components/news-auto-poller.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/news-auto-poller.tsx
"use client";

import { useEffect, useRef } from "react";

// Invisible component — polls news ingestion every 10 minutes.
// Only runs when an admin tab is open. Vercel Cron handles it otherwise.
export function NewsAutoPoller() {
  const isRunning = useRef(false);

  async function runIngestion() {
    if (isRunning.current) return;
    isRunning.current = true;
    try {
      await fetch(
        `/api/news/auto-ingest?secret=${process.env.NEXT_PUBLIC_CRON_SECRET ?? "dev"}`
      );
    } catch {
      // Silent — cron will catch up
    }
    isRunning.current = false;
  }

  useEffect(() => {
    runIngestion();
    const interval = setInterval(runIngestion, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/news-auto-poller.tsx
git commit -m "feat: add NewsAutoPoller client component"
```

---

## Task 4: Wire Auto-Poller + Sidebar + vercel.json

**Files:**
- Modify: `src/app/(admin)/layout.tsx`
- Modify: `vercel.json`

- [ ] **Step 1: Add NewsAutoPoller to admin layout and Suggestions nav item**

Open `src/app/(admin)/layout.tsx`.

Add the import at the top (after existing imports):
```typescript
import { NewsAutoPoller } from "@/components/news-auto-poller";
```

In the `ADMIN_NAV` array, add a new entry between "AI Predictions" and "Correspondents":
```typescript
{
  href: "/admin/suggestions",
  label: "Suggestions",
  icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/>
      <path d="M12 8v4l3 3"/>
    </svg>
  ),
},
{
  href: "/admin/emotions",
  label: "Emotions",
  icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
},
```

In the `AdminShell` component, add `<NewsAutoPoller />` just before `{children}` inside the `<main>` element:
```typescript
<main className="flex-1 md:ml-[220px]" style={{ minHeight: "calc(100vh - 64px)" }}>
  <NewsAutoPoller />
  {children}
</main>
```

- [ ] **Step 2: Update vercel.json**

Replace the contents of `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/news/ingest",       "schedule": "*/10 * * * *" },
    { "path": "/api/ai/predict-all",    "schedule": "0 */4 * * *"  },
    { "path": "/api/ai/suggest-markets","schedule": "0 */6 * * *"  },
    { "path": "/api/ai/emotions",       "schedule": "0 */2 * * *"  }
  ]
}
```

Note: Vercel cron paths cannot use `?secret=` query params directly in vercel.json for free-tier projects. The suggest-markets and emotions routes accept GET as well (add GET handler in Task 6 and Task 10 with secret param) or configure the secret via Vercel environment variables. For now add the paths — update with your actual secret strategy before deploying.

- [ ] **Step 3: Add NEXT_PUBLIC_CRON_SECRET to .env.local**

Open `.env.local` and add (same value as your existing `CRON_SECRET`):
```
NEXT_PUBLIC_CRON_SECRET=your_cron_secret_value_here
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(admin)/layout.tsx vercel.json .env.local
git commit -m "feat: wire NewsAutoPoller into admin layout, add Suggestions/Emotions sidebar nav, update vercel.json crons"
```

---

## Task 5: Market Suggestions Lib

**Files:**
- Create: `src/lib/ai/suggest-markets.ts`

- [ ] **Step 1: Create the lib**

```typescript
// src/lib/ai/suggest-markets.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai/suggest-markets.ts
git commit -m "feat: add suggestMarketsFromNews lib (Gemini reads news → suggests markets)"
```

---

## Task 6: Suggest-Markets API Route

**Files:**
- Create: `src/app/api/ai/suggest-markets/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/ai/suggest-markets/route.ts
import { NextResponse } from "next/server";
import { suggestMarketsFromNews } from "@/lib/ai/suggest-markets";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (
    secret !== process.env.CRON_SECRET &&
    process.env.NODE_ENV !== "development"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const markets = await suggestMarketsFromNews();
    return NextResponse.json({ suggested: markets.length, markets });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Also support GET for Vercel cron
export async function GET(request: Request) {
  return POST(request);
}
```

- [ ] **Step 2: Test via curl (dev)**

```bash
curl -X POST "http://localhost:3000/api/ai/suggest-markets?secret=dev" 2>/dev/null
```
Expected: `{"suggested":N,"markets":["Will...","Will..."]}` (requires news_stories data in Supabase)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/suggest-markets/route.ts
git commit -m "feat: add POST /api/ai/suggest-markets cron route"
```

---

## Task 7: Admin Suggestions API Routes (GET list + PUT update)

**Files:**
- Create: `src/app/api/admin/suggestions/route.ts`
- Create: `src/app/api/admin/suggestions/[id]/route.ts`

- [ ] **Step 1: Create GET /api/admin/suggestions**

```typescript
// src/app/api/admin/suggestions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: msg.includes("Forbidden") ? 403 : 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status"); // optional filter

  let query = sb
    .from("market_suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with source news titles
  const suggestions = await Promise.all(
    (data ?? []).map(async (s: Record<string, unknown>) => {
      const sourceNewsIds = (s.source_news_ids as string[]) ?? [];
      if (sourceNewsIds.length === 0) return { ...s, source_news: [] };

      const { data: newsItems } = await sb
        .from("news_stories")
        .select("id, title, source_url")
        .in("id", sourceNewsIds);

      return { ...s, source_news: newsItems ?? [] };
    })
  );

  return NextResponse.json({ suggestions });
}
```

- [ ] **Step 2: Create PUT /api/admin/suggestions/[id]**

```typescript
// src/app/api/admin/suggestions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let admin: Profile;
  try {
    admin = await requireAdmin(request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: msg.includes("Forbidden") ? 403 : 401 });
  }

  const body = await request.json() as {
    status: "approved" | "rejected" | "duplicate";
  };

  if (!["approved", "rejected", "duplicate"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Fetch the suggestion
  const { data: suggestion, error: fetchErr } = await sb
    .from("market_suggestions")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchErr || !suggestion) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }

  // If approving: create the market first
  if (body.status === "approved") {
    const { error: marketErr } = await sb.from("markets").insert({
      question:            suggestion.question,
      slug:                suggestion.suggested_slug,
      category:            suggestion.category ?? "politics",
      yes_price:           suggestion.suggested_probability ?? 50,
      no_price:            100 - (suggestion.suggested_probability ?? 50),
      description:         suggestion.description,
      keywords:            suggestion.keywords ?? [],
      resolution_deadline: suggestion.resolution_deadline,
      status:              "open",
      total_volume:        0,
      total_trades:        0,
      participant_count:   0,
    });

    if (marketErr) {
      return NextResponse.json(
        { error: `Market creation failed: ${marketErr.message}` },
        { status: 500 }
      );
    }
  }

  // Update suggestion status
  const { data: updated, error: updateErr } = await sb
    .from("market_suggestions")
    .update({
      status:      body.status,
      reviewed_by: (admin as Profile & { id: string }).id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ suggestion: updated });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/suggestions/route.ts src/app/api/admin/suggestions/[id]/route.ts
git commit -m "feat: add admin suggestions API (GET list, PUT approve/reject/duplicate)"
```

---

## Task 8: Admin Suggestions Page

**Files:**
- Create: `src/app/(admin)/admin/suggestions/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// src/app/(admin)/admin/suggestions/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/toast";

interface SourceNews { id: string; title: string; source_url: string }

interface Suggestion {
  id: string;
  question: string;
  suggested_slug: string;
  category: string;
  suggested_probability: number;
  reasoning: string;
  description: string;
  keywords: string[];
  resolution_deadline: string;
  status: "pending" | "approved" | "rejected" | "duplicate";
  source_news: SourceNews[];
  created_at: string;
}

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  politics:      { bg: "rgba(123,47,190,0.18)", color: "#C4B5FD" },
  sports:        { bg: "rgba(0,150,136,0.15)",  color: "#4DB6AC" },
  entertainment: { bg: "rgba(244,114,182,0.15)", color: "#F472B6" },
  fashion:       { bg: "rgba(255,179,0,0.12)",  color: "#FFB300" },
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60)  return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function SuggestionsPage() {
  const showToast = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeTab !== "all" ? `?status=${activeTab}` : "";
      const res = await fetch(`/api/admin/suggestions${params}`);
      const data = await res.json() as { suggestions: Suggestion[] };
      setSuggestions(data.suggestions ?? []);
    } catch {
      showToast("Failed to load suggestions", "error");
    }
    setLoading(false);
  }, [activeTab, showToast]);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/suggest-markets?secret=dev", { method: "POST" });
      const data = await res.json() as { suggested: number };
      showToast(`Generated ${data.suggested} new suggestions`, "success");
      await load();
    } catch {
      showToast("Generation failed", "error");
    }
    setGenerating(false);
  }

  async function updateStatus(id: string, status: "approved" | "rejected" | "duplicate") {
    setActionLoading(id + status);
    try {
      const res = await fetch(`/api/admin/suggestions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json() as { error?: string; suggestion?: Suggestion };
      if (!res.ok) throw new Error(data.error ?? "Failed");

      if (status === "approved") {
        showToast(`Market created: "${suggestions.find(s => s.id === id)?.question?.slice(0, 50)}..."`, "success");
      } else {
        showToast(`Suggestion ${status}`, "success");
      }
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      showToast(String(err), "error");
    }
    setActionLoading(null);
  }

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  const tabs = ["pending", "approved", "rejected", "all"] as const;

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <h1 className="text-white text-[22px] font-bold">AI Market Suggestions</h1>
          </div>
          <p className="text-[13px] mt-0.5" style={{ color: "#8888A0" }}>
            Gemini analyzed today&apos;s news and suggests these new markets
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #9333ea, #7c3aed)", color: "white" }}
        >
          {generating ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Generating…
            </>
          ) : "✨ Generate New Suggestions"}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {pendingCount > 0 && (
          <span className="text-[12px] font-bold px-3 py-1 rounded-full"
            style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
            {pendingCount} pending review
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E", width: "fit-content" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-all"
            style={{
              background: activeTab === tab ? "#9333ea" : "transparent",
              color: activeTab === tab ? "white" : "#8888A0",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 200, background: "#0D0D1A", border: "1px solid #1E1E2E" }} />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#8888A0" }}>
          <p className="text-[15px]">No {activeTab !== "all" ? activeTab : ""} suggestions</p>
          <p className="text-[12px] mt-1">Click &quot;Generate New Suggestions&quot; to analyze today&apos;s news</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((s) => {
            const catStyle = CAT_COLORS[s.category] ?? CAT_COLORS.politics;
            return (
              <div
                key={s.id}
                className="rounded-2xl p-5"
                style={{
                  background: "#0D0D1A",
                  border: "1px solid #1E1E2E",
                  borderLeft: "4px solid #9333ea",
                }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-white font-bold text-[16px] leading-snug flex-1">{s.question}</p>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                    style={catStyle}>{s.category}</span>
                </div>

                {/* Probability + reasoning */}
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-[32px] font-black" style={{ color: "#9333ea", fontFamily: "var(--font-space-mono, monospace)" }}>
                    {s.suggested_probability}%
                  </span>
                  <p className="text-[12px] flex-1" style={{ color: "#8888A0" }}>{s.reasoning}</p>
                </div>

                {/* Description */}
                {s.description && (
                  <p className="text-[12px] mb-3" style={{ color: "#6666A0" }}>{s.description}</p>
                )}

                {/* Keywords */}
                {s.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {s.keywords.map((kw) => (
                      <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(147,51,234,0.12)", color: "#C4B5FD" }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Deadline + age */}
                <div className="flex items-center gap-3 mb-3 text-[11px]" style={{ color: "#555577" }}>
                  {s.resolution_deadline && <span>Resolves: {s.resolution_deadline}</span>}
                  <span>·</span>
                  <span>{timeAgo(s.created_at)}</span>
                </div>

                {/* Source news */}
                {s.source_news?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#555577" }}>Source news</p>
                    <div className="space-y-1">
                      {s.source_news.map((n) => (
                        <a key={n.id} href={n.source_url} target="_blank" rel="noreferrer"
                          className="block text-[11px] truncate transition-colors"
                          style={{ color: "#FF6B35" }}
                          onMouseEnter={(e) => { (e.currentTarget).style.color = "#FF8C42"; }}
                          onMouseLeave={(e) => { (e.currentTarget).style.color = "#FF6B35"; }}>
                          → {n.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {s.status === "pending" && (
                  <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: "1px solid #1E1E2E" }}>
                    <button
                      onClick={() => updateStatus(s.id, "approved")}
                      disabled={actionLoading !== null}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all disabled:opacity-50"
                      style={{ background: "rgba(0,230,118,0.12)", color: "#00E676", border: "1px solid rgba(0,230,118,0.25)" }}>
                      {actionLoading === s.id + "approved" ? "Creating…" : "✓ Approve & Create Market"}
                    </button>
                    <a
                      href={`/admin/markets/create?q=${encodeURIComponent(s.question)}&prob=${s.suggested_probability}&cat=${s.category}&slug=${s.suggested_slug}`}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                      style={{ background: "rgba(99,102,241,0.12)", color: "#818CF8", border: "1px solid rgba(99,102,241,0.25)" }}>
                      ✏️ Edit & Approve
                    </a>
                    <button
                      onClick={() => updateStatus(s.id, "rejected")}
                      disabled={actionLoading !== null}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all disabled:opacity-50"
                      style={{ background: "transparent", color: "#FF5252", border: "1px solid rgba(255,82,82,0.3)" }}>
                      {actionLoading === s.id + "rejected" ? "…" : "✕ Reject"}
                    </button>
                    <button
                      onClick={() => updateStatus(s.id, "duplicate")}
                      disabled={actionLoading !== null}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all disabled:opacity-50"
                      style={{ background: "transparent", color: "#8888A0", border: "1px solid #2A2A3E" }}>
                      {actionLoading === s.id + "duplicate" ? "…" : "⊜ Duplicate"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/admin/suggestions`. The page should load (may show empty state if no suggestions yet). The "Generate New Suggestions" button should trigger the API.

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/suggestions/page.tsx
git commit -m "feat: add admin suggestions page (AI market approval UI)"
```

---

## Task 9: Emotions Lib

**Files:**
- Create: `src/lib/ai/emotions.ts`

- [ ] **Step 1: Create the lib**

```typescript
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

  return posts;
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
      positive_pct:     33,
      negative_pct:     33,
      neutral_pct:      34,
      anger:            0,
      hope:             0,
      fear:             0,
      excitement:       0,
      sarcasm:          0,
      sample_posts:     [],
      post_count:       0,
      sentiment_summary: "No social media data available for this topic.",
      momentum:         "stable",
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
      positive_pct:     (analysis.positive_pct as number) ?? 33,
      negative_pct:     (analysis.negative_pct as number) ?? 33,
      neutral_pct:      (analysis.neutral_pct  as number) ?? 34,
      anger:            emotions.anger      ?? 0,
      hope:             emotions.hope       ?? 0,
      fear:             emotions.fear       ?? 0,
      excitement:       emotions.excitement ?? 0,
      sarcasm:          emotions.sarcasm    ?? 0,
      sample_posts:     quotes.map((t: string) => ({ text: t })),
      post_count:       posts.length,
      sentiment_summary: (analysis.summary as string) ?? "Analysis complete.",
      momentum:         (analysis.momentum as MomentumType) ?? "stable",
    };

    await sb.from("topic_emotions").insert(record);
    return record;
  } catch (err) {
    console.error("Emotion analysis failed:", err);
    return null;
  }
}

export async function analyzeAllMarketEmotions(): Promise<
  { market: string; topic: string; result: EmotionRecord | null }[]
> {
  const { data: markets } = await sb
    .from("markets")
    .select("id, question, keywords")
    .eq("status", "open");

  if (!markets) return [];

  const results: { market: string; topic: string; result: EmotionRecord | null }[] = [];

  for (const market of markets as { id: string; question: string; keywords?: string[] }[]) {
    const topic =
      (market.keywords && market.keywords[0]) ??
      market.question
        .replace(/^Will |^Is |^Does |\?$/g, "")
        .split(" ")
        .slice(0, 4)
        .join(" ");

    const result = await analyzeTopicEmotions(topic, market.id);
    results.push({ market: market.question, topic, result });
    await new Promise((r) => setTimeout(r, 2000));
  }

  return results;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai/emotions.ts
git commit -m "feat: add emotions lib (scrapePublicPosts + analyzeTopicEmotions + analyzeAllMarketEmotions)"
```

---

## Task 10: Emotions API Routes

**Files:**
- Create: `src/app/api/ai/emotions/route.ts`
- Create: `src/app/api/ai/emotions/[marketId]/route.ts`

- [ ] **Step 1: Create POST /api/ai/emotions**

```typescript
// src/app/api/ai/emotions/route.ts
import { NextResponse } from "next/server";
import { analyzeAllMarketEmotions } from "@/lib/ai/emotions";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (
    secret !== process.env.CRON_SECRET &&
    process.env.NODE_ENV !== "development"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await analyzeAllMarketEmotions();
    return NextResponse.json({ analyzed: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Support GET for Vercel cron
export async function GET(request: Request) {
  return POST(request);
}
```

- [ ] **Step 2: Create GET /api/ai/emotions/[marketId]**

```typescript
// src/app/api/ai/emotions/[marketId]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

export async function GET(
  _request: Request,
  { params }: { params: { marketId: string } }
) {
  const { data, error } = await sb
    .from("topic_emotions")
    .select("*")
    .eq("market_id", params.marketId)
    .order("analyzed_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ emotions: [] });
  }

  return NextResponse.json({ emotions: data ?? [] });
}
```

- [ ] **Step 3: Test GET in dev**

```bash
# Replace MARKET_UUID with a real market id from your Supabase markets table
curl "http://localhost:3000/api/ai/emotions/MARKET_UUID" 2>/dev/null
```
Expected: `{"emotions":[]}` (empty until emotion analysis runs)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ai/emotions/route.ts src/app/api/ai/emotions/[marketId]/route.ts
git commit -m "feat: add emotions API routes (POST analyze-all, GET per-market)"
```

---

## Task 11: Emotion Widget Component

**Files:**
- Create: `src/components/emotion-widget.tsx`

- [ ] **Step 1: Create the widget**

```typescript
// src/components/emotion-widget.tsx
"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { MomentumType, EmotionRecord } from "@/lib/ai/emotions";

interface EmotionWidgetProps {
  marketId: string;
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

const MOMENTUM_CONFIG: Record<MomentumType, { label: string; color: string; bg: string }> = {
  surging_positive: { label: "🚀 Surging positive", color: "#00E676", bg: "rgba(0,230,118,0.12)" },
  rising:           { label: "📈 Trending positive", color: "#4DB6AC", bg: "rgba(0,150,136,0.12)" },
  stable:           { label: "➡️ Stable",            color: "#8888A0", bg: "rgba(136,136,160,0.12)" },
  declining:        { label: "📉 Trending negative", color: "#FFB300", bg: "rgba(255,179,0,0.12)" },
  surging_negative: { label: "🔻 Surging negative", color: "#FF5252", bg: "rgba(255,82,82,0.12)" },
};

const EMOTION_CONFIG = [
  { key: "anger",     emoji: "😠", label: "Anger",     color: "#FF5252" },
  { key: "hope",      emoji: "🙏", label: "Hope",      color: "#00E676" },
  { key: "fear",      emoji: "😰", label: "Fear",      color: "#FFB300" },
  { key: "excitement",emoji: "🔥", label: "Excitement", color: "#C4B5FD" },
  { key: "sarcasm",   emoji: "😏", label: "Sarcasm",   color: "#8888A0" },
] as const;

export function EmotionWidget({ marketId }: EmotionWidgetProps) {
  const [emotions, setEmotions] = useState<(EmotionRecord & { analyzed_at: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ai/emotions/${marketId}`)
      .then((r) => r.json())
      .then((d: { emotions: (EmotionRecord & { analyzed_at: string })[] }) => {
        setEmotions(d.emotions ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [marketId]);

  if (loading) {
    return (
      <div className="rounded-2xl p-5 animate-pulse" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E", height: 180 }} />
    );
  }

  if (emotions.length === 0) return null;

  const latest = emotions[0];
  const momentum = MOMENTUM_CONFIG[latest.momentum] ?? MOMENTUM_CONFIG.stable;
  const historyData = [...emotions].reverse().map((e) => ({
    time: new Date(e.analyzed_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
    positive: Math.round(e.positive_pct),
    negative: Math.round(e.negative_pct),
  }));

  return (
    <div className="rounded-2xl p-5" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span className="text-white font-bold text-[14px]">Public Sentiment</span>
        </div>
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: momentum.bg, color: momentum.color }}
        >
          {momentum.label}
        </span>
      </div>
      <p className="text-[11px] mb-4" style={{ color: "#8888A0" }}>What Kenyans are saying on social media</p>

      {/* Stacked sentiment bar */}
      <div className="flex rounded-lg overflow-hidden mb-1" style={{ height: 28 }}>
        <div
          style={{ width: `${latest.positive_pct}%`, background: "#00E676", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {latest.positive_pct >= 15 && (
            <span className="text-[10px] font-bold" style={{ color: "#003300" }}>{Math.round(latest.positive_pct)}%</span>
          )}
        </div>
        <div
          style={{ width: `${latest.neutral_pct}%`, background: "#2A2A3E", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {latest.neutral_pct >= 15 && (
            <span className="text-[10px] font-bold" style={{ color: "#8888A0" }}>{Math.round(latest.neutral_pct)}%</span>
          )}
        </div>
        <div
          style={{ width: `${latest.negative_pct}%`, background: "#FF5252", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {latest.negative_pct >= 15 && (
            <span className="text-[10px] font-bold" style={{ color: "#330000" }}>{Math.round(latest.negative_pct)}%</span>
          )}
        </div>
      </div>
      <div className="flex justify-between text-[10px] mb-5" style={{ color: "#555577" }}>
        <span>Positive {Math.round(latest.positive_pct)}%</span>
        <span>Neutral {Math.round(latest.neutral_pct)}%</span>
        <span>Negative {Math.round(latest.negative_pct)}%</span>
      </div>

      {/* Emotion breakdown */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {EMOTION_CONFIG.map(({ key, emoji, label, color }) => {
          const value = Math.round(latest[key as keyof EmotionRecord] as number);
          return (
            <div key={key} className="rounded-xl p-2 text-center" style={{ background: "#151520", border: "1px solid #1E1E2E" }}>
              <div className="text-[18px] mb-1">{emoji}</div>
              <div className="text-[10px] mb-1.5" style={{ color: "#8888A0" }}>{label}</div>
              <div className="text-[13px] font-bold" style={{ color }}>{value}%</div>
              <div className="mt-1.5 rounded-full overflow-hidden" style={{ height: 3, background: "#1E1E2E" }}>
                <div style={{ width: `${value}%`, height: "100%", background: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <p className="text-[12px] mb-4 italic" style={{ color: "#6666A0" }}>&ldquo;{latest.sentiment_summary}&rdquo;</p>

      {/* Notable quotes */}
      {latest.sample_posts?.length > 0 && (
        <div className="space-y-2 mb-4">
          {latest.sample_posts.slice(0, 3).map((post, i) => (
            <div key={i} className="rounded-lg p-3 text-[11px]" style={{ background: "#151520", border: "1px solid #1E1E2E", color: "#8888A0" }}>
              &ldquo;{post.text}&rdquo;
            </div>
          ))}
        </div>
      )}

      {/* History chart */}
      {historyData.length >= 2 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#555577" }}>Sentiment history</p>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={historyData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00E676" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FF5252" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF5252" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: "#555577", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "#0D0D1A", border: "1px solid #1E1E2E", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "#8888A0" }}
              />
              <Area type="monotone" dataKey="positive" stroke="#00E676" strokeWidth={1.5} fill="url(#posGrad)" name="Positive" />
              <Area type="monotone" dataKey="negative" stroke="#FF5252" strokeWidth={1.5} fill="url(#negGrad)" name="Negative" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px]" style={{ color: "#444466" }}>
        Based on {latest.post_count} posts · Updated {timeAgo(latest.analyzed_at)}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/emotion-widget.tsx
git commit -m "feat: add EmotionWidget component with stacked bar, emotion cards, Recharts history"
```

---

## Task 12: Wire EmotionWidget into Market Detail Page

**Files:**
- Modify: `src/app/(protected)/markets/[slug]/page.tsx`

- [ ] **Step 1: Find where AIAnalysisSection renders**

Open `src/app/(protected)/markets/[slug]/page.tsx`. Search for `AIAnalysisSection`. It renders somewhere in the JSX. The line looks like:
```tsx
<AIAnalysisSection marketId={market.id} />
```

- [ ] **Step 2: Add EmotionWidget import**

At the top of the file, add:
```typescript
import { EmotionWidget } from "@/components/emotion-widget";
```

- [ ] **Step 3: Add EmotionWidget below AIAnalysisSection**

Find the `<AIAnalysisSection marketId={market.id} />` line and add the widget directly after it:
```tsx
<AIAnalysisSection marketId={market.id} />
<EmotionWidget marketId={market.id} />
```

Note: `market.id` refers to whatever variable holds the current market's id in that component. If the variable is named differently (e.g., `currentMarket.id` or `slug`), use the correct id field. The market detail page currently uses `MOCK_MARKETS` — the widget will show empty state until real emotion data exists in Supabase, which is fine.

- [ ] **Step 4: Verify in browser**

Navigate to any market detail page (`http://localhost:3000/markets/some-slug`). The EmotionWidget should render with a loading state, then show empty (no data yet). No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/(protected)/markets/[slug]/page.tsx
git commit -m "feat: add EmotionWidget to market detail page below AI Analysis"
```

---

## Task 13: Pricing Engine — Component 4 (Sentiment Nudge)

**Files:**
- Modify: `src/lib/pricing/engine.ts`

- [ ] **Step 1: Update calculateNewPrice signature and add Component 4**

Open `src/lib/pricing/engine.ts`. The current function signature is:
```typescript
export function calculateNewPrice(
  currentYesPrice: number,
  tradeOutcome:    "yes" | "no",
  tradeSide:       "buy" | "sell",
  quantity:        number,
  aiPrediction?:   number,
): PriceUpdate {
```

Update it to:
```typescript
export function calculateNewPrice(
  currentYesPrice:    number,
  tradeOutcome:       "yes" | "no",
  tradeSide:          "buy" | "sell",
  quantity:           number,
  aiPrediction?:      number,
  sentimentMomentum?: string,
): PriceUpdate {
```

Then find this block (the end of Component 2, before Component 3):
```typescript
  const adjustedPrice = crowdPrice + aiGravity;

  // ── COMPONENT 3: House margin ────────────────────────────────────────────────
```

Replace it with:
```typescript
  // ── COMPONENT 3: Sentiment momentum ─────────────────────────────────────────
  // Nudges price ±1-2 points based on social media momentum.
  // Creates a "living market" feel: surging positive tweets → price drifts up.
  let sentimentNudge = 0;
  if (sentimentMomentum) {
    switch (sentimentMomentum) {
      case "surging_positive": sentimentNudge =  2; break;
      case "rising":           sentimentNudge =  1; break;
      case "declining":        sentimentNudge = -1; break;
      case "surging_negative": sentimentNudge = -2; break;
      default:                 sentimentNudge =  0;
    }
  }

  const adjustedPrice = crowdPrice + aiGravity + sentimentNudge;

  // ── COMPONENT 4: House margin ────────────────────────────────────────────────
```

Also update the comment at the top of the file to reflect 4 components:
```typescript
 * Four signals combine to produce each price update:
 *   1. Crowd demand       — buy/sell pressure (main driver)
 *   2. AI gravity         — gentle pull toward AI prediction (5% per trade)
 *   3. Sentiment momentum — ±1-2 points based on social media trend
 *   4. House margin       — compresses extreme prices (edge near 0 / 100)
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors related to `calculateNewPrice`

- [ ] **Step 3: Commit**

```bash
git add src/lib/pricing/engine.ts
git commit -m "feat: add sentiment momentum as Component 3 in pricing engine (±2pt nudge)"
```

---

## Task 14: AI Prediction — Include Emotion Context

**Files:**
- Modify: `src/lib/ai/predict-market.ts`

- [ ] **Step 1: Add emotion fetch to generatePrediction**

Open `src/lib/ai/predict-market.ts`. Current function starts:
```typescript
export async function generatePrediction(
  market: Market,
  recentNews: NewsStory[]
): Promise<MarketPrediction> {
  const model = getModelName();

  try {
    const client = getAIClient();

    const newsSummary = recentNews
```

Update to:
```typescript
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
```

Then find the user message content string that ends with:
```typescript
Return JSON: {"probability":0-100,"confidence":"low"|"medium"|"high","reasoning":"2-3 sentences","key_factors":["factor1","factor2","factor3"]}`,
```

Insert `${emotionContext}` just before `\n\nReturn JSON`:
```typescript
content: `Market question: "${market.question}"
Current crowd probability: ${market.yes_price}%
Current date: ${new Date().toISOString().split("T")[0]}
Resolution deadline: ${market.resolution_deadline}

Recent related news (${recentNews.length} stories):
${newsSummary || "No related news found."}${emotionContext}

Return JSON: {"probability":0-100,"confidence":"low"|"medium"|"high","reasoning":"2-3 sentences","key_factors":["factor1","factor2","factor3"]}`,
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/predict-market.ts
git commit -m "feat: include emotion context in AI market predictions"
```

---

## Task 15: Admin Dashboard Overview Page

**Files:**
- Create: `src/app/(admin)/admin/page.tsx`

- [ ] **Step 1: Create the dashboard page**

```typescript
// src/app/(admin)/admin/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";

function StatCard({
  label, value, sub, color,
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "#8888A0" }}>{label}</p>
      <p className="text-[24px] font-bold" style={{ color: color ?? "#E8E8F0", fontFamily: "var(--font-space-mono, monospace)" }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "#555577" }}>{sub}</p>}
    </div>
  );
}

interface IngestResult { ingested: number; skipped: number; errors: number; timestamp: string }
interface SuggestResult { suggested: number; markets: string[] }
interface EmotionResult { analyzed: number }

export default function AdminDashboardPage() {
  const showToast = useToast();

  const [ingestResult, setIngestResult]   = useState<IngestResult | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);

  const [suggestResult, setSuggestResult]   = useState<SuggestResult | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [emotionResult, setEmotionResult]   = useState<EmotionResult | null>(null);
  const [emotionLoading, setEmotionLoading] = useState(false);

  async function runIngest() {
    setIngestLoading(true);
    try {
      const res = await fetch(
        `/api/news/auto-ingest?secret=${process.env.NEXT_PUBLIC_CRON_SECRET ?? "dev"}`
      );
      const data = await res.json() as IngestResult;
      setIngestResult(data);
      showToast(`Ingested ${data.ingested} stories`, "success");
    } catch {
      showToast("Ingestion failed", "error");
    }
    setIngestLoading(false);
  }

  async function runSuggest() {
    setSuggestLoading(true);
    try {
      const res = await fetch(
        `/api/ai/suggest-markets?secret=${process.env.NEXT_PUBLIC_CRON_SECRET ?? "dev"}`,
        { method: "POST" }
      );
      const data = await res.json() as SuggestResult;
      setSuggestResult(data);
      showToast(`Generated ${data.suggested} suggestions`, "success");
    } catch {
      showToast("Suggestion generation failed", "error");
    }
    setSuggestLoading(false);
  }

  async function runEmotions() {
    setEmotionLoading(true);
    try {
      const res = await fetch(
        `/api/ai/emotions?secret=${process.env.NEXT_PUBLIC_CRON_SECRET ?? "dev"}`,
        { method: "POST" }
      );
      const data = await res.json() as EmotionResult;
      setEmotionResult(data);
      showToast(`Analyzed ${data.analyzed} markets`, "success");
    } catch {
      showToast("Emotion analysis failed", "error");
    }
    setEmotionLoading(false);
  }

  function RunBtn({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #FF6B35, #FF4500)", color: "white" }}
      >
        {loading ? (
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        )}
        {loading ? "Running…" : label}
      </button>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl space-y-8">
      <h1 className="text-white text-[22px] font-bold">Admin Dashboard</h1>

      {/* ── News Engine ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
            <h2 className="text-white font-bold text-[15px]">News Engine</h2>
            <span className="text-[11px]" style={{ color: "#8888A0" }}>Auto-ingesting every 10 min</span>
          </div>
          <RunBtn loading={ingestLoading} onClick={runIngest} label="Run Now" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Ingested" value={ingestResult?.ingested ?? "—"} color="#00E676"
            sub={ingestResult ? new Date(ingestResult.timestamp).toLocaleTimeString("en-KE") : "no runs yet"} />
          <StatCard label="Skipped"  value={ingestResult?.skipped  ?? "—"} sub="duplicates" />
          <StatCard label="Errors"   value={ingestResult?.errors   ?? "—"}
            color={ingestResult?.errors ? "#FF5252" : "#00E676"} />
          <StatCard label="Sources"  value={14} color="#4DB6AC" sub="RSS + scrape" />
        </div>
      </section>

      {/* ── AI Suggestions ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-bold text-[15px]">AI Market Suggestions</h2>
            <Link href="/admin/suggestions"
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all"
              style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
              Review pending →
            </Link>
          </div>
          <RunBtn loading={suggestLoading} onClick={runSuggest} label="Generate Now" />
        </div>
        {suggestResult ? (
          <div className="rounded-xl p-4 space-y-2" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
            <p className="text-[12px] font-bold" style={{ color: "#00E676" }}>
              Generated {suggestResult.suggested} suggestions this run
            </p>
            {suggestResult.markets.slice(0, 3).map((q, i) => (
              <p key={i} className="text-[12px] truncate" style={{ color: "#8888A0" }}>→ {q}</p>
            ))}
          </div>
        ) : (
          <div className="rounded-xl p-4" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
            <p className="text-[12px]" style={{ color: "#555577" }}>Click &quot;Generate Now&quot; to analyse today&apos;s news and suggest markets.</p>
          </div>
        )}
      </section>

      {/* ── Emotion Monitor ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-[15px]">Emotion Monitor</h2>
          <RunBtn loading={emotionLoading} onClick={runEmotions} label="Analyze All Now" />
        </div>
        {emotionResult ? (
          <div className="rounded-xl p-4" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
            <p className="text-[13px] font-bold" style={{ color: "#00E676" }}>
              Analyzed {emotionResult.analyzed} markets
            </p>
            <p className="text-[12px] mt-1" style={{ color: "#8888A0" }}>
              Emotion data updated. Visit individual market pages to see sentiment widgets.
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-4" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
            <p className="text-[12px]" style={{ color: "#555577" }}>
              Click &quot;Analyze All Now&quot; to scrape social posts for all open markets and run Gemini emotion analysis.
              Runs automatically every 2 hours via cron.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/admin`. The dashboard should render with three sections. Each "Run Now" / "Generate Now" / "Analyze All Now" button should call the respective API and update the section.

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/page.tsx
git commit -m "feat: add admin dashboard overview page (news engine, suggestions, emotions)"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| GET /api/news/auto-ingest | Task 2 |
| NewsAutoPoller client component | Task 3 |
| Add poller to admin layout | Task 4 |
| Update vercel.json | Task 4 |
| suggestMarketsFromNews lib | Task 5 |
| POST /api/ai/suggest-markets | Task 6 |
| GET /api/admin/suggestions | Task 7 |
| PUT /api/admin/suggestions/[id] | Task 7 |
| Admin suggestions page | Task 8 |
| emotions.ts lib | Task 9 |
| POST /api/ai/emotions | Task 10 |
| GET /api/ai/emotions/[marketId] | Task 10 |
| EmotionWidget component | Task 11 |
| Wire widget into market detail page | Task 12 |
| Pricing engine Component 4 | Task 13 |
| predict-market emotion context | Task 14 |
| Admin dashboard sections | Task 15 |
| Admin sidebar: Suggestions link | Task 4 |
| Admin sidebar: Emotions link | Task 4 |
| Database tables (SQL) | Task 1 |

All spec requirements covered.

**Type consistency check:** `EmotionRecord` is defined in `emotions.ts` and imported in `emotion-widget.tsx`. `MomentumType` is exported and used in both. `requireAdmin` returns `Profile` — used consistently in suggestions routes. `calculateNewPrice` new `sentimentMomentum?` param is optional — all existing callers remain valid.

**Placeholder scan:** No TBDs, TODOs, or "similar to Task N" references. All code blocks are complete.
