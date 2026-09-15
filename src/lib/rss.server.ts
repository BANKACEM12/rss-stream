export type RssItem = {
  guid: string;
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  image: string | null;
};

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, names: string[]): string | null {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return null;
}

function attr(block: string, pattern: RegExp): string | null {
  const match = block.match(pattern);
  return match?.[1] ?? null;
}

/** Minimal RSS 2.0 + Atom parser (no native deps, edge-runtime safe). */
export function parseFeed(xml: string): RssItem[] {
  const blocks = [
    ...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi),
  ].map((m) => m[1] ?? "");

  const items: RssItem[] = [];
  for (const block of blocks) {
    const title = tag(block, ["title"]);
    const link =
      tag(block, ["link"]) ||
      attr(block, /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ||
      attr(block, /<link[^>]*href=["']([^"']+)["']/i);
    if (!title || !link) continue;

    const description =
      tag(block, ["description", "summary", "content:encoded", "content"]) ?? "";
    const pubDate = tag(block, ["pubDate", "published", "updated", "dc:date"]);
    const image =
      attr(block, /<media:(?:content|thumbnail)[^>]*url=["']([^"']+)["']/i) ||
      attr(block, /<enclosure[^>]*url=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i) ||
      attr(block, /<img[^>]*src=["']([^"']+)["']/i);

    items.push({
      guid: tag(block, ["guid", "id"]) || link,
      title,
      link: link.trim(),
      description,
      pubDate,
      image,
    });
  }
  return items;
}

export function toIso(pubDate: string | null): string {
  if (!pubDate) return new Date().toISOString();
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  // Ignore obviously wrong future dates from broken feeds.
  if (parsed.getTime() > Date.now() + 86_400_000) return new Date().toISOString();
  return parsed.toISOString();
}
