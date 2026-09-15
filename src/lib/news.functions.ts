import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { CATEGORIES, LANGS } from "./i18n";

export type Article = {
  id: string;
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
};

const SELECT =
  "id, slug, title, summary, link, source_name, source_url, lang, category, image_url, keywords, published_at";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const langSchema = z.enum(LANGS);
const categorySchema = z.enum(CATEGORIES);

export const listHomeArticles = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ lang: langSchema }).parse(input))
  .handler(async ({ data }) => {
    const db = publicClient();
    const { data: latest, error } = await db
      .from("articles")
      .select(SELECT)
      .eq("lang", data.lang)
      .order("published_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);

    const rows = (latest ?? []) as Article[];
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
    const db = publicClient();
    const { data: rows, error } = await db
      .from("articles")
      .select(SELECT)
      .eq("lang", data.lang)
      .eq("category", data.category)
      .order("published_at", { ascending: false })
      .limit(48);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Article[];
  });

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ lang: langSchema, slug: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = publicClient();
    const { data: article, error } = await db
      .from("articles")
      .select(SELECT)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!article) return null;

    const typed = article as Article;
    const { data: related } = await db
      .from("articles")
      .select(SELECT)
      .eq("lang", typed.lang)
      .eq("category", typed.category)
      .neq("id", typed.id)
      .order("published_at", { ascending: false })
      .limit(6);

    return { article: typed, related: (related ?? []) as Article[] };
  });

export const listSitemapEntries = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient();
  const { data, error } = await db
    .from("articles")
    .select("slug, lang, published_at")
    .order("published_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []) as { slug: string; lang: string; published_at: string }[];
});
