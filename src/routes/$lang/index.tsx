import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { AdSlot } from "@/components/news/AdSlot";
import { GlobalScoreBox } from "@/components/news/GlobalScoreBox";
import { NewsCard } from "@/components/news/NewsCard";
import { listHomeArticles } from "@/lib/news.functions";
import { CATEGORIES, DICT, LANGS, type Lang } from "@/lib/i18n";

const homeQuery = (lang: Lang) =>
  queryOptions({
    queryKey: ["home", lang],
    queryFn: () => listHomeArticles({ data: { lang } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/$lang/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(homeQuery(params.lang as Lang)),
  head: ({ params }) => {
    const lang = (LANGS as readonly string[]).includes(params.lang)
      ? (params.lang as Lang)
      : "ar";
    const dict = DICT[lang];
    const title = `${dict.siteName} — ${dict.latest}`;
    return {
      meta: [
        { title },
        { name: "description", content: dict.tagline },
        { property: "og:title", content: title },
        { property: "og:description", content: dict.tagline },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `/${lang}` },
      ],
      links: [
        { rel: "canonical", href: `/${lang}` },
        ...LANGS.map((code) => ({ rel: "alternate", hrefLang: code, href: `/${code}` })),
        { rel: "alternate", hrefLang: "x-default", href: "/en" },
      ],
    };
  },
  component: HomePage,
  errorComponent: () => <p className="py-16 text-center text-muted-foreground">—</p>,
});

function HomePage() {
  const { lang } = Route.useParams() as { lang: Lang };
  const dict = DICT[lang];
  const { data } = useSuspenseQuery(homeQuery(lang));
  const [term, setTerm] = useState("");

  const results = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return null;
    return data.latest.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.summary ?? "").toLowerCase().includes(query),
    );
  }, [term, data.latest]);

  const [lead, ...rest] = data.latest;

  return (
    <div>
      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="mb-8 flex items-center gap-2 border border-border bg-card px-3 py-2"
      >
        <label htmlFor="site-search" className="kicker">
          {dict.search}
        </label>
        <input
          id="site-search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={dict.searchPlaceholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>

      {results ? (
        <section>
          <h2 className="rule-double pt-3 font-display text-xl font-bold">{dict.search}</h2>
          {results.length ? (
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {results.map((item) => (
                <NewsCard key={item.id} article={item} lang={lang} />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-muted-foreground">{dict.noResults}</p>
          )}
        </section>
      ) : !data.latest.length ? (
        <p className="py-16 text-center text-muted-foreground">{dict.empty}</p>
      ) : (
        <>
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="kicker">{dict.breaking}</p>
              {lead ? <NewsCard article={lead} lang={lang} variant="lead" className="mt-2" /> : null}

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                {rest.slice(0, 6).map((item) => (
                  <NewsCard key={item.id} article={item} lang={lang} />
                ))}
              </div>

              <AdSlot label={dict.advertisement} variant="in-article" className="mt-8" />
            </div>

            <aside className="space-y-6">
              <section className="border border-border bg-card p-5">
                <h2 className="kicker">{dict.latest}</h2>
                <div className="mt-2">
                  {rest.slice(6, 14).map((item) => (
                    <NewsCard key={item.id} article={item} lang={lang} variant="compact" />
                  ))}
                </div>
              </section>
              <GlobalScoreBox lang={lang} />
              <AdSlot label={dict.advertisement} variant="sidebar" />
            </aside>
          </div>

          {CATEGORIES.map((category) => {
            const items = data.byCategory[category] ?? [];
            if (!items.length) return null;
            return (
              <section key={category} className="mt-12">
                <div className="rule-double flex items-baseline justify-between pt-3">
                  <h2 className="font-display text-2xl font-bold">{dict.categories[category]}</h2>
                  <Link
                    to="/$lang/category/$slug"
                    params={{ lang, slug: category }}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {dict.moreIn} {dict.categories[category]} →
                  </Link>
                </div>
                <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.slice(0, 3).map((item) => (
                    <NewsCard key={item.id} article={item} lang={lang} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
