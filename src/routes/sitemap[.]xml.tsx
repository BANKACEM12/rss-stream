import { createFileRoute } from "@tanstack/react-router";

import { CATEGORIES, LANGS } from "@/lib/i18n";

function origin(request: Request) {
  const url = new URL(request.url);
  const forwarded = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  return forwarded ? `https://${forwarded}` : url.origin;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const base = origin(request);
        const { createClient } = await import("@supabase/supabase-js");
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const db = createClient(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input: RequestInfo | URL, init?: RequestInit) => {
              const headers = new Headers(init?.headers);
              if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            },
          },
        });

        const { data: articles } = await db
          .from("articles")
          .select("slug, lang, published_at")
          .order("published_at", { ascending: false })
          .limit(2000);

        const staticPaths = ["", "/about", "/contact", "/privacy", "/terms", "/editorial"];
        const urls: { loc: string; lastmod?: string }[] = [];

        for (const lang of LANGS) {
          for (const path of staticPaths) urls.push({ loc: `${base}/${lang}${path}` });
          for (const category of CATEGORIES) {
            urls.push({ loc: `${base}/${lang}/category/${category}` });
          }
        }
        for (const row of articles ?? []) {
          urls.push({
            loc: `${base}/${row.lang}/articles/${row.slug}`,
            lastmod: new Date(row.published_at as string).toISOString(),
          });
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) =>
      `  <url><loc>${entry.loc}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""}</url>`,
  )
  .join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
