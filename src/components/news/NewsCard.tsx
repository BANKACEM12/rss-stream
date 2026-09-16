import { Link } from "@tanstack/react-router";

import type { Article } from "@/lib/news.functions";
import { DICT, formatDate, type Category, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  article: Article;
  lang: Lang;
  variant?: "lead" | "standard" | "compact";
  className?: string;
};

export function NewsCard({ article, lang, variant = "standard", className }: Props) {
  const dict = DICT[lang];
  const categoryLabel = dict.categories[article.category as Category] ?? article.category;

  if (variant === "compact") {
    return (
      <article className={cn("border-b border-border py-3 last:border-0", className)}>
        <Link
          to="/$lang/articles/$slug"
          params={{ lang, slug: article.slug }}
          className="headline-link block text-[15px] font-semibold leading-snug"
        >
          {article.title}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          {article.source_name} · {formatDate(article.published_at, lang)}
        </p>
      </article>
    );
  }

  const isLead = variant === "lead";

  return (
    <article
      className={cn(
        "group flex flex-col border-b border-border pb-5",
        isLead && "gap-3",
        className,
      )}
    >
      {article.image_url ? (
        <Link
          to="/$lang/articles/$slug"
          params={{ lang, slug: article.slug }}
          className="mb-3 block overflow-hidden bg-secondary"
        >
          <img
            src={article.image_url}
            alt={article.title}
            loading="lazy"
            width={isLead ? 1200 : 640}
            height={isLead ? 675 : 360}
            className={cn(
              "w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]",
              isLead ? "aspect-[16/9]" : "aspect-[16/9]",
            )}
          />
        </Link>
      ) : null}

      <span className="kicker">{categoryLabel}</span>

      <h3
        className={cn(
          "mt-1 font-display font-bold leading-tight",
          isLead ? "text-2xl md:text-4xl" : "text-lg md:text-xl",
        )}
      >
        <Link
          to="/$lang/articles/$slug"
          params={{ lang, slug: article.slug }}
          className="headline-link"
        >
          {article.title}
        </Link>
      </h3>

      {article.summary ? (
        <p
          className={cn(
            "mt-2 text-muted-foreground",
            isLead ? "text-base md:text-lg" : "text-sm",
          )}
        >
          {article.summary}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{article.source_name}</span> ·{" "}
        <time dateTime={article.published_at}>{formatDate(article.published_at, lang)}</time>
      </p>
    </article>
  );
}
