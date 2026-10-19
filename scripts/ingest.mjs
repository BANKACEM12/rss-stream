/**
 * Static news ingest — no database, no backend services.
 *
 * Design: PERMANENT archive, nothing is ever deleted (old article URLs
 * keep working forever for SEO).
 *
 * - src/data/articles.json          HOT: last 60 days (cap 4000), for
 *                                   homepage / categories / sitemaps.
 * - src/data/archive/YYYY-MM.json   Monthly shards, append-only. Every
 *                                   article ever ingested lives here.
 * - src/data/archive-index.json     { slug: "YYYY-MM" } for archive lookups.
 * - src/data/meta.json              Run stats.
 *
 * Run:  node scripts/ingest.mjs
 * Wired as `prebuild` in package.json and every 30 minutes via
 * .github/workflows/refresh-news.yml.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "src", "data");
const ARCHIVE_DIR = join(DATA_DIR, "archive");
const ARTICLES_PATH = join(DATA_DIR, "articles.json");
const INDEX_PATH = join(DATA_DIR, "archive-index.json");
const META_PATH = join(DATA_DIR, "meta.json");

const HOT_DAYS = 60;
const HOT_MAX = 4000;
const FEED_TIMEOUT_MS = 12_000;
const CONCURRENCY = 6;
const ITEMS_PER_FEED = 15;

/* ------------------------------------------------------------------ */
/* Feed list (mirrors the old src/lib/sources.ts)                      */
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
/* Helpers (RSS parser + keywords, zero dependencies)                   */
/* ------------------------------------------------------------------ */

function decodeEntities(input) {
  // Decode entities FIRST (two passes catch double-encoded like &amp;quot;),
  // THEN strip tags — otherwise &lt;p&gt; becomes a literal <p> in the text.
  let text = input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  for (let i = 0; i < 2; i++) {
    const prev = text;
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
    if (text === prev) break;
  }
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * One-time cleanup for articles stored before the decode fix:
 * repairs leftover entities and truncated entity tails (e.g. "&q").
 */
function cleanLegacyText(input) {
  if (!input) return input;
  return decodeEntities(input).replace(/&[a-zA-Z]*$/, "").trim();
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

/**
 * Pick the best article image from an RSS item block.
 * Collects every candidate (media:content/thumbnail, enclosures, inline imgs),
 * drops junk (logos, avatars, tracking pixels…), and prefers high-resolution.
 */
function pickImage(block) {
  const candidates = [];
  for (const m of block.matchAll(/<media:(?:content|thumbnail)[^>]*url=["']([^"']+)["']/gi)) {
    candidates.push({ url: m[1], weight: 3 }); // usually the real article photo
  }
  for (const m of block.matchAll(/<enclosure[^>]*url=["']([^"']+)["']/gi)) {
    candidates.push({ url: m[1], weight: 1 });
  }
  for (const m of block.matchAll(/<img[^>]*src=["']([^"']+)["']/gi)) {
    candidates.push({ url: m[1], weight: 0 });
  }

  const JUNK = /logo|icon|avatar|gravatar|pixel|spacer|blank|placeholder|sprite|badge|feedburner|feedproxy|stats|track|doubleclick/i;
  let best = null;
  let bestScore = -Infinity;
  for (const { url, weight } of candidates) {
    if (!url || !url.startsWith("http")) continue;
    if (JUNK.test(url)) continue;
    let score = weight;
    if (/1200|1024|2048|original|large/i.test(url)) score += 3;
    else if (/800|640|medium/i.test(url)) score += 2;
    else if (/\/\d{2,3}\/|\b(150|200|250|thumb|small)\b/i.test(url)) score -= 2;
    if (/\.(jpe?g|png|webp)(\?|$)/i.test(url)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = url;
    }
  }
  return best;
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
    const image = pickImage(block);

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
/* Storage: hot file + monthly archive shards + slug index              */
/* ------------------------------------------------------------------ */

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function monthKey(iso) {
  return iso.slice(0, 7); // "2026-10"
}

function shardPath(month) {
  return join(ARCHIVE_DIR, `${month}.json`);
}

/** In-memory shard cache for this run: month -> { rows, guids:Set, dirty } */
const shardCache = new Map();

function getShard(month) {
  let shard = shardCache.get(month);
  if (!shard) {
    const rows = loadJson(shardPath(month), []);
    shard = { rows, guids: new Set(rows.map((a) => a.guid)), dirty: false };
    shardCache.set(month, shard);
  }
  return shard;
}

/**
 * Permanently archive an article. Returns true if it was new.
 * NEVER deletes — every article ever ingested stays in its month shard.
 */
function archiveArticle(article, index) {
  const month = monthKey(article.published_at);
  const shard = getShard(month);
  if (shard.guids.has(article.guid)) return false;
  shard.rows.push(article);
  shard.guids.add(article.guid);
  shard.dirty = true;
  index[article.slug] = month;
  return true;
}

function flushShards() {
  let count = 0;
  for (const [month, shard] of shardCache) {
    if (!shard.dirty) continue;
    shard.rows.sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
    writeFileSync(shardPath(month), JSON.stringify(shard.rows));
    count++;
  }
  return count;
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

function buildArticle(feed, item) {
  const guid = `${feed.lang}:${hash(item.guid || item.link)}`;
  const summary = excerpt(item.description || item.title, 200);
  return {
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
  };
}

async function main() {
  mkdirSync(ARCHIVE_DIR, { recursive: true });

  // Load current state.
  const hot = loadJson(ARTICLES_PATH, []);
  const index = loadJson(INDEX_PATH, {});
  const hotGuids = new Set(hot.map((a) => a.guid));

  // Migration: make sure every existing hot article is archived + indexed.
  // (One-time for data created before the archive existed.)
  // Also repairs text stored before the entity-decode fix.
  let migrated = 0;
  const needsClean = (t) => /&[a-zA-Z#]+;?/.test(t || "") || /<[a-zA-Z/][^>]*>/.test(t || "");
  for (const article of hot) {
    if (needsClean(article.title) || needsClean(article.summary)) {
      article.title = cleanLegacyText(article.title);
      article.summary = cleanLegacyText(article.summary);
    }
    if (archiveArticle(article, index)) migrated++;
    else if (!index[article.slug]) {
      index[article.slug] = monthKey(article.published_at);
    }
  }
  // Repair archived shards too (only rewrites shards that changed).
  for (const [month, shard] of shardCache) {
    for (const article of shard.rows) {
      if (needsClean(article.title) || needsClean(article.summary)) {
        article.title = cleanLegacyText(article.title);
        article.summary = cleanLegacyText(article.summary);
        shard.dirty = true;
      }
    }
  }

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
      const article = buildArticle(feed, item);
      if (hotGuids.has(article.guid)) continue;
      hotGuids.add(article.guid);
      if (archiveArticle(article, index)) added++;
      fresh.push(article);
    }
  });

  // Rebuild hot: last HOT_DAYS, cap HOT_MAX. Old articles stay in shards.
  const cutoff = Date.now() - HOT_DAYS * 86_400_000;
  const newHot = [...fresh, ...hot]
    .filter((a) => new Date(a.published_at).getTime() >= cutoff)
    .sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
    .slice(0, HOT_MAX);

  const shardsWritten = flushShards();

  if (newHot.length === 0 && hot.length > 0) {
    console.warn("[ingest] WARNING: fetch yielded nothing usable; keeping previous hot file.");
  } else {
    writeFileSync(ARTICLES_PATH, JSON.stringify(newHot));
  }
  writeFileSync(INDEX_PATH, JSON.stringify(index));

  // Archive stats.
  let archivedTotal = 0;
  for (const f of readdirSync(ARCHIVE_DIR)) {
    if (f.endsWith(".json")) archivedTotal += loadJson(join(ARCHIVE_DIR, f), []).length;
  }

  writeFileSync(
    META_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        hot_count: newHot.length,
        archived_total: archivedTotal,
        index_size: Object.keys(index).length,
        added,
        migrated,
        fetched,
        shards_written: shardsWritten,
        feeds_ok: results.filter((r) => r.ok).length,
        feeds_failed: failures,
      },
      null,
      2
    )
  );

  console.log(
    `[ingest] done: ${added} new (+${migrated} migrated), hot=${newHot.length}, ` +
      `archived=${archivedTotal}, shards_written=${shardsWritten}, ` +
      `${results.filter((r) => r.ok).length}/${FEEDS.length} feeds ok`
  );
  if (failures.length) console.warn("[ingest] failures:\n - " + failures.join("\n - "));
}

main().catch((error) => {
  console.error("[ingest] fatal:", error);
  process.exit(1);
});
