/**
 * AI article writer: turns a fetched headline + excerpt into an original,
 * SEO-optimized article via Clean APIs, then sanitizes the HTML and
 * appends deterministic internal links (related stories + category).
 */

import { chatCompletion, modelChain } from "./cleanapis.server";
import { DICT, type Lang } from "./i18n";

export type QueueArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  lang: string;
  category: string;
  keywords: string[];
  source_name: string;
};

export type RelatedLink = { slug: string; title: string };

export type WriteResult =
  | { ok: true; bodyHtml: string; model: string }
  | { ok: false; error: string; fatal: boolean };

const LANGUAGE_NAME: Record<string, string> = {
  ar: "Modern Standard Arabic (العربية الفصحى)",
  en: "English",
  zh: "Simplified Chinese (简体中文)",
};

const READ_ALSO: Record<string, string> = {
  ar: "اقرأ أيضًا",
  en: "Read also",
  zh: "延伸阅读",
};

function buildMessages(article: QueueArticle) {
  const langName = LANGUAGE_NAME[article.lang] ?? "the article's language";
  const keywords = article.keywords?.length ? article.keywords.join(", ") : article.title;
  return [
    {
      role: "system" as const,
      content:
        "You are a senior news editor at a multilingual news agency. You write original, factual, SEO-optimized news articles. You never invent quotes, names, statistics or events that are not in the provided source material. You output JSON only, no markdown fences.",
    },
    {
      role: "user" as const,
      content: `Write a professional news article in ${langName} based ONLY on this verified source material.

Source headline: ${article.title}
Source excerpt: ${article.summary ?? article.title}
Source newsroom: ${article.source_name}
Section: ${article.category}
Keywords to weave in naturally: ${keywords}

Requirements:
- 450-700 words, objective news tone, inverted pyramid (most important facts first).
- Structure: opening <p> paragraphs, then 2-3 <h2> subheadings each followed by paragraphs; you may use one <ul><li> list for key facts.
- The first paragraph must stand alone and answer who/what/where/when.
- Do NOT repeat the source headline verbatim as your first sentence.
- Attribute facts to ${article.source_name} where relevant; the final paragraph must note that this report is based on coverage by ${article.source_name}.
- Weave the keywords in naturally; no keyword stuffing.
- No fabricated quotes, numbers, names or events. No opinion or analysis beyond the facts. No markdown.

Allowed HTML tags only: p, h2, ul, li, strong, em.
Respond with JSON only in exactly this shape: {"body_html": "<p>...</p><h2>...</h2><p>...</p>"}`,
    },
  ];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ALLOWED_TAGS = new Set(["p", "h2", "h3", "ul", "ol", "li", "strong", "em", "b", "i", "blockquote", "a"]);

/** Whitelist sanitizer (no dependencies, edge-runtime safe). */
export function sanitizeArticleHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (match, closing: string, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (closing) return `</${tag}>`;
      if (tag === "a") {
        const href = /href=["'](https?:\/\/[^"']+)["']/i.exec(attrs)?.[1];
        if (!href) return "";
        return `<a href="${escapeHtml(href)}" target="_blank" rel="nofollow noopener">`;
      }
      return `<${tag}>`;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBodyHtml(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { body_html?: unknown };
    return typeof parsed.body_html === "string" && parsed.body_html.trim().length > 0
      ? parsed.body_html
      : null;
  } catch {
    return null;
  }
}

function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

/** Deterministic internal links appended after the AI body (SEO internal linking). */
function internalLinksBlock(article: QueueArticle, related: RelatedLink[]): string {
  const lang = (article.lang in DICT ? article.lang : "en") as Lang;
  const dict = DICT[lang];
  const links: string[] = related
    .slice(0, 2)
    .map(
      (r) =>
        `<a href="/${lang}/articles/${r.slug}">${escapeHtml(r.title)}</a>`,
    );
  const categoryLabel = dict.categories[article.category as keyof typeof dict.categories] ?? article.category;
  links.push(`<a href="/${lang}/category/${article.category}">${escapeHtml(categoryLabel)}</a>`);
  const label = READ_ALSO[lang] ?? READ_ALSO["en"]!;
  return `<p><strong>${label}:</strong> ${links.join(" · ")}</p>`;
}

export async function writeArticle(
  apiKey: string,
  article: QueueArticle,
  related: RelatedLink[],
): Promise<WriteResult> {
  const messages = buildMessages(article);
  const errors: string[] = [];
  let sawProviderDown = 0;
  let tried = 0;

  for (const model of modelChain()) {
    tried++;
    const res = await chatCompletion(apiKey, model, messages);
    if (!res.ok) {
      errors.push(`${model}: ${res.error}`.slice(0, 200));
      if (res.billing) {
        // Account-level problem: no model will work — stop immediately.
        return { ok: false, error: errors.join(" | ").slice(0, 700), fatal: true };
      }
      if (res.providerDown) sawProviderDown++;
      continue;
    }
    const raw = extractBodyHtml(res.text);
    if (!raw) {
      errors.push(`${model}: unparseable response (${res.text.slice(0, 80)})`);
      continue;
    }
    const clean = sanitizeArticleHtml(raw);
    if (wordCount(clean) < 120) {
      errors.push(`${model}: article too short`);
      continue;
    }
    return { ok: true, bodyHtml: `${clean}${internalLinksBlock(article, related)}`, model };
  }

  const lastError = (errors.length ? errors.join(" | ") : "no models configured").slice(0, 700);

  // Every model failed at the provider level (5xx/network): the account is
  // fine, the gateway is down — don't burn per-article retry budget.
  const fatal = tried > 0 && sawProviderDown === tried;
  return { ok: false, error: lastError, fatal };
}
