import axios from "axios";
import * as cheerio from "cheerio";
import Parser from "rss-parser";

export interface ScrapedStory {
  title:       string;
  body:        string;
  url:         string;
  imageUrl?:   string;
  publishedAt: string;
  source:      string;
  sourceType:  "mainstream" | "digital" | "specialized";
}

// ─── RSS sources ──────────────────────────────────────────────────────────────

const RSS_SOURCES = [
  { url: "https://nation.africa/kenya/rss",               name: "Nation Africa",       type: "mainstream"  as const },
  { url: "https://www.standardmedia.co.ke/rss",           name: "The Standard",        type: "mainstream"  as const },
  { url: "https://www.capitalfm.co.ke/news/feed",         name: "Capital FM",          type: "mainstream"  as const },
  { url: "https://www.businessdailyafrica.com/rss",       name: "Business Daily",      type: "specialized" as const },
  { url: "https://kenyans.co.ke/feeds/news",              name: "Kenyans.co.ke",       type: "digital"     as const },
  { url: "https://www.the-star.co.ke/rss",                name: "The Star",            type: "mainstream"  as const },
  { url: "https://kenyanews.go.ke/feed",                  name: "Kenya News Agency",   type: "mainstream"  as const },
  { url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml", name: "BBC Africa",    type: "mainstream"  as const },
  { url: "https://www.africanews.com/feed/rss",           name: "Africanews",          type: "mainstream"  as const },
];

// ─── Web-scrape sources ────────────────────────────────────────────────────────

const SCRAPE_SOURCES = [
  {
    name: "Citizen Digital",
    url:  "https://www.citizen.digital/news",
    type: "mainstream" as const,
    selectors: { articles: "article, .article-card, [class*='article']", title: "h2, h3, .title, .headline", link: "a", image: "img", snippet: "p, .summary, .excerpt" },
  },
  {
    name: "Tuko.co.ke",
    url:  "https://www.tuko.co.ke/kenya/",
    type: "digital" as const,
    selectors: { articles: "article, .c-article-card, [class*='article']", title: "h2, h3, .c-article-card__title", link: "a", image: "img", snippet: "p, .c-article-card__description" },
  },
  {
    name: "Mpasho",
    url:  "https://mpasho.co.ke/",
    type: "specialized" as const,
    selectors: { articles: "article, .post, [class*='post']", title: "h2, h3, .entry-title", link: "a", image: "img", snippet: "p, .entry-summary" },
  },
  {
    name: "Nairobi News",
    url:  "https://nairobinews.nation.africa/",
    type: "specialized" as const,
    selectors: { articles: "article, .story-card, [class*='article']", title: "h2, h3, .title", link: "a", image: "img", snippet: "p, .summary" },
  },
  {
    name: "People Daily",
    url:  "https://www.pd.co.ke/",
    type: "mainstream" as const,
    selectors: { articles: "article, .post, [class*='article']", title: "h2, h3, .entry-title", link: "a", image: "img", snippet: "p, .entry-content" },
  },
];

// ─── RSS scraper ──────────────────────────────────────────────────────────────

export async function scrapeRSSFeeds(): Promise<ScrapedStory[]> {
  const parser = new Parser({ timeout: 10000 });
  const stories: ScrapedStory[] = [];

  for (const source of RSS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of (feed.items ?? []).slice(0, 15)) {
        if (!item.title) continue;
        stories.push({
          title:       item.title.trim(),
          body:        (item.contentSnippet ?? item.content ?? "").slice(0, 1000).trim(),
          url:         item.link ?? "",
          imageUrl:    item.enclosure?.url ?? extractImageFromContent(item.content ?? ""),
          publishedAt: item.pubDate ?? new Date().toISOString(),
          source:      source.name,
          sourceType:  source.type,
        });
      }
    } catch (err) {
      console.error(`RSS failed for ${source.name}:`, (err as Error).message);
    }
  }
  return stories;
}

// ─── Web scraper ──────────────────────────────────────────────────────────────

export async function scrapeWebSources(): Promise<ScrapedStory[]> {
  const stories: ScrapedStory[] = [];

  for (const source of SCRAPE_SOURCES) {
    try {
      const { data: html } = await axios.get(source.url, {
        timeout: 15000,
        headers: {
          "User-Agent": "SokoResult News Bot/1.0 (https://sokoresult.com; news@sokoresult.com)",
          "Accept":     "text/html",
        },
      });

      const $ = cheerio.load(html as string);
      $(source.selectors.articles).slice(0, 10).each((_, el) => {
        const $el    = $(el);
        const title  = $el.find(source.selectors.title).first().text().trim();
        const link   = $el.find(source.selectors.link).first().attr("href") ?? "";
        const rawImg = $el.find(source.selectors.image).first().attr("src")
                    ?? $el.find(source.selectors.image).first().attr("data-src") ?? "";
        const snippet = $el.find(source.selectors.snippet).first().text().trim().slice(0, 500);

        if (title && title.length > 10) {
          const fullUrl   = link.startsWith("http")      ? link   : safeUrl(link,   source.url);
          const fullImage = rawImg && !rawImg.startsWith("data:") && rawImg.startsWith("http")
            ? rawImg
            : rawImg && !rawImg.startsWith("data:") ? safeUrl(rawImg, source.url) : undefined;

          stories.push({
            title,
            body:        snippet,
            url:         fullUrl,
            imageUrl:    fullImage,
            publishedAt: new Date().toISOString(),
            source:      source.name,
            sourceType:  source.type,
          });
        }
      });
    } catch (err) {
      console.error(`Scrape failed for ${source.name}:`, (err as Error).message);
    }
  }
  return stories;
}

// ─── X / Twitter sentiment (public Nitter mirror) ────────────────────────────

export async function scrapeXSentiment(keywords: string[]): Promise<{
  positive: number; negative: number; neutral: number; sampleTweets: string[];
}> {
  const searchQuery = keywords.slice(0, 4).join(" OR ");
  const nitterInstances = [
    "https://nitter.poast.org",
    "https://nitter.privacydev.net",
  ];

  for (const instance of nitterInstances) {
    try {
      const { data: html } = await axios.get(
        `${instance}/search?q=${encodeURIComponent(searchQuery)}&f=tweets`,
        { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } },
      );
      const $ = cheerio.load(html as string);
      const tweets: string[] = [];
      $(".tweet-content, .tweet-body").slice(0, 20).each((_, el) => {
        tweets.push($(el).text().trim());
      });
      if (tweets.length > 0) {
        return { positive: 0, negative: 0, neutral: 0, sampleTweets: tweets.slice(0, 10) };
      }
    } catch {
      // try next instance
    }
  }
  return { positive: 0, negative: 0, neutral: 0, sampleTweets: [] };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractImageFromContent(content: string): string | undefined {
  const m = content.match(/<img[^>]+src="([^"]+)"/);
  return m ? m[1] : undefined;
}

function safeUrl(path: string, base: string): string {
  try { return new URL(path, base).toString(); } catch { return path; }
}
