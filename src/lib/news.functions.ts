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
 * Static data layer — articles are ingested at build time by
 * `node scripts/ingest.mjs` into src/data/articles.json and bundled
 * with the app. No database, no backend services.
 */
const ARTICLES = articlesJson as Article[];

const byNewest = (rows: Article[]): Article[] =>
  [...rows].sort((a, b) => (a.published_at < b.published_at ? 1 : -1));

const langSchema = z.enum(LANGS);
const categorySchema = z.enum(CATEGORIES);

export const listHomeArticles = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ lang: langSchema }).parse(input))
  .handler(async ({ data }) => {
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
    return byNewest(
      ARTICLES.filter((a) => a.lang === data.lang && a.category === data.category),
    ).slice(0, 48);
  });

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ lang: langSchema, slug: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
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
