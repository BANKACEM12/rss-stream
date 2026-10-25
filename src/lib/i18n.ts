export const LANGS = ["ar", "en", "zh"] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(value: string | undefined): value is Lang {
  return !!value && (LANGS as readonly string[]).includes(value);
}

export const LANG_LABELS: Record<Lang, string> = {
  ar: "العربية",
  en: "English",
  zh: "中文",
};

export const LANG_DIR: Record<Lang, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
  zh: "ltr",
};

export const LANG_HTML: Record<Lang, string> = {
  ar: "ar",
  en: "en",
  zh: "zh-Hans",
};

export const CATEGORIES = [
  "world",
  "business",
  "tech",
  "sports",
  "science",
  "culture",
] as const;
export type Category = (typeof CATEGORIES)[number];

type Dict = {
  siteName: string;
  tagline: string;
  latest: string;
  breaking: string;
  readOriginal: string;
  keyPoints: string;
  otherCoverage: string;
  related: string;
  source: string;
  editorialBadge: string;
  publishedAt: string;
  share: string;
  copied: string;
  copyLink: string;
  categories: Record<Category, string>;
  nav: { home: string; about: string; contact: string; editorial: string };
  footer: {
    privacy: string;
    terms: string;
    editorial: string;
    about: string;
    contact: string;
    rights: string;
    disclaimer: string;
  };
  search: string;
  searchPlaceholder: string;
  noResults: string;
  moreIn: string;
  advertisement: string;
  scores: { title: string; body: string; cta: string };
  empty: string;
  minutesAgo: string;
  pages: Record<
    "about" | "contact" | "privacy" | "terms" | "editorial",
    { title: string; intro: string; body: string[] }
  >;
  contactForm: { name: string; email: string; message: string; send: string; sent: string };
};

export const DICT: Record<Lang, Dict> = {
  ar: {
    siteName: "نبض الأخبار",
    tagline: "تجميع أخبار العالم من أهم المصادر، لحظة بلحظة",
    latest: "أحدث الأخبار",
    breaking: "عاجل",
    readOriginal: "اقرأ الخبر من المصدر ↗",
    keyPoints: "أبرز النقاط",
    otherCoverage: "تغطيات أخرى لنفس الخبر",
    related: "أخبار ذات صلة",
    source: "المصدر",
    editorialBadge: "تحرير أصلي",
    publishedAt: "نُشر في",
    share: "شارك",
    copied: "تم النسخ!",
    copyLink: "نسخ الرابط",
    categories: {
      world: "العالم",
      business: "اقتصاد",
      tech: "تقنية",
      sports: "رياضة",
      science: "علوم",
      culture: "ثقافة",
    },
    nav: { home: "الرئيسية", about: "من نحن", contact: "اتصل بنا", editorial: "المبادئ التحريرية" },
    footer: {
      privacy: "سياسة الخصوصية",
      terms: "شروط الاستخدام",
      editorial: "المبادئ التحريرية",
      about: "من نحن",
      contact: "اتصل بنا",
      rights: "جميع الحقوق محفوظة لأصحاب المحتوى الأصليين.",
      disclaimer:
        "نحن موقع تجميع أخبار: نعرض العنوان ومقتطفاً قصيراً مع رابط للمصدر الأصلي، ولا ننشر النص الكامل.",
    },
    search: "بحث",
    searchPlaceholder: "ابحث في العناوين...",
    noResults: "لا نتائج مطابقة.",
    moreIn: "المزيد في",
    advertisement: "مساحة إعلانية",
    scores: {
      title: "نتائج المباريات المباشرة",
      body: "تابع نتائج أهم مباريات اليوم لحظة بلحظة.",
      cta: "افتح لوحة النتائج ↗",
    },
    empty: "لا توجد أخبار بعد. سيتم جلب الأخبار تلقائياً قريباً.",
    minutesAgo: "قبل دقائق",
    pages: {
      about: {
        title: "من نحن",
        intro: "نبض الأخبار منصة تجميع أخبار مستقلة تعمل بثلاث لغات.",
        body: [
          "نجمع العناوين والمقتطفات من مصادر إخبارية معروفة عبر خدمات RSS الرسمية، ونعرضها في مكان واحد مرتّب وسريع.",
          "لا نكتب الأخبار ولا نعيد صياغتها، وكل خبر يحمل اسم مصدره ورابطاً مباشراً إليه.",
          "هدفنا أن نوفّر عليك وقت التنقل بين عشرات المواقع، مع احترام كامل لحقوق الناشرين الأصليين.",
        ],
      },
      contact: {
        title: "اتصل بنا",
        intro: "لأي ملاحظة أو طلب إزالة محتوى، تواصل معنا عبر النموذج.",
        body: [
          "نرد على طلبات أصحاب الحقوق خلال 48 ساعة كحد أقصى.",
          "إذا كنت ناشراً وترغب في إضافة أو إزالة مصدرك من قائمة التجميع، أخبرنا وسننفّذ ذلك فوراً.",
        ],
      },
      privacy: {
        title: "سياسة الخصوصية",
        intro: "نحترم خصوصيتك ونجمع أقل قدر ممكن من البيانات.",
        body: [
          "لا نطلب تسجيل حساب لقراءة الأخبار، ولا نجمع بيانات شخصية غير ضرورية.",
          "نستخدم إحصائيات زيارات مجهولة الهوية لفهم الصفحات الأكثر قراءة.",
          "نستخدم Google AdSense لعرض الإعلانات. تستخدم Google ملفات تعريف الارتباط لعرض إعلانات مخصصة بناءً على زياراتك السابقة لهذا الموقع ومواقع أخرى، ويمكنك تعطيل الإعلانات المخصصة من إعدادات إعلانات Google.",
          "لا نبيع بياناتك لأي طرف ثالث.",
        ],
      },
      terms: {
        title: "شروط الاستخدام",
        intro: "باستخدامك الموقع فإنك توافق على الشروط التالية.",
        body: [
          "المحتوى المعروض (العناوين والمقتطفات) ملك لأصحابه الأصليين، ويُعرض هنا بغرض الإحالة إلى المصدر.",
          "لا نضمن دقة أو اكتمال أي خبر؛ المرجع النهائي هو الموقع الأصلي.",
          "يُمنع نسخ محتوى الموقع بشكل آلي أو إعادة نشره كأنه محتوى أصلي.",
          "قد نغيّر هذه الشروط في أي وقت، وسيظهر التحديث على هذه الصفحة.",
        ],
      },
      editorial: {
        title: "المبادئ التحريرية",
        intro: "نحن موقع تجميع (Aggregator) ولسنا ناشراً أصلياً.",
        body: [
          "نجمع الأخبار تلقائياً من خدمات RSS العامة التي تنشرها المؤسسات الإخبارية بنفسها.",
          "نعرض العنوان ومقتطفاً لا يتجاوز 200 حرف، مع رابط واضح للخبر الكامل عند المصدر.",
          "كل الروابط الخارجية تحمل خاصية nofollow احتراماً لحقوق المصادر.",
          "المقالات الموسومة «تحرير أصلي» يكتبها فريق التحرير من حقائق موثّقة، وقد يُستعان فيها بأدوات ذكاء اصطناعي للصياغة مع مراجعة بشرية، والمصادر مذكورة في كل مقال.",
          "تواريخ النشر المعروضة هي التواريخ الحقيقية من المصدر، لا تاريخ الجلب.",
          "لطلب إزالة أي مصدر أو خبر، راسلنا من صفحة الاتصال وسنستجيب فوراً.",
        ],
      },
    },
    contactForm: {
      name: "الاسم",
      email: "البريد الإلكتروني",
      message: "رسالتك",
      send: "إرسال",
      sent: "شكراً لك، وصلتنا رسالتك.",
    },
  },
  en: {
    siteName: "NewsPulse",
    tagline: "World headlines from trusted sources, updated around the clock",
    latest: "Latest headlines",
    breaking: "Breaking",
    readOriginal: "Read original source ↗",
    keyPoints: "Key points",
    otherCoverage: "Other coverage of this story",
    related: "Related stories",
    source: "Source",
    editorialBadge: "Original Editorial",
    publishedAt: "Published",
    share: "Share",
    copied: "Copied!",
    copyLink: "Copy link",
    categories: {
      world: "World",
      business: "Business",
      tech: "Technology",
      sports: "Sports",
      science: "Science",
      culture: "Culture",
    },
    nav: { home: "Home", about: "About", contact: "Contact", editorial: "Editorial policy" },
    footer: {
      privacy: "Privacy policy",
      terms: "Terms of use",
      editorial: "Editorial policy",
      about: "About",
      contact: "Contact",
      rights: "All rights belong to the original publishers.",
      disclaimer:
        "We are a news aggregator: we show the headline and a short excerpt with a link to the original source. We never republish full articles.",
    },
    search: "Search",
    searchPlaceholder: "Search headlines...",
    noResults: "No matching headlines.",
    moreIn: "More in",
    advertisement: "Advertisement",
    scores: {
      title: "Live scores",
      body: "Follow today's key fixtures minute by minute.",
      cta: "Open the scoreboard ↗",
    },
    empty: "No stories yet. Headlines are fetched automatically.",
    minutesAgo: "minutes ago",
    pages: {
      about: {
        title: "About us",
        intro: "NewsPulse is an independent news aggregator published in three languages.",
        body: [
          "We collect headlines and short excerpts from established newsrooms through their official RSS feeds and present them in one fast, organised place.",
          "We do not write or rewrite the news. Every item carries its source name and a direct link.",
          "Our goal is to save you the trip across dozens of sites, while fully respecting original publishers.",
        ],
      },
      contact: {
        title: "Contact",
        intro: "For feedback or takedown requests, use the form below.",
        body: [
          "Rights holders receive a reply within 48 hours.",
          "Publishers who want their feed added or removed can tell us and we act immediately.",
        ],
      },
      privacy: {
        title: "Privacy policy",
        intro: "We respect your privacy and collect as little data as possible.",
        body: [
          "No account is needed to read the news and we do not collect unnecessary personal data.",
          "We use anonymous traffic statistics to understand which pages are read most.",
          "We use Google AdSense to serve ads. Google uses cookies to serve personalized ads based on your prior visits to this and other sites; you can opt out of personalized advertising in Google Ads Settings.",
          "We never sell your data to third parties.",
        ],
      },
      terms: {
        title: "Terms of use",
        intro: "By using this site you agree to the following terms.",
        body: [
          "Displayed content (headlines and excerpts) belongs to the original publishers and is shown to refer readers to the source.",
          "We make no guarantee of accuracy or completeness; the original site is the authority.",
          "Automated scraping or republishing of this site as original content is prohibited.",
          "These terms may change at any time and updates appear on this page.",
        ],
      },
      editorial: {
        title: "Editorial policy",
        intro: "We are an aggregator, not an original publisher.",
        body: [
          "Stories are collected automatically from public RSS feeds published by newsrooms themselves.",
          "We display the headline and an excerpt of at most 200 characters, with a clear link to the full story at the source.",
          "All outbound links use rel=nofollow out of respect for the sources.",
          "Articles labelled 'Original Editorial' are written by our editors from verified facts; AI tools may assist drafting under human review, and sources are cited in each article.",
          "Publication dates shown are the real source dates, not our fetch time.",
          "To request removal of a source or story, write to us from the contact page.",
        ],
      },
    },
    contactForm: {
      name: "Name",
      email: "Email",
      message: "Message",
      send: "Send",
      sent: "Thank you — your message reached us.",
    },
  },
  zh: {
    siteName: "新闻脉动",
    tagline: "汇聚全球权威媒体头条，全天候更新",
    latest: "最新头条",
    breaking: "快讯",
    readOriginal: "阅读原文 ↗",
    keyPoints: "要点",
    otherCoverage: "其他媒体的相关报道",
    related: "相关报道",
    source: "来源",
    editorialBadge: "原创编辑",
    publishedAt: "发布于",
    share: "分享",
    copied: "已复制！",
    copyLink: "复制链接",
    categories: {
      world: "国际",
      business: "财经",
      tech: "科技",
      sports: "体育",
      science: "科学",
      culture: "文化",
    },
    nav: { home: "首页", about: "关于我们", contact: "联系我们", editorial: "编辑原则" },
    footer: {
      privacy: "隐私政策",
      terms: "使用条款",
      editorial: "编辑原则",
      about: "关于我们",
      contact: "联系我们",
      rights: "所有内容版权归原始发布者所有。",
      disclaimer:
        "本站为新闻聚合平台：仅展示标题与简短摘要，并附上原文链接，不转载全文。",
    },
    search: "搜索",
    searchPlaceholder: "搜索标题…",
    noResults: "没有匹配的标题。",
    moreIn: "更多",
    advertisement: "广告位",
    scores: {
      title: "实时比分",
      body: "逐分钟关注今日重要赛事。",
      cta: "打开比分板 ↗",
    },
    empty: "暂无内容，系统会自动抓取头条。",
    minutesAgo: "分钟前",
    pages: {
      about: {
        title: "关于我们",
        intro: "新闻脉动是一个独立的三语新闻聚合平台。",
        body: [
          "我们通过各大新闻机构的官方 RSS 订阅源收集标题与摘要，集中呈现，快速整齐。",
          "我们不撰写也不改写新闻，每条内容都标注来源并提供直接链接。",
          "目标是免去您在数十个网站间来回切换，同时完全尊重原始发布者的权益。",
        ],
      },
      contact: {
        title: "联系我们",
        intro: "如有反馈或内容移除请求，请使用下方表单。",
        body: [
          "版权方的请求将在 48 小时内得到回复。",
          "媒体如需添加或移除自己的订阅源，请告知我们，我们会立即处理。",
        ],
      },
      privacy: {
        title: "隐私政策",
        intro: "我们尊重您的隐私，并尽可能少地收集数据。",
        body: [
          "阅读新闻无需注册账号，我们不收集不必要的个人信息。",
          "我们使用匿名访问统计来了解哪些页面阅读量最高。",
          "我们使用 Google AdSense 展示广告。Google 会使用 Cookie，根据您此前对本网站及其他网站的访问投放个性化广告；您可以在 Google 广告设置中选择退出个性化广告。",
          "我们绝不向第三方出售您的数据。",
        ],
      },
      terms: {
        title: "使用条款",
        intro: "使用本站即表示您同意以下条款。",
        body: [
          "所展示内容（标题与摘要）版权归原始发布者，展示目的是引导读者访问来源。",
          "我们不保证内容的准确性或完整性，原始网站为最终依据。",
          "禁止自动抓取本站内容或将其作为原创内容再次发布。",
          "条款可能随时更新，更新内容将显示在本页。",
        ],
      },
      editorial: {
        title: "编辑原则",
        intro: "我们是新闻聚合平台，不是原创发布者。",
        body: [
          "内容自动来自新闻机构自行发布的公开 RSS 订阅源。",
          "我们展示标题与不超过 200 字符的摘要，并提供指向来源全文的清晰链接。",
          "所有外部链接均带 nofollow 属性，以尊重来源权益。",
          "标注为“原创编辑”的文章由编辑团队根据核实事实撰写，起草时可能在人工审核下使用人工智能工具辅助，每篇文章均注明来源。",
          "显示的发布时间为来源的真实时间，而非抓取时间。",
          "如需移除某个来源或内容，请通过联系页面告知我们。",
        ],
      },
    },
    contactForm: {
      name: "姓名",
      email: "邮箱",
      message: "留言",
      send: "发送",
      sent: "感谢您，我们已收到留言。",
    },
  },
};

export function formatDate(iso: string, lang: Lang) {
  const locale = lang === "ar" ? "ar" : lang === "zh" ? "zh-CN" : "en-GB";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
