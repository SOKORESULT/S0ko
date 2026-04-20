import type { MockNews } from "@/lib/mock-data";

const BASE = "https://api.worldnewsapi.com";
const KEY  = process.env.WORLD_NEWS_API_KEY ?? "";

// ─── Raw API shape ────────────────────────────────────────────────────────────

interface WNItem {
  id:            number;
  title:         string;
  text?:         string;
  summary?:      string;
  url?:          string;
  image?:        string;
  video?:        string;
  publish_date?: string;
  author?:       string;
  authors?:      string[];
  language?:     string;
  source_country?: string;
  sentiment?:    number;     // −1 to 1
  category?:     string;     // comma-separated e.g. "politics,business"
}

// ─── Category mapping ─────────────────────────────────────────────────────────

const CAT_KEYWORDS: [string, MockNews["category"]][] = [
  ["sport",         "sports"],
  ["football",      "sports"],
  ["athletics",     "sports"],
  ["cricket",       "sports"],
  ["entertainment", "entertainment"],
  ["music",         "entertainment"],
  ["film",          "entertainment"],
  ["movie",         "entertainment"],
  ["celebrity",     "entertainment"],
  ["fashion",       "fashion"],
  ["style",         "fashion"],
  ["politics",      "politics"],
  ["government",    "politics"],
  ["election",      "politics"],
  ["parliament",    "politics"],
];

function mapCategory(raw?: string): MockNews["category"] {
  if (!raw) return "politics";
  const lower = raw.toLowerCase();
  for (const [kw, cat] of CAT_KEYWORDS) {
    if (lower.includes(kw)) return cat;
  }
  return "politics";
}

function mapUrgency(item: WNItem): number {
  const titleLow = item.title.toLowerCase();
  if (
    titleLow.includes("breaking") ||
    titleLow.includes("urgent") ||
    titleLow.includes("emergency")
  ) return 5;
  const cat = mapCategory(item.category);
  if (cat === "politics") return 4;
  if (cat === "sports")   return 3;
  return 2;
}

function extractHostname(url?: string): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "Kenya News";
  } catch {
    return "Kenya News";
  }
}

export function transformItem(item: WNItem): MockNews {
  const body = item.summary ?? item.text?.slice(0, 400);
  return {
    id:                  `wn_${item.id}`,
    title:               item.title,
    body:                body ? body.slice(0, 400) : undefined,
    source_name:         extractHostname(item.url),
    source_type:         "media",
    source_url:          item.url,
    verification_status: "verified",
    category:            mapCategory(item.category),
    urgency:             mapUrgency(item),
    published_at:        item.publish_date ?? new Date().toISOString(),
    created_at:          item.publish_date ?? new Date().toISOString(),
  };
}

// ─── Public fetchers (server-side only) ───────────────────────────────────────

/** Top news headlines — refreshes every 30 min via Next.js cache */
export async function fetchTopNews(): Promise<MockNews[]> {
  if (!KEY) return [];
  const url = `${BASE}/top-news?source-country=ke&language=en&api-key=${KEY}`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) return [];
  const data = await res.json() as { top_news?: { news?: WNItem[] }[] };
  const items = (data.top_news ?? []).flatMap((g) => g.news ?? []);
  return items.map(transformItem);
}

/** Latest news sorted by publish time — refreshes every 15 min */
export async function fetchLatestNews(number = 40): Promise<MockNews[]> {
  if (!KEY) return [];
  const params = new URLSearchParams({
    "source-country": "ke",
    language:         "en",
    number:           String(number),
    sort:             "publish-time",
    "sort-direction": "DESC",
    "api-key":        KEY,
  });
  const res = await fetch(`${BASE}/search-news?${params}`, { next: { revalidate: 900 } });
  if (!res.ok) return [];
  const data = await res.json() as { news?: WNItem[] };
  return (data.news ?? []).map(transformItem);
}

/** News for a specific category — refreshes every 20 min */
export async function fetchNewsByCategory(
  category: "politics" | "sports" | "entertainment" | "fashion",
  number = 20,
): Promise<MockNews[]> {
  if (!KEY) return [];
  const params = new URLSearchParams({
    "source-country": "ke",
    language:         "en",
    categories:       category,
    number:           String(number),
    sort:             "publish-time",
    "sort-direction": "DESC",
    "api-key":        KEY,
  });
  const res = await fetch(`${BASE}/search-news?${params}`, { next: { revalidate: 1200 } });
  if (!res.ok) return [];
  const data = await res.json() as { news?: WNItem[] };
  return (data.news ?? []).map(transformItem);
}

/** Breaking news (urgency ≥ 4) — uses top-news + filters */
export async function fetchBreakingNews(): Promise<MockNews[]> {
  const top = await fetchTopNews();
  return top.filter((n) => n.urgency >= 4).slice(0, 10);
}
