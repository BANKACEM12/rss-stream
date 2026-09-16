import { DICT, type Lang } from "@/lib/i18n";

export function GlobalScoreBox({ lang }: { lang: Lang }) {
  const dict = DICT[lang].scores;
  return (
    <aside className="border border-border bg-card p-5">
      <p className="kicker">{dict.title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{dict.body}</p>
      <a
        href="https://www.livescore.com/"
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="mt-3 inline-block text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
      >
        {dict.cta}
      </a>
    </aside>
  );
}
