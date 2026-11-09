export type SlugArticle = {
  guid?: string;
  id?: string;
  slug?: string;
  title?: string;
  source_name?: string;
  link?: string;
  lang?: string;
  category?: string;
  published_at?: string;
};

export function slugifyHeadline(value: string, maxLength?: number): string;
export function reindexArticleSlugs(
  articles: SlugArticle[],
  previousAliases?: Record<string, string>,
): { aliases: Record<string, string>; canonicalByOldSlug: Map<string, string> };