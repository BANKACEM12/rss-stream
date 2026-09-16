import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { StaticPage, staticHead } from "@/components/news/StaticPage";
import { DICT, LANGS, type Lang } from "@/lib/i18n";

const safeLang = (value: string) =>
  ((LANGS as readonly string[]).includes(value) ? value : "ar") as Lang;

export const Route = createFileRoute("/$lang/contact")({
  head: ({ params }) => staticHead(safeLang(params.lang), "contact", "/contact"),
  component: ContactPage,
});

function ContactPage() {
  const lang = safeLang(Route.useParams().lang);
  const form = DICT[lang].contactForm;
  const [sent, setSent] = useState(false);

  return (
    <StaticPage lang={lang} pageKey="contact">
      {sent ? (
        <p className="mt-8 border border-primary bg-accent p-4 font-semibold">{form.sent}</p>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
          }}
        >
          <div>
            <label htmlFor="name" className="kicker">
              {form.name}
            </label>
            <input
              id="name"
              required
              className="mt-1 w-full border border-border bg-card px-3 py-2 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="email" className="kicker">
              {form.email}
            </label>
            <input
              id="email"
              type="email"
              required
              className="mt-1 w-full border border-border bg-card px-3 py-2 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="message" className="kicker">
              {form.message}
            </label>
            <textarea
              id="message"
              required
              rows={5}
              className="mt-1 w-full border border-border bg-card px-3 py-2 outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="border border-primary bg-primary px-5 py-2 font-bold text-primary-foreground hover:opacity-90"
          >
            {form.send}
          </button>
        </form>
      )}
    </StaticPage>
  );
}
