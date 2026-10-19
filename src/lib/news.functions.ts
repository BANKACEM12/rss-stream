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
 * The GitHub Action (`refresh-news.yml`) keeps `src/data/articles.json`
 * fresh in the repo every 30 minutes. This server fetches that file from
 * GitHub's raw CDN at request time (5-minute in-memory cache), so visitors
 * always see fresh news without any redeploy. The JSON bundled at build
 * time is the fallback if the fetch fails.
 *
 * NOTE: the repo must be PUBLIC for raw.githubusercontent.com to serve
 * the file.
 */
const REMOTE_URL =
  "https://raw.githubusercontent.com/BANKACEM12/rss-stream/main/src/data/articles.json";
const CACHE_TTL_MS = 5 * 60 * 1000;

const FALLBACK = articlesJson as Article[];

let cache: { at: number; articles: Article[] } | null = null;
let inflight: Promise<Article[]> | null = null;

function isArticleArray(value: unknown): value is Article[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof (value[0] as Article)?.slug === "string" &&
    typeof (value[0] as Article)?.title === "string"
  );
}

async function fetchRemote(): Promise<Article[] | null> {
  try {
    const res = await fetch(REMOTE_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isArticleArray(data) ? data : null;
  } catch {
    return null;
  }
}

async function getArticles(): Promise<Article[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.articles;
  if (!inflight) {
    inflight = fetchRemote().then((remote) => {
      const articles = remote ?? FALLBACK;
      cache = { at: Date.now(), articles };
      inflight = null;
      return articles;
    });
  }
  return inflight;
}

const byNewest = (rows: Article[]): Article[] =>
  [...rows].sort((a, b) => (a.published_at < b.published_at ? 1 : -1));

const langSchema = z.enum(LANGS);
const categorySchema = z.enum(CATEGORIES);

export const listHomeArticles = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ lang: langSchema }).parse(input))
  .handler(async ({ data }) => {
    const ARTICLES = await getArticles();
    const rows = byNewest(ARTICLES.filter((a) => a.lang === data.lang)).slice(0, 60);

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
    const ARTICLES = await getArticles();
    return byNewest(
      ARTICLES.filter((a) => a.lang === data.lang && a.category === data.category),
    ).slice(0, 48);
  });

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ lang: langSchema, slug: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const ARTICLES = await getArticles();
    const article = ARTICLES.find((a) => a.slug === data.slug) ?? null;
    if (!article) return null;

    const related = byNewest(
      ARTICLES.filter(
        (a) => a.lang === article.lang && a.category === article.category && a.id !== article.id,
      ),
    ).slice(0, 6);

    return { article, related };
  });

export const listSitemapEntries = createServerFn({ method: "GET" }).handler(async () => {
  const ARTICLES = await getArticles();
  return byNewest(ARTICLES)
    .slice(0, 5000)
    .map((a) => ({
      slug: a.slug,
      lang: a.lang,
      title: a.title,
      image_url: a.image_url,
      published_at: a.published_at,
    }));
});
