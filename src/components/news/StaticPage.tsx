import { DICT, LANGS, type Lang } from "@/lib/i18n";

export type StaticKey = "about" | "contact" | "privacy" | "terms" | "editorial";

export function staticHead(lang: Lang, key: StaticKey, path: string) {
  const page = DICT[lang].pages[key];
  const title = `${page.title} — ${DICT[lang].siteName}`;
  return {
    meta: [
      { title },
      { name: "description", content: page.intro },
      { property: "og:title", content: title },
      { property: "og:description", content: page.intro },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `/${lang}${path}` },
    ],
    links: [
      { rel: "canonical", href: `/${lang}${path}` },
      ...LANGS.map((code) => ({ rel: "alternate", hrefLang: code, href: `/${code}${path}` })),
    ],
  };
}

export function StaticPage({
  lang,
  pageKey,
  children,
}: {
  lang: Lang;
  pageKey: StaticKey;
  children?: React.ReactNode;
}) {
  const page = DICT[lang].pages[pageKey];
  return (
    <div>
      <article className="max-w-3xl">
        <h1 className="rule-double pt-3 font-display text-3xl font-black">{page.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{page.intro}</p>
        <div className="mt-6 space-y-4 leading-relaxed">
          {page.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {children}
      </article>
    </div>
  );
}
