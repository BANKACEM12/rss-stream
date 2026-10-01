import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/news/SiteChrome";
import { AdSlot } from "@/components/news/AdSlot";
import { DICT, LANG_DIR, isLang, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/$lang")({
  beforeLoad: ({ params }) => {
    if (!isLang(params.lang)) throw notFound();
  },
  component: LangLayout,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl font-bold">404</h1>
      <p className="mt-3 text-muted-foreground">لم يتم العثور على الصفحة · Page not found · 页面未找到</p>
      <a href="/ar" className="mt-6 inline-block font-semibold text-primary underline">
        الرئيسية
      </a>
    </div>
  ),
  errorComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">تعذّر تحميل الأخبار</h1>
      <p className="mt-3 text-muted-foreground">حاول تحديث الصفحة بعد لحظات.</p>
    </div>
  ),
});

function LangLayout() {
  const { lang } = Route.useParams() as { lang: Lang };
  const dict = DICT[lang];

  return (
    <div dir={LANG_DIR[lang]} lang={lang} className="min-h-screen">
      <SiteHeader lang={lang} />
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <AdSlot label={dict.advertisement} variant="leaderboard" />
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <Outlet />
      </main>
      <SiteFooter lang={lang} />
      <div className="border-t border-border bg-card px-4 py-1">
        <div className="mx-auto max-w-6xl">
          <AdSlot label={dict.advertisement} variant="footer" />
        </div>
      </div>
    </div>
  );
}
