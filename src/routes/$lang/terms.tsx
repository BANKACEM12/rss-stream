import { createFileRoute } from "@tanstack/react-router";

import { StaticPage, staticHead } from "@/components/news/StaticPage";
import { LANGS, type Lang } from "@/lib/i18n";

const safeLang = (value: string) =>
  ((LANGS as readonly string[]).includes(value) ? value : "ar") as Lang;

export const Route = createFileRoute("/$lang/terms")({
  head: ({ params }) => staticHead(safeLang(params.lang), "terms", "/terms"),
  component: () => <StaticPage lang={safeLang(Route.useParams().lang)} pageKey="terms" />,
});
