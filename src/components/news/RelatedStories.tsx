import { Link } from "@tanstack/react-router";

import { EditorialImage } from "@/components/news/EditorialImage";
import { categoryImage } from "@/lib/category-images";
import type { Article } from "@/lib/news.functions";
import { DICT, formatDate, type Lang } from "@/lib/i18n";

/** Visual "keep reading" block — gives readers an obvious next page (lowers bounce rate). */
export function RelatedStories({ articles, lang }: { articles: Article[]; lang: Lang }) {
  if (!articles.length) return null;
  return (
    <section className="mt-10">
      <h2 className="rule-double pt-3 font-display text-xl font-bold">{DICT[lang].related}</h2>
      <ul className="mt-4 grid gap-5 sm:grid-cols-2">
        {articles.slice(0, 6).map((item) => (
          <li key={item.id} className="border-b border-border pb-4">
            <Link
              to="/$lang/articles/$slug"
              params={{ lang, slug: item.slug }}
              className="grid grid-cols-[minmax(0,1fr)_96px] items-start gap-3"
            >
              <div className="min-w-0">
                <span className="headline-link line-clamp-3 font-semibold leading-snug">{item.title}</span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.source_name} · {formatDate(item.published_at, lang)}
                </p>
              </div>
              <EditorialImage
                src={item.image_url ?? categoryImage(item.category, item.id)}
                fallbackSrc={categoryImage(item.category, item.id)}
                alt={item.title}
                width={192}
                height={128}
                minWidth={180}
                className="aspect-[3/2] w-24 shrink-0 object-cover"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
