import { describe, expect, it } from "bun:test";

import { reindexArticleSlugs, slugifyHeadline } from "./article-slugs.mjs";

describe("readable article slugs", () => {
  it("keeps headline words and removes punctuation and Arabic diacritics", () => {
    expect(slugifyHeadline("أخبارٌ عاجلة: العالم! 2026")).toBe("اخبار-عاجلة-العالم-2026");
  });

  it("does not append an ID to a unique headline", () => {
    const [article] = [{
      guid: "en:generated-id",
      slug: "old-headline-7x4p9",
      title: "A clear headline for readers",
      source_name: "BBC News",
      lang: "en",
      published_at: "2026-11-05T10:00:00.000Z",
    }];
    reindexArticleSlugs([article]);
    expect(article.slug).toBe("a-clear-headline-for-readers");
  });

  it("uses publisher context for duplicate headlines and keeps old URLs as aliases", () => {
    const first = {
      guid: "en:first",
      slug: "shared-headline-random1",
      title: "Shared headline",
      source_name: "BBC News",
      lang: "en",
      published_at: "2026-11-05T10:00:00.000Z",
    };
    const second = {
      guid: "en:second",
      slug: "shared-headline-random2",
      title: "Shared headline",
      source_name: "Reuters",
      lang: "en",
      published_at: "2026-11-05T10:00:00.000Z",
    };
    const { aliases } = reindexArticleSlugs([first, second]);
    expect(first.slug).toBe("shared-headline-bbc-news");
    expect(second.slug).toBe("shared-headline-reuters");
    expect(aliases["shared-headline-random1"]).toBe(first.slug);
    expect(aliases["shared-headline-random2"]).toBe(second.slug);
  });
});