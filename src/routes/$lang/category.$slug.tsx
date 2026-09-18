import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { AdSlot } from "@/components/news/AdSlot";
import { GlobalScoreBox } from "@/components/news/GlobalScoreBox";
import { NewsCard } from "@/components/news/NewsCard";
import { listCategoryArticles } from "@/lib/news.functions";
import { CATEGORIES, DICT, LANGS, type Category, type Lang } from "@/lib/i18n";

const categoryQuery = (lang: Lang, category: Category) =>
  queryOptions({
    queryKey: ["category", lang, category],
    queryFn: () => listCategoryArticles({ data: { lang, category } }),
    staleTime: 60_000,
  });

function safe(params: { lang: string; slug: string }) {
  const lang = ((LANGS as readonly string[]).includes(params.lang) ? params.lang : "ar") as Lang;
  const category = ((CATEGORIES as readonly string[]).includes(params.slug)
    ? params.slug
    : "world") as Category;
  return { lang, category };
}

export const Route = createFileRoute("/$lang/category/$slug")({
  beforeLoad: ({ params }) => {
    if (!(CATEGORIES as readonly string[]).includes(params.slug)) throw notFound();
  },
  loader: ({ context, params }) => {
    const { lang, category } = safe(params);
    return context.queryClient.ensureQueryData(categoryQuery(lang, category));
  },
  head: ({ params }) => {
    const { lang, category } = safe(params);
    const dict = DICT[lang];
    const title = `${dict.categories[category]} — ${dict.siteName}`;
    const description = `${dict.latest}: ${dict.categories[category]}. ${dict.footer.disclaimer}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `/${lang}/category/${category}` },
      ],
      links: [
        { rel: "canonical", href: `/${lang}/category/${category}` },
        ...LANGS.map((code) => ({
          rel: "alternate",
          hrefLang: code,
          href: `/${code}/category/${category}`,
        })),
        { rel: "alternate", hrefLang: "x-default", href: `/en/category/${category}` },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: dict.categories[category],
            description,
            inLanguage: lang,
            url: `/${lang}/category/${category}`,
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: dict.siteName, item: `/${lang}` },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: dict.categories[category],
                  item: `/${lang}/category/${category}`,
                },
              ],
            },
          }),
        },
      ],
    };
  },
  component: CategoryPage,
  notFoundComponent: () => (
    <p className="py-16 text-center text-muted-foreground">404 — القسم غير موجود</p>
  ),
  errorComponent: () => <p className="py-16 text-center text-muted-foreground">—</p>,
});

function CategoryPage() {
  const params = Route.useParams();
  const { lang, category } = safe(params);
  const dict = DICT[lang];
  const { data: articles } = useSuspenseQuery(categoryQuery(lang, category));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="rule-double pt-3 font-display text-3xl font-black">
          {dict.categories[category]}
        </h1>

        {!articles.length ? (
          <p className="py-16 text-muted-foreground">{dict.empty}</p>
        ) : (
          <>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {articles.slice(0, 6).map((item) => (
                <NewsCard key={item.id} article={item} lang={lang} />
              ))}
            </div>
            <AdSlot label={dict.advertisement} variant="in-article" className="my-8" />
            <div className="grid gap-6 sm:grid-cols-2">
              {articles.slice(6).map((item) => (
                <NewsCard key={item.id} article={item} lang={lang} />
              ))}
            </div>
          </>
        )}
      </div>

      <aside className="space-y-6">
        {category === "sports" ? <GlobalScoreBox lang={lang} /> : null}
        <AdSlot label={dict.advertisement} variant="sidebar" />
      </aside>
    </div>
  );
}
