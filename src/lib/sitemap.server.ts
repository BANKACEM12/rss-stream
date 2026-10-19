/** Shared helpers for the XML sitemaps (server-only). */

export function siteOrigin(request: Request) {
  const url = new URL(request.url);
  const forwarded =
    url.hostname === "localhost" || url.hostname === "127.0.0.1"
      ? request.headers.get("x-forwarded-host")
      : null;
  return forwarded ? `https://${forwarded}` : url.origin;
}

export function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Percent-encodes non-ASCII path segments (Arabic / Chinese slugs) and escapes XML. */
export function locUrl(origin: string, path: string) {
  const encoded = path
    .split("/")
    .map((segment) => (segment ? encodeURIComponent(decodeURIComponent(segment)) : segment))
    .join("/");
  return xmlEscape(`${origin}${encoded}`);
}

export function xmlResponse(body: string, maxAge = 1800) {
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": `public, max-age=${maxAge}`,
      "x-robots-tag": "noindex",
    },
  });
}
