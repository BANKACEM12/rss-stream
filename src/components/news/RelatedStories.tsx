import { Link } from "@tanstack/react-router";

import type { Article } from "@/lib/news.functions";
import { DICT, formatDate, type Lang } from "@/lib/i18n";

export function RelatedStories({ articles, lang }: { articles: Article[]; lang: Lang }) {
  if (!articles.length) return null;
  return (
    <section className="mt-10">
      <h2 className="rule-double pt-3 font-display text-xl font-bold">{DICT[lang].related}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {articles.slice(0, 5).map((item) => (
          <li key={item.id} className="border-b border-border pb-3">
            <Link
              to="/$lang/articles/$slug"
              params={{ lang, slug: item.slug }}
              className="headline-link font-semibold leading-snug"
            >
              {item.title}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.source_name} · {formatDate(item.published_at, lang)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
