import { createFileRoute } from "@tanstack/react-router";

import { siteOrigin, xmlResponse } from "@/lib/sitemap.server";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const base = siteOrigin(request);
        const now = new Date().toISOString();
        const children = ["/sitemap-pages.xml", "/sitemap-news.xml", "/sitemap-articles.xml"];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${children
  .map((path) => `  <sitemap><loc>${base}${path}</loc><lastmod>${now}</lastmod></sitemap>`)
  .join("\n")}
</sitemapindex>`;

        return xmlResponse(xml, 900);
      },
    },
  },
});
