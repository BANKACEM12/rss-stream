/**
 * Canonical public origin of the published site.
 * Used to build absolute URLs for canonical, hreflang, og:url and JSON-LD
 * (Google requires absolute URLs in BreadcrumbList item ids).
 */
export const SITE_URL = "https://rss-stream.lovable.app";

export function absUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
