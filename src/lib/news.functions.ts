import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { CATEGORIES, LANGS } from "./i18n";
import articlesJson from "../data/articles.json";

export type Article = {
  id: string;
  guid: string;
  slug: string;
  title: string;
  summary: string | null;
  link: string;
  source_name: string;
  source_url: string | null;
  lang: string;
  category: string;
  image_url: string | null;
  keywords: string[];
  published_at: string;
  body: string | null;
  body_generated_at: string | null;
};

/**
 * Live data layer — no database, no rebuilds needed for fresh news.
 *
 * - HOT (`articles.json`, last 60 days): homepage, categories, sitemaps.
 *   Fetched from GitHub raw at request time (5-min cache).
 * - ARCHIVE (`archive/YYYY-MM.json` + `archive-index.json`): every article
 *   ever ingested, NEVER deleted. Article pages resolve old slugs through
 *   the index so indexed URLs keep working forever (SEO).
 * - The JSON bundled at build time is the fallback if the fetch fails.
 *
 * NOTE: the repo must be PUBLIC for raw.githubusercontent.com to serve
 * the files.
 */
const RAW_BASE = "https://raw.githubusercontent.com/BANKACEM12/rss-stream/main/src/data";
const HOT_URL = `${RAW_BASE}/articles.json`;
const INDEX_URL = `${RAW_BASE}/archive-index.json`;
const shardUrl = (month: string) => `${RAW_BASE}/archive/${month}.json`;

const HOT_TTL_MS = 5 * 60 * 1000;
const COLD_TTL_MS = 10 * 60 * 1000;

const FALLBACK = articlesJson as Article[];

type CacheEntry = { at: number; etag: string | null; data: unknown };
const cache = new Map<string, CacheEntry>();

async function fetchJson(url: string, ttlMs: number): Promise<unknown | null> {
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && now - entry.at < ttlMs) return entry.data;
  try {
    const headers: Record<string, string> = {};
    if (entry?.etag) headers["if-none-match"] = entry.etag;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (res.status === 304 && entry) {
      entry.at = now;
      return entry.data;
    }
    if (!res.ok) return entry?.data ?? null;
    const data: unknown = await res.json();
    cache.set(url, { at: now, etag: res.headers.get("etag"), data });
    return data;
  } catch {
    return entry?.data ?? null;
  }
}

function isArticleArray(value: unknown): value is Article[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof (value[0] as Article)?.slug === "string" &&
    typeof (value[0] as Article)?.title === "string"
  );
}

async function getHot(): Promise<Article[]> {
  const data = await fetchJson(HOT_URL, HOT_TTL_MS);
  return isArticleArray(data) ? data : FALLBACK;
}

async function getIndex(): Promise<Record<string, string>> {
  const data = await fetchJson(INDEX_URL, COLD_TTL_MS);
  return data !== null && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, string>)
    : {};
}

async function getShard(month: string): Promise<Article[]> {
  const data = await fetchJson(shardUrl(month), COLD_TTL_MS);
  return isArticleArray(data) ? data : [];
}

const byNewest = (rows: Article[]): Article[] =>
  [...rows].sort((a, b) => (a.published_at < b.published_at ? 1 : -1));

const langSchema = z.enum(LANGS);
const categorySchema = z.enum(CATEGORIES);

export const listHomeArticles = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ lang: langSchema }).parse(input))
  .handler(async ({ data }) => {
    const hot = await getHot();
    const rows = byNewest(hot.filter((a) => a.lang === data.lang)).slice(0, 60);

    const byCategory: Record<string, Article[]> = {};
    for (const row of rows) {
      (byCategory[row.category] ??= []).push(row);
    }
    return { latest: rows, byCategory };
  });

export const listCategoryArticles = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ lang: langSchema, category: categorySchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const hot = await getHot();
    return byNewest(hot.filter((a) => a.lang === data.lang && a.category === data.category)).slice(
      0,
      48,
    );
  });

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ lang: langSchema, slug: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const hot = await getHot();
    let article = hot.find((a) => a.slug === data.slug) ?? null;

    // Archive fallback: old slugs resolve through the slug→month index,
    // so Google-indexed URLs never 404.
    if (!article) {
      const index = await getIndex();
      const month = index[data.slug];
      if (month) {
        const shard = await getShard(month);
        article = shard.find((a) => a.slug === data.slug) ?? null;
      }
    }
    if (!article) return null;

    const related = byNewest(
      hot.filter(
        (a) => a.lang === article.lang && a.category === article.category && a.id !== article.id,
      ),
    ).slice(0, 6);

    return { article, related };
  });

export const listSitemapEntries = createServerFn({ method: "GET" }).handler(async () => {
  const hot = await getHot();
  return byNewest(hot)
    .slice(0, 5000)
    .map((a) => ({
      slug: a.slug,
      lang: a.lang,
      title: a.title,
      image_url: a.image_url,
      published_at: a.published_at,
    }));
});
