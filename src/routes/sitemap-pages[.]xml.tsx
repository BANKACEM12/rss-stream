import { createFileRoute } from "@tanstack/react-router";

import { CATEGORIES, LANGS } from "@/lib/i18n";
import { locUrl, siteOrigin, xmlResponse } from "@/lib/sitemap.server";

const STATIC_PATHS = ["", "/about", "/contact", "/privacy", "/terms", "/editorial"];

export const Route = createFileRoute("/sitemap-pages.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const base = siteOrigin(request);
        const now = new Date().toISOString();

        const entries: string[] = [];
        const push = (path: string, priority: string, freq: string) => {
          const alternates = LANGS.map(
            (code) =>
              `    <xhtml:link rel="alternate" hreflang="${code}" href="${locUrl(base, `/${code}${path}`)}"/>`,
          ).join("\n");
          for (const lang of LANGS) {
            entries.push(
              `  <url>
    <loc>${locUrl(base, `/${lang}${path}`)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${locUrl(base, `/en${path}`)}"/>
  </url>`,
            );
          }
        };

        push("", "1.0", "hourly");
        for (const category of CATEGORIES) push(`/category/${category}`, "0.8", "hourly");
        for (const path of STATIC_PATHS.slice(1)) push(path, "0.3", "yearly");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>`;

        return xmlResponse(xml, 3600);
      },
    },
  },
});
