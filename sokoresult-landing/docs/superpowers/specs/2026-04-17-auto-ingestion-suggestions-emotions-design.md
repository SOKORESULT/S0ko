# SokoResult: Auto-Ingestion, AI Market Suggestions & Emotion Monitoring

**Date:** 2026-04-17
**Status:** Approved

---

## Overview

Three new features added to the existing SokoResult Next.js prediction-market platform:

1. **Fully automated news ingestion** — client-side poller triggers ingestion every 10 min when an admin is online; Vercel cron handles it when no one is
2. **AI market suggestions** — Gemini reads ingested news and proposes new prediction markets for admin approval
3. **Twitter/X emotion monitoring** — scrapes public social posts per market topic, runs Gemini sentiment analysis, feeds results into AI predictions and pricing

All features follow existing patterns: Gemini 2.0 Flash via OpenAI compat layer, `supabaseAdmin` for DB writes, dark UI (`#080810` background, `#FF6B35` orange accent, `#1E1E2E` borders).

---

## Database (run in Supabase SQL Editor before implementation)

```sql
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

---

## Feature 1: Auto-Ingestion

### Decision
New `GET /api/news/auto-ingest` route (separate from existing `POST /api/news/ingest`) so the client-side polling path is clearly distinct from the Vercel cron path.

### New files

**`src/app/api/news/auto-ingest/route.ts`**
- `export const dynamic = 'force-dynamic'`, `maxDuration = 60`
- `GET` handler; auth via `?secret=` query param (dev bypass when `NODE_ENV === 'development'`)
- Same pipeline as existing ingest: `scrapeRSSFeeds` + `scrapeWebSources` → `classifyStory` → `linkStoryToMarkets` → `determineVerificationTier` → insert into `news_stories`
- Dedupe: check `source_url` exact match first, then title prefix ilike
- 300ms delay between AI calls to stay within Gemini rate limits
- Returns `{ ingested, skipped, errors, timestamp, nextRun: '10 minutes' }`

**`src/components/news-auto-poller.tsx`**
- `'use client'` invisible component (renders `null`)
- On mount: call `runIngestion()` immediately, then `setInterval(runIngestion, 10 * 60 * 1000)`
- `runIngestion` fetches `GET /api/news/auto-ingest?secret=${NEXT_PUBLIC_CRON_SECRET}`
- Guards against concurrent runs with `isRunning` flag
- Added to `src/app/(admin)/layout.tsx` inside `<AdminShell>`

### Updated files

**`vercel.json`** — add two new cron entries:
```json
{ "path": "/api/ai/suggest-markets?secret=...", "schedule": "0 */6 * * *" },
{ "path": "/api/ai/emotions?secret=...", "schedule": "0 */2 * * *" }
```
Keep existing `/api/news/ingest` (*/10) and `/api/ai/predict-all` (0 */4) entries.

**`.env.local`** — add `NEXT_PUBLIC_CRON_SECRET` (same value as `CRON_SECRET`)

---

## Feature 2: AI Market Suggestions

### New lib: `src/lib/ai/suggest-markets.ts`

`suggestMarketsFromNews()`:
1. Fetch last 24h of `news_stories` ordered by urgency desc, limit 30
2. Fetch existing `markets.question` (open + closed) and pending `market_suggestions.question` to build dedupe lists
3. Build numbered news context string + existing questions list
4. Call Gemini 2.0 Flash — system prompt: Kenyan prediction market creator, returns JSON array of 3–5 suggestions with `question`, `category`, `probability`, `reasoning`, `resolution_deadline`, `description`, `keywords`, `source_news_indices`
5. For each suggestion: skip if question overlaps with existing (first 30 chars), generate slug, map `source_news_indices` → actual UUIDs, insert into `market_suggestions`
6. Returns array of inserted question strings

Probability clamped to 5–95.

### New API routes

**`POST /api/ai/suggest-markets`**
- Secret query-param auth; `maxDuration = 30`
- Calls `suggestMarketsFromNews()`
- Returns `{ suggested: number, markets: string[] }`

**`GET /api/admin/suggestions`**
- Admin auth (verify `profile.is_admin` via supabaseAdmin)
- Optional `?status=` filter
- Returns suggestions joined with news titles for `source_news_ids`

**`PUT /api/admin/suggestions/[id]`**
- Admin auth
- Body: `{ status: 'approved' | 'rejected' | 'duplicate' }`
- If `approved`: insert into `markets` table using suggestion fields (`question`, `suggested_slug` → `slug`, `category`, `suggested_probability` → `yes_price`, `description`, `keywords`, `resolution_deadline`), then update suggestion with `status`, `reviewed_by`, `reviewed_at`
- Returns updated suggestion record

### New admin page: `src/app/(admin)/admin/suggestions/page.tsx`

**Layout:**
- Header: "AI Market Suggestions" with sparkle icon; subtext "Gemini analyzed today's news and suggests these new markets"
- Stats row: pending count (amber badge), markets created from AI (green badge), last analysis time
- "Generate New Suggestions" button → `POST /api/ai/suggest-markets`
- Filter tabs: Pending | Approved | Rejected | All

**Suggestion card:**
- Purple left-border accent (`#9333ea`)
- Question (18px bold white), category badge, probability (large number), reasoning
- Description (resolution criteria), keyword pills, resolution deadline
- Source news list (clickable links to `/admin/news`)
- Four action buttons: Approve & Create (green), Edit & Approve (blue, navigates to create form with query params), Reject (red outline), Duplicate (gray)

**Admin sidebar** (`layout.tsx`): add "Suggestions" nav item at `/admin/suggestions` with sparkle icon, between "AI Predictions" and "Correspondents".

---

## Feature 3: Emotion Monitoring

### New lib: `src/lib/ai/emotions.ts`

**Separate from `scrapeXSentiment` in scraper.ts** — decoupled module.

`scrapePublicPosts(topic: string): Promise<string[]>`
- Method 1: Nitter instances (nitter.poast.org, nitter.privacydev.net, nitter.cz) — search `topic + ' kenya'`, parse `.tweet-content` / `.tweet-body`
- Method 2 (if < 5 posts): Google search for `topic + ' kenya site:twitter.com OR site:reddit.com'`, parse `h3` + `.BNeawe`
- Method 3 (if still < 5): Reddit r/Kenya search, parse post titles
- Returns deduplicated posts, each 20–500 chars

`analyzeTopicEmotions(topic: string, marketId?: string)`
- Calls `scrapePublicPosts`
- If 0 posts: inserts neutral placeholder record (33/33/34, all emotions 0, momentum 'stable') and returns it
- Otherwise: sends posts to Gemini with Kenyan slang/Sheng context prompt, parses JSON response for `positive_pct`, `negative_pct`, `neutral_pct`, `emotions` object, `momentum`, `summary`, `notable_quotes`
- Inserts into `topic_emotions`, returns record

`analyzeAllMarketEmotions()`
- Fetches all open markets
- Derives topic: first keyword or first 4 words of question stripped of common prefixes
- Calls `analyzeTopicEmotions` per market with 2s delay between calls
- Returns results array

### New API routes

**`POST /api/ai/emotions`**
- Secret auth; `maxDuration = 120`
- Calls `analyzeAllMarketEmotions()`
- Returns `{ analyzed: number, results }`

**`GET /api/ai/emotions/[marketId]`**
- Public (no auth required)
- Returns last 5 `topic_emotions` records for the market, ordered by `analyzed_at` desc

### New component: `src/components/emotion-widget.tsx`

Props: `{ marketId: string }`

Fetches `GET /api/ai/emotions/[marketId]` on mount. Shows loading skeleton, then:

1. **Header** — "Public Sentiment" with Heart icon; subtext "What Kenyans are saying on social media"
2. **Stacked bar** — horizontal, green/gray/red segments proportional to positive/neutral/negative pct; labels inside if segment wide enough
3. **Emotion cards row** — 5 cards: Anger (red), Hope (green), Fear (amber), Excitement (purple), Sarcasm (gray) — each with emoji, label, mini progress bar
4. **Momentum badge** — surging_positive "🚀 Surging positive" | rising "📈 Trending positive" | stable "➡️ Stable" | declining "📉 Trending negative" | surging_negative "🔻 Surging negative"
5. **Summary text** — AI's sentiment sentence (muted color)
6. **Notable quotes** — 2–3 quote cards with quotation marks
7. **Footer** — "Based on X posts • Updated Y ago"
8. **History chart** — if 2+ records exist: Recharts `AreaChart` (small, ~120px tall) showing positive (green) and negative (red) over time

Placed on market detail page below the AI Analysis card.

---

## Feature 4: Integration Updates

### Pricing engine: `src/lib/pricing/engine.ts`

`calculateNewPrice` signature gains optional `sentimentMomentum?: string` param.

After Component 2 (AI gravity), before Component 3 (house margin):

```
Component 4: Sentiment momentum
surging_positive → +2
rising           → +1
stable           →  0
declining        → -1
surging_negative → -2
```

`adjustedPrice += sentimentNudge` before the house margin clamp.

Return type `PriceUpdate` stays the same (nudge is folded into the existing flow).

### AI prediction: `src/lib/ai/predict-market.ts`

`generatePrediction(market, recentNews)` gains optional `marketId` param (defaults to `market.id`).

Before building the prompt: fetch latest `topic_emotions` record for `market.id`.

Append to user content string:
```
Public sentiment analysis:
- Positive: X% | Negative: Y%
- Momentum: [value]
- Key emotion: [sentiment_summary]
- Based on N social media posts
```

If no emotion record exists, prompt is unchanged.

---

## Admin Dashboard Updates

**`src/app/(admin)/admin/page.tsx`** (create if it doesn't exist, or update existing):

Three status sections:

1. **News Engine** — last ingestion time, result stats, "Run Now" button, green dot "Auto-ingesting every 10 min"
2. **AI Market Suggestions** — pending count (amber, links to /admin/suggestions), "Generate Suggestions Now" button, last 3 suggestions preview
3. **Emotion Monitor** — "Analyze All Now" button, table of market | positive% | negative% | momentum | last updated, sorted by most volatile (highest absolute change from 50%)

---

## File Map

| New/Updated | Path |
|---|---|
| New | `src/app/api/news/auto-ingest/route.ts` |
| New | `src/components/news-auto-poller.tsx` |
| New | `src/lib/ai/suggest-markets.ts` |
| New | `src/app/api/ai/suggest-markets/route.ts` |
| New | `src/app/api/admin/suggestions/route.ts` |
| New | `src/app/api/admin/suggestions/[id]/route.ts` |
| New | `src/app/(admin)/admin/suggestions/page.tsx` |
| New | `src/lib/ai/emotions.ts` |
| New | `src/app/api/ai/emotions/route.ts` |
| New | `src/app/api/ai/emotions/[marketId]/route.ts` |
| New | `src/components/emotion-widget.tsx` |
| Updated | `src/app/(admin)/layout.tsx` (sidebar + NewsAutoPoller) |
| Updated | `src/app/(admin)/admin/page.tsx` (dashboard sections) |
| Updated | `src/lib/pricing/engine.ts` (Component 4) |
| Updated | `src/lib/ai/predict-market.ts` (emotion context) |
| Updated | `vercel.json` (2 new cron entries) |
| Updated | `.env.local` (NEXT_PUBLIC_CRON_SECRET) |

---

## Constraints & Notes

- No new npm dependencies needed — axios, cheerio, openai, recharts all already installed
- Nitter instances are unreliable; the 3-method fallback in emotions.ts gracefully degrades to a neutral placeholder
- Vercel cron paths with `?secret=` must use the literal secret value (not an env var reference) in vercel.json
- The `NewsAutoPoller` only runs when an admin tab is open — Vercel cron provides coverage the rest of the time
- Market approval inserts directly into `markets` via supabaseAdmin — no separate market creation API call
