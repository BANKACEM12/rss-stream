import { createFileRoute } from "@tanstack/react-router";

import { DICT, LANGS, type Lang } from "@/lib/i18n";
import { listSitemapEntries } from "@/lib/news.functions";
import { locUrl, siteOrigin, xmlEscape, xmlResponse } from "@/lib/sitemap.server";

const NEWS_LANG: Record<Lang, string> = { ar: "ar", en: "en", zh: "zh-cn" };

export const Route = createFileRoute("/sitemap-news.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const base = siteOrigin(request);
        const since = Date.now() - 48 * 3600 * 1000;

        const rows = (await listSitemapEntries()).filter(
          (row) =>
            (LANGS as readonly string[]).includes(row.lang) &&
            new Date(row.published_at).getTime() >= since,
        );

        const entries = rows.map((row) => {
          const lang = row.lang as Lang;
          const published = new Date(row.published_at as string).toISOString();
          return `  <url>
    <loc>${locUrl(base, `/${lang}/articles/${row.slug}`)}</loc>
    <lastmod>${published}</lastmod>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(DICT[lang].siteName)}</news:name>
        <news:language>${NEWS_LANG[lang]}</news:language>
      </news:publication>
      <news:publication_date>${published}</news:publication_date>
      <news:title>${xmlEscape(row.title as string)}</news:title>
    </news:news>${
      row.image_url
        ? `
    <image:image><image:loc>${xmlEscape(row.image_url as string)}</image:loc><image:title>${xmlEscape(row.title as string)}</image:title></image:image>`
        : ""
    }
  </url>`;
        });

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join("\n")}
</urlset>`;

        return xmlResponse(xml, 600);
      },
    },
  },
});
