import type { Category, Lang } from "./i18n";

export type Feed = {
  url: string;
  source: string;
  siteUrl: string;
  lang: Lang;
  category: Category;
};

/**
 * Public RSS feeds published by the newsrooms themselves.
 * Only headline + short excerpt + link are stored (see /editorial).
 */
export const FEEDS: Feed[] = [
  // ---------- Arabic ----------
  { url: "https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9", source: "الجزيرة", siteUrl: "https://www.aljazeera.net", lang: "ar", category: "world" },
  { url: "https://feeds.bbci.co.uk/arabic/rss.xml", source: "BBC عربي", siteUrl: "https://www.bbc.com/arabic", lang: "ar", category: "world" },
  { url: "https://www.skynewsarabia.com/rss/section/business", source: "سكاي نيوز عربية", siteUrl: "https://www.skynewsarabia.com", lang: "ar", category: "business" },
  { url: "https://www.skynewsarabia.com/rss/section/technology", source: "سكاي نيوز عربية", siteUrl: "https://www.skynewsarabia.com", lang: "ar", category: "tech" },
  { url: "https://www.skynewsarabia.com/rss/section/sport", source: "سكاي نيوز عربية", siteUrl: "https://www.skynewsarabia.com", lang: "ar", category: "sports" },
  { url: "https://arabic.rt.com/rss/", source: "RT عربي", siteUrl: "https://arabic.rt.com", lang: "ar", category: "world" },
  { url: "https://www.aitnews.com/feed/", source: "البوابة العربية للتقنية", siteUrl: "https://www.aitnews.com", lang: "ar", category: "tech" },
  { url: "https://www.independentarabia.com/rss.xml", source: "اندبندنت عربية", siteUrl: "https://www.independentarabia.com", lang: "ar", category: "culture" },

  // ---------- English ----------
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC News", siteUrl: "https://www.bbc.com/news", lang: "en", category: "world" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC News", siteUrl: "https://www.bbc.com/news", lang: "en", category: "business" },
  { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", source: "BBC News", siteUrl: "https://www.bbc.com/news", lang: "en", category: "tech" },
  { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", source: "BBC News", siteUrl: "https://www.bbc.com/news", lang: "en", category: "science" },
  { url: "https://feeds.bbci.co.uk/sport/rss.xml", source: "BBC Sport", siteUrl: "https://www.bbc.com/sport", lang: "en", category: "sports" },
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian", siteUrl: "https://www.theguardian.com", lang: "en", category: "world" },
  { url: "https://www.theguardian.com/uk/technology/rss", source: "The Guardian", siteUrl: "https://www.theguardian.com", lang: "en", category: "tech" },
  { url: "https://www.theguardian.com/culture/rss", source: "The Guardian", siteUrl: "https://www.theguardian.com", lang: "en", category: "culture" },
  { url: "https://techcrunch.com/feed/", source: "TechCrunch", siteUrl: "https://techcrunch.com", lang: "en", category: "tech" },
  { url: "https://www.espn.com/espn/rss/news", source: "ESPN", siteUrl: "https://www.espn.com", lang: "en", category: "sports" },
  { url: "https://phys.org/rss-feed/", source: "Phys.org", siteUrl: "https://phys.org", lang: "en", category: "science" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", siteUrl: "https://www.aljazeera.com", lang: "en", category: "world" },

  // ---------- Chinese ----------
  { url: "https://www.zaobao.com/realtime/world/rss.xml", source: "联合早报", siteUrl: "https://www.zaobao.com", lang: "zh", category: "world" },
  { url: "https://www.zaobao.com/realtime/china/rss.xml", source: "联合早报", siteUrl: "https://www.zaobao.com", lang: "zh", category: "business" },
  { url: "https://cn.nytimes.com/rss/", source: "纽约时报中文网", siteUrl: "https://cn.nytimes.com", lang: "zh", category: "world" },
  { url: "https://rsshub.app/36kr/newsflashes", source: "36氪", siteUrl: "https://36kr.com", lang: "zh", category: "tech" },
  { url: "https://www.ithome.com/rss/", source: "IT之家", siteUrl: "https://www.ithome.com", lang: "zh", category: "tech" },
  { url: "https://feedx.net/rss/bbc.xml", source: "BBC 中文", siteUrl: "https://www.bbc.com/zhongwen", lang: "zh", category: "world" },
  { url: "https://www.solidot.org/index.rss", source: "Solidot", siteUrl: "https://www.solidot.org", lang: "zh", category: "science" },
];
