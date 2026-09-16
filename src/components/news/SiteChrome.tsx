import { Link, useRouterState } from "@tanstack/react-router";

import { CATEGORIES, DICT, LANGS, LANG_LABELS, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function LanguageSwitcher({ lang }: { lang: Lang }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rest = pathname.replace(/^\/(ar|en|zh)/, "");

  return (
    <div className="flex items-center gap-1 text-xs">
      {LANGS.map((code) => (
        <a
          key={code}
          href={`/${code}${rest}`}
          hrefLang={code}
          className={cn(
            "px-2 py-1 font-semibold transition-colors",
            code === lang
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LANG_LABELS[code]}
        </a>
      ))}
    </div>
  );
}

export function SiteHeader({ lang }: { lang: Lang }) {
  const dict = DICT[lang];
  const today = new Intl.DateTimeFormat(lang === "ar" ? "ar" : lang === "zh" ? "zh-CN" : "en-GB", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date());

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 text-xs text-muted-foreground">
        <span className="hidden sm:inline">{today}</span>
        <LanguageSwitcher lang={lang} />
      </div>

      <div className="mx-auto max-w-6xl border-y border-border px-4 py-6 text-center">
        <Link to="/$lang" params={{ lang }} className="inline-block">
          <span className="block font-display text-3xl font-black tracking-tight md:text-5xl">
            {dict.siteName}
          </span>
        </Link>
        <p className="mt-2 text-xs text-muted-foreground md:text-sm">{dict.tagline}</p>
      </div>

      <nav className="mx-auto max-w-6xl px-4">
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-3 text-sm font-semibold">
          <li>
            <Link
              to="/$lang"
              params={{ lang }}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary" }}
              className="hover:text-primary"
            >
              {dict.nav.home}
            </Link>
          </li>
          {CATEGORIES.map((category) => (
            <li key={category}>
              <Link
                to="/$lang/category/$slug"
                params={{ lang, slug: category }}
                activeProps={{ className: "text-primary" }}
                className="hover:text-primary"
              >
                {dict.categories[category]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function SiteFooter({ lang }: { lang: Lang }) {
  const dict = DICT[lang];
  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-display text-xl font-bold">{dict.siteName}</p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{dict.footer.disclaimer}</p>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <li>
            <Link to="/$lang/about" params={{ lang }} className="hover:text-primary">
              {dict.footer.about}
            </Link>
          </li>
          <li>
            <Link to="/$lang/contact" params={{ lang }} className="hover:text-primary">
              {dict.footer.contact}
            </Link>
          </li>
          <li>
            <Link to="/$lang/editorial" params={{ lang }} className="hover:text-primary">
              {dict.footer.editorial}
            </Link>
          </li>
          <li>
            <Link to="/$lang/privacy" params={{ lang }} className="hover:text-primary">
              {dict.footer.privacy}
            </Link>
          </li>
          <li>
            <Link to="/$lang/terms" params={{ lang }} className="hover:text-primary">
              {dict.footer.terms}
            </Link>
          </li>
        </ul>

        <p className="mt-6 text-xs text-muted-foreground">
          © {new Date().getUTCFullYear()} {dict.siteName}. {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
