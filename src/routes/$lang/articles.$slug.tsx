import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { AdSlot } from "@/components/news/AdSlot";
import { EditorialImage } from "@/components/news/EditorialImage";
import { GlobalScoreBox } from "@/components/news/GlobalScoreBox";
import { RelatedStories } from "@/components/news/RelatedStories";
import { getArticle } from "@/lib/news.functions";
import { DICT, LANGS, formatDate, type Category, type Lang } from "@/lib/i18n";

const articleQuery = (lang: Lang, slug: string) =>
  queryOptions({
    queryKey: ["article", lang, slug],
    queryFn: () => getArticle({ data: { lang, slug } }),
    staleTime: 300_000,
  });

const safeLang = (value: string) =>
  ((LANGS as readonly string[]).includes(value) ? value : "ar") as Lang;

export const Route = createFileRoute("/$lang/articles/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(
      articleQuery(safeLang(params.lang), params.slug),
    );
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const lang = safeLang(params.lang);
    const dict = DICT[lang];
    if (!loaderData) {
      return {
        meta: [{ title: `${dict.siteName}` }, { name: "robots", content: "noindex" }],
      };
    }
    const { article } = loaderData;
    const description = article.summary ?? article.title;
    const path = `/${lang}/articles/${article.slug}`;
    return {
      meta: [
        { title: `${article.title} — ${dict.siteName}` },
        { name: "description", content: description },
        ...(article.keywords?.length
          ? [
              { name: "keywords", content: article.keywords.join(", ") },
              { name: "news_keywords", content: article.keywords.join(", ") },
            ]
          : []),
        { property: "og:title", content: article.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: path },
        { property: "og:locale", content: lang === "zh" ? "zh_CN" : lang },
        { property: "article:published_time", content: article.published_at },
        { property: "article:section", content: dict.categories[article.category as Category] ?? article.category },
        { name: "twitter:title", content: article.title },
        { name: "twitter:description", content: description },
        ...(article.image_url
          ? [
              { property: "og:image", content: article.image_url },
              { name: "twitter:image", content: article.image_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: path }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: article.title,
            description,
            datePublished: article.published_at,
            inLanguage: lang,
            ...(article.image_url ? { image: [article.image_url] } : {}),
            isBasedOn: article.link,
            publisher: { "@type": "Organization", name: article.source_name },
            author: { "@type": "Organization", name: article.source_name },
            dateModified: article.published_at,
            articleSection: dict.categories[article.category as Category] ?? article.category,
            ...(article.keywords?.length ? { keywords: article.keywords.join(", ") } : {}),
            url: path,
            mainEntityOfPage: { "@type": "WebPage", "@id": path },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: dict.siteName, item: `/${lang}` },
              {
                "@type": "ListItem",
                position: 2,
                name: dict.categories[article.category as Category] ?? article.category,
                item: `/${lang}/category/${article.category}`,
              },
              { "@type": "ListItem", position: 3, name: article.title, item: path },
            ],
          }),
        },
      ],
    };
  },
  component: ArticlePage,
  notFoundComponent: () => (
    <p className="py-16 text-center text-muted-foreground">404 — الخبر غير متاح</p>
  ),
  errorComponent: () => <p className="py-16 text-center text-muted-foreground">—</p>,
});

function ArticlePage() {
  const params = Route.useParams();
  const lang = safeLang(params.lang);
  const dict = DICT[lang];
  const { data } = useSuspenseQuery(articleQuery(lang, params.slug));
  if (!data) return null;
  const { article, related } = data;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <article>
        <p className="kicker">{dict.categories[article.category as Category] ?? article.category}</p>
        <h1 className="mt-2 font-display text-3xl font-black leading-tight md:text-4xl">
          {article.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {dict.source}:{" "}
          <span className="font-semibold text-foreground">{article.source_name}</span> ·{" "}
          {dict.publishedAt} <time dateTime={article.published_at}>{formatDate(article.published_at, lang)}</time>
        </p>

        {article.image_url ? (
          <EditorialImage
            src={article.image_url}
            alt={article.title}
            width={1200}
            height={675}
            eager
            className="mt-6 aspect-[16/9] w-full object-cover"
          />
        ) : null}

        <p className="mt-6 text-lg leading-relaxed">{article.summary}</p>

        <a
          href={article.link}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="mt-6 inline-block border border-primary bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {dict.readOriginal}
        </a>

        <p className="mt-4 border-s-2 border-border ps-3 text-xs text-muted-foreground">
          {dict.footer.disclaimer}
        </p>

        <AdSlot label={dict.advertisement} variant="in-article" className="mt-8" />

        {article.keywords.length ? (
          <ul className="mt-8 flex flex-wrap gap-2">
            {article.keywords.map((keyword) => (
              <li
                key={keyword}
                className="border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground"
              >
                #{keyword}
              </li>
            ))}
          </ul>
        ) : null}

        <RelatedStories articles={related} lang={lang} />
      </article>

      <aside className="space-y-6">
        {article.category === "sports" ? <GlobalScoreBox lang={lang} /> : null}
        <AdSlot label={dict.advertisement} variant="sidebar" />
      </aside>
    </div>
  );
}
