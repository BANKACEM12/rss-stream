/**
 * Static news ingest — no database, no backend services.
 *
 * Fetches all RSS feeds, dedupes against the previous run, and writes
 * src/data/articles.json which the app bundles at build time.
 *
 * Run:  node scripts/ingest.mjs
 * It is also wired as `prebuild` in package.json and runs every 30 minutes
 * via .github/workflows/refresh-news.yml (commit + push triggers a Lovable redeploy).
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "src", "data");
const ARTICLES_PATH = join(DATA_DIR, "articles.json");
const META_PATH = join(DATA_DIR, "meta.json");

const MAX_ARTICLES = 1200;
const MAX_AGE_DAYS = 45;
const FEED_TIMEOUT_MS = 12_000;
const CONCURRENCY = 6;
const ITEMS_PER_FEED = 15;

/* ------------------------------------------------------------------ */
/* Feed list (mirrors src/lib/sources.ts — the app no longer needs it) */
/* ------------------------------------------------------------------ */

/** @type {{url:string,source:string,siteUrl:string,lang:string,category:string}[]} */
const FEEDS = [
  // ---------- Arabic ----------
  { url: "https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9", source: "الجزيرة", siteUrl: "https://www.aljazeera.net", lang: "ar", category: "world" },
  { url: "https://feeds.bbci.co.uk/arabic/rss.xml", source: "BBC عربي", siteUrl: "https://www.bbc.com/arabic", lang: "ar", category: "world" },
  { url: "https://www.skynewsarabia.com/rss.xml", source: "سكاي نيوز عربية", siteUrl: "https://www.skynewsarabia.com", lang: "ar", category: "world" },
  { url: "https://www.france24.com/ar/%D8%A7%D9%82%D8%AA%D8%B5%D8%A7%D8%AF/rss", source: "فرانس 24", siteUrl: "https://www.france24.com/ar", lang: "ar", category: "business" },
  { url: "https://www.france24.com/ar/%D8%B1%D9%8A%D8%A7%D8%B6%D8%A9/rss", source: "فرانس 24", siteUrl: "https://www.france24.com/ar", lang: "ar", category: "sports" },
  { url: "https://feeds.bbci.co.uk/arabic/scienceandtech/rss.xml", source: "BBC عربي", siteUrl: "https://www.bbc.com/arabic", lang: "ar", category: "science" },
  { url: "https://www.france24.com/ar/rss", source: "فرانس 24", siteUrl: "https://www.france24.com/ar", lang: "ar", category: "world" },
  { url: "https://arabic.rt.com/rss/", source: "RT عربي", siteUrl: "https://arabic.rt.com", lang: "ar", category: "world" },
  { url: "https://www.aitnews.com/feed/", source: "البوابة العربية للتقنية", siteUrl: "https://www.aitnews.com", lang: "ar", category: "tech" },
  { url: "https://www.independentarabia.com/rss.xml", source: "اندبندنت عربية", siteUrl: "https://www.independentarabia.com", lang: "ar", category: "culture" },
  // ---------- English ----------
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC News", siteUrl: "https://www.bbc.com/news", lang: "en", category: "world" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC News", siteUrl: "https://www.bbc.com/news", lang: "en", category: "business" },
  { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", source: "BBC News", siteUrl: "https://www.bbc.com/news", lang: "en", category: "tech" },
  { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", source: "BBC News", siteUrl: "https://www.bbc.com/news", lang: "en", category: "science" },
  { url: "https://feeds.bbci.co.uk/sport/rss.xml", source: "BBC Sport", siteUrl: "https://www.bbc.com/sport", lang: "en", category: "sports" },
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian", siteUrl: "https://www.theguardian.com", lang: "en", category: "world" },
  { url: "https://www.theguardian.com/uk/technology/rss", source: "The Guardian", siteUrl: "https://www.theguardian.com", lang: "en", category: "tech" },
  { url: "https://www.theguardian.com/culture/rss", source: "The Guardian", siteUrl: "https://www.theguardian.com", lang: "en", category: "culture" },
  { url: "https://techcrunch.com/feed/", source: "TechCrunch", siteUrl: "https://techcrunch.com", lang: "en", category: "tech" },
  { url: "https://www.espn.com/espn/rss/news", source: "ESPN", siteUrl: "https://www.espn.com", lang: "en", category: "sports" },
  { url: "https://phys.org/rss-feed/", source: "Phys.org", siteUrl: "https://phys.org", lang: "en", category: "science" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", siteUrl: "https://www.aljazeera.com", lang: "en", category: "world" },
  // ---------- Chinese ----------
  { url: "https://www.chinanews.com.cn/rss/world.xml", source: "中国新闻网", siteUrl: "https://www.chinanews.com.cn", lang: "zh", category: "world" },
  { url: "https://www.chinanews.com.cn/rss/finance.xml", source: "中国新闻网", siteUrl: "https://www.chinanews.com.cn", lang: "zh", category: "business" },
  { url: "https://www.chinanews.com.cn/rss/sports.xml", source: "中国新闻网", siteUrl: "https://www.chinanews.com.cn", lang: "zh", category: "sports" },
  { url: "https://cn.nytimes.com/rss/", source: "纽约时报中文网", siteUrl: "https://cn.nytimes.com", lang: "zh", category: "world" },
  { url: "https://36kr.com/feed", source: "36氪", siteUrl: "https://36kr.com", lang: "zh", category: "tech" },
  { url: "https://www.ithome.com/rss/", source: "IT之家", siteUrl: "https://www.ithome.com", lang: "zh", category: "tech" },
  { url: "https://feedx.net/rss/bbc.xml", source: "BBC 中文", siteUrl: "https://www.bbc.com/zhongwen", lang: "zh", category: "world" },
  { url: "https://www.solidot.org/index.rss", source: "Solidot", siteUrl: "https://www.solidot.org", lang: "zh", category: "science" },
];

/* ------------------------------------------------------------------ */
/* Helpers (ported from src/lib/rss.server.ts + src/lib/keywords.ts)   */
/* ------------------------------------------------------------------ */

function decodeEntities(input) {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return null;
}

function attr(block, pattern) {
  const match = block.match(pattern);
  return match?.[1] ?? null;
}

/** Minimal RSS 2.0 + Atom parser (no dependencies). */
function parseFeed(xml) {
  const blocks = [
    ...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi),
  ].map((m) => m[1] ?? "");

  const items = [];
  for (const block of blocks) {
    const title = tag(block, ["title"]);
    const link =
      tag(block, ["link"]) ||
      attr(block, /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ||
      attr(block, /<link[^>]*href=["']([^"']+)["']/i);
    if (!title || !link) continue;

    const description = tag(block, ["description", "summary", "content:encoded", "content"]) ?? "";
    const pubDate = tag(block, ["pubDate", "published", "updated", "dc:date"]);
    const image =
      attr(block, /<media:(?:content|thumbnail)[^>]*url=["']([^"']+)["']/i) ||
      attr(block, /<enclosure[^>]*url=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i) ||
      attr(block, /<img[^>]*src=["']([^"']+)["']/i);

    items.push({
      guid: tag(block, ["guid", "id"]) || link,
      title,
      link: link.trim(),
      description,
      pubDate,
      image,
    });
  }
  return items;
}

function toIso(pubDate) {
  if (!pubDate) return new Date().toISOString();
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  if (parsed.getTime() > Date.now() + 86_400_000) return new Date().toISOString();
  return parsed.toISOString();
}

function hash(input) {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  return h1.toString(36);
}

const STOPWORDS = new Set(
  ("the,a,an,and,or,but,if,of,at,by,for,with,about,against,between,into,through,during," +
    "before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,then," +
    "once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own," +
    "same,so,than,too,very,can,will,just,should,now,is,are,was,were,be,been,being,have," +
    "has,had,do,does,did,this,that,these,those,it,its,as,he,she,they,we,you,his,her,their," +
    "our,your,says,said,new,after,amid," +
    "في,من,على,عن,إلى,الى,مع,هذا,هذه,ذلك,التي,الذي,كان,كانت,بعد,قبل,بين,خلال,حول,أن,إن," +
    "ان,ما,لا,لم,لن,قد,كل,هو,هي,هم,به,بها,له,لها,أو,او,ثم,حتى,عند,منذ,أمام,ضد,دون,غير,أيضا,أيضاً"
  ).split(",")
);
const SPLIT = /[^\p{L}\p{N}]+/u;

function extractKeywords(text, limit = 6) {
  const counts = new Map();
  for (const raw of text.toLowerCase().split(SPLIT)) {
    const word = raw.trim();
    if (word.length < 2) continue;
    if (STOPWORDS.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

function slugify(text, fallback) {
  let base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ـ­]/g, "")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length > 60) {
    const cut = base.slice(0, 60);
    base = (cut.includes("-") ? cut.replace(/-[^-]*$/, "") : cut).replace(/-+$/g, "");
  }
  return `${base || "story"}-${fallback}`;
}

function excerpt(text, max = 200) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/* ------------------------------------------------------------------ */
/* Ingest                                                              */
/* ------------------------------------------------------------------ */

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; NewsPulseBot/1.0; +aggregator, headlines only)",
      accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseFeed(await response.text()).slice(0, ITEMS_PER_FEED);
}

async function runWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { ok: true, value: await fn(items[i]) };
      } catch (error) {
        results[i] = { ok: false, error };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function loadExisting() {
  if (!existsSync(ARTICLES_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(ARTICLES_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  const existing = loadExisting();
  const seen = new Set(existing.map((a) => a.guid));
  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;

  console.log(`[ingest] fetching ${FEEDS.length} feeds (concurrency ${CONCURRENCY})…`);
  const results = await runWithConcurrency(FEEDS, CONCURRENCY, fetchFeed);

  let fetched = 0;
  let added = 0;
  const failures = [];
  const fresh = [];

  results.forEach((result, i) => {
    const feed = FEEDS[i];
    if (!result.ok) {
      failures.push(`${feed.source}: ${result.error.message}`);
      return;
    }
    for (const item of result.value) {
      if (item.title.length <= 8) continue;
      fetched++;
      const guid = `${feed.lang}:${hash(item.guid || item.link)}`;
      if (seen.has(guid)) continue;
      seen.add(guid);
      const summary = excerpt(item.description || item.title, 200);
      fresh.push({
        id: guid,
        guid,
        slug: slugify(item.title, hash(guid)),
        title: excerpt(item.title, 180),
        summary,
        link: item.link,
        source_name: feed.source,
        source_url: feed.siteUrl,
        lang: feed.lang,
        category: feed.category,
        image_url: item.image,
        keywords: extractKeywords(`${item.title} ${summary}`),
        published_at: toIso(item.pubDate),
        body: null,
        body_generated_at: null,
      });
      added++;
    }
  });

  // Merge: fresh first, then existing; drop stale, cap total.
  const merged = [...fresh, ...existing]
    .filter((a) => new Date(a.published_at).getTime() >= cutoff)
    .sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
    .slice(0, MAX_ARTICLES);

  if (merged.length === 0) {
    // Never deploy a build that would wipe the site: keep old data if the
    // network failed everywhere, or write an empty set on first run.
    console.warn("[ingest] WARNING: no articles available after fetch.");
    if (existing.length > 0) {
      console.warn("[ingest] keeping previous articles.json untouched.");
      return;
    }
    writeFileSync(ARTICLES_PATH, "[]");
  } else {
    writeFileSync(ARTICLES_PATH, JSON.stringify(merged));
  }

  writeFileSync(
    META_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        count: merged.length,
        added,
        fetched,
        feeds_ok: results.filter((r) => r.ok).length,
        feeds_failed: failures,
      },
      null,
      2
    )
  );

  console.log(
    `[ingest] done: ${added} new, ${merged.length} total, ` +
      `${results.filter((r) => r.ok).length}/${FEEDS.length} feeds ok`
  );
  if (failures.length) console.warn("[ingest] failures:\n - " + failures.join("\n - "));
}

main().catch((error) => {
  console.error("[ingest] fatal:", error);
  process.exit(1);
});
