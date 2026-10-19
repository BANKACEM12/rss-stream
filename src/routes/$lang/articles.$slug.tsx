import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { AdSlot } from "@/components/news/AdSlot";
import { EditorialImage } from "@/components/news/EditorialImage";
import { GlobalScoreBox } from "@/components/news/GlobalScoreBox";
import { RelatedStories } from "@/components/news/RelatedStories";
import { ShareButtons } from "@/components/news/ShareButtons";
import { categoryImage } from "@/lib/category-images";
import { getArticle } from "@/lib/news.functions";
import { absUrl } from "@/lib/seo";
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
    // A story lives under its own language only (e.g. a Chinese story under /en):
    // send visitors and Google to the correct address with a permanent redirect.
    if (data.article.lang !== params.lang && (LANGS as readonly string[]).includes(data.article.lang)) {
      throw redirect({
        to: "/$lang/articles/$slug",
        params: { lang: data.article.lang, slug: data.article.slug },
        statusCode: 301,
      });
    }
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
    const url = absUrl(path);
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
        { property: "og:url", content: url },
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
      links: [{ rel: "canonical", href: url }],
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
            url,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: dict.siteName, item: absUrl(`/${lang}`) },
              {
                "@type": "ListItem",
                position: 2,
                name: dict.categories[article.category as Category] ?? article.category,
                item: absUrl(`/${lang}/category/${article.category}`),
              },
              { "@type": "ListItem", position: 3, name: article.title, item: url },
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
        <h1 className="mt-2 font-display text-2xl font-black leading-tight md:text-4xl">
          {article.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {dict.source}:{" "}
          <a
            href={article.source_url ?? article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground hover:text-primary hover:underline"
          >
            {article.source_name}
          </a>{" "}
          ·{" "}
          {dict.publishedAt} <time dateTime={article.published_at}>{formatDate(article.published_at, lang)}</time>
        </p>

        <ShareButtons lang={lang} slug={article.slug} title={article.title} className="mt-4" />

        <EditorialImage
          src={article.image_url ?? categoryImage(article.category, article.id)}
          fallbackSrc={categoryImage(article.category, article.id)}
          alt={article.title}
          width={1200}
          height={675}
          eager
          className="mt-6 aspect-[16/9] w-full object-cover"
        />

        <p className="drop-cap mt-6 text-lg leading-relaxed">{article.summary}</p>

        {article.body ? (
          <div
            className="article-body mt-6 border-t border-border pt-2"
            dangerouslySetInnerHTML={{ __html: article.body }}
          />
        ) : null}

        {/* Keep readers on the site first: related stories come before the exit link. */}
        <RelatedStories articles={related} lang={lang} />

        <a
          href={article.link}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="mt-8 inline-block border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {dict.readOriginal}
        </a>

        <p className="mt-4 border-s-2 border-border ps-3 text-xs text-muted-foreground">
          {dict.footer.disclaimer}
        </p>

        <AdSlot label={dict.advertisement} variant="in-article" className="mt-8 hidden md:flex" />

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
      </article>

      <aside className="space-y-6">
        {article.category === "sports" ? <GlobalScoreBox lang={lang} /> : null}
        <AdSlot label={dict.advertisement} variant="sidebar" className="hidden lg:flex" />
      </aside>
    </div>
  );
}
