import { createFileRoute } from "@tanstack/react-router";

import { LANGS, type Lang } from "@/lib/i18n";
import { locUrl, publicDb, siteOrigin, xmlEscape, xmlResponse } from "@/lib/sitemap.server";

export const Route = createFileRoute("/sitemap-articles.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const base = siteOrigin(request);
        const db = await publicDb();

        const { data } = await db
          .from("articles")
          .select("slug, lang, title, published_at, image_url")
          .order("published_at", { ascending: false })
          .limit(5000);

        const rows = (data ?? []).filter((row) =>
          (LANGS as readonly string[]).includes(row.lang as string),
        );

        const entries = rows.map((row) => {
          const lang = row.lang as Lang;
          const published = new Date(row.published_at as string).toISOString();
          const age = Date.now() - new Date(published).getTime();
          const priority = age < 86_400_000 ? "0.9" : age < 7 * 86_400_000 ? "0.6" : "0.4";
          return `  <url>
    <loc>${locUrl(base, `/${lang}/articles/${row.slug}`)}</loc>
    <lastmod>${published}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${priority}</priority>${
      row.image_url
        ? `
    <image:image><image:loc>${xmlEscape(row.image_url as string)}</image:loc><image:title>${xmlEscape(row.title as string)}</image:title></image:image>`
        : ""
    }
  </url>`;
        });

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join("\n")}
</urlset>`;

        return xmlResponse(xml, 1800);
      },
    },
  },
});
