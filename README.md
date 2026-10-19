# News Pulse

> **Architecture (Oct 2026): fully static — no Supabase, no Lovable Cloud.**
> News are ingested at build time by `node scripts/ingest.mjs` into
> `src/data/articles.json` (bundled with the app). The `prebuild` npm script
> refreshes the news on every deploy, and `.github/workflows/refresh-news.yml`
> re-ingests every 30 minutes, commits the JSON, and pushes — which triggers a
> Lovable redeploy. Hosting: `rss-stream.lovable.app` subdomain only.
> GitHub is the single source of truth.

# شرح كامل بالعربية — بناء موقع أخبار احترافي متعدد الفئات بتكلفة صفر

سأشرح لك المشروع من الألف إلى الياء بالعربية، خطوة بخطوة، حتى تفهم كل جزء قبل ما تنسخ الكود.

---

## 🎯 الفكرة الأساسية للمشروع

أنت تبني **موقع تجميع أخبار (News Aggregator)** يعني:

> موقع **لا يكتب أخبارًا بنفسه**، بل **يسحب الأخبار تلقائيًا** من مواقع أخرى كبيرة (BBC, Reuters, الجزيرة, 36kr الصيني...) عبر **RSS Feeds**، ثم يعرضها بشكل مرتب وجميل، مع **رابط للخبر الأصلي**.

**لماذا هذه الطريقة ذكية؟**

| الميزة | الشرح |

|---|---|

| ✅ **تكلفة صفر** | لا تدفع لـ OpenAI أو أي API ذكاء اصطناعي |

| ✅ **تحديث تلقائي** | كل 30 دقيقة الموقع يجلب أخبار جديدة لوحده |

| ✅ **محتوى قانوني** | تعرض فقط العنوان + ملخص + رابط المصدر |

| ✅ **SEO قوي** | جوجل يحب المواقع التي تحدّث نفسها باستمرار |

| ✅ **لا تحتاج كتابة** | لا تكتب أي خبر بنفسك |

---

## 🧩 شرح المكونات الستة الأساسية

### 1️⃣ محرك سحب الأخبار (RSS Engine)

**ما هو RSS؟**

RSS هو ملف بسيط تنشره المواقع الإخبارية، فيه آخر أخبارها بشكل منظم:

```xml

<item>

  <title>زلزال في اليابان</title>

  <link>https://bbc.com/news/123</link>

  <description>زلزال بقوة 6.5 يضرب...</description>

  <pubDate>2025-01-15</pubDate>

</item>

```

**كيف نستفيد منه؟**

- برنامج صغير (`scripts/ingest.js`) يقرأ هذه الملفات كل 30 دقيقة

- يأخذ العنوان + الملخص + الرابط + التاريخ

- يخزّنها في قاعدة بيانات (Supabase مجاني)

- **لا ننسخ النص الكامل** — فقط مقتطف صغير + رابط للمصدر (حتى لا نخالف حقوق النشر)

**التكرار (Deduplication):**

كل خبر له رقم فريد (GUID)، فإذا سحبنا نفس الخبر مرتين، النظام يتجاهل الثاني تلقائيًا.

---

### 2️⃣ استخراج الكلمات المفتاحية **بدون ذكاء اصطناعي**

هنا السؤال الذكي: كيف نصنع "tags" و"مواضيع مرتبطة" بدون دفع لـ OpenAI؟

**الحل:** نستخدم خوارزمية **RAKE** (خوارزمية رياضية قديمة مجانية):

1. نقسم العنوان إلى كلمات

2. نحذف الكلمات الشائعة (the, a, of, in...)

3. نحسب تكرار كل كلمة

4. الكلمات الأكثر تكرارًا = الكلمات المفتاحية

**مثال:**

```

عنوان: "Apple launches new AI chip for iPhone"

الكلمات المفتاحية: apple, launches, chip, iphone

```

هذا يكفي تمامًا لإنشاء **Related Stories** و**Tags** داخلية — **بدون أي تكلفة**.

---

### 3️⃣ تحسين محركات البحث (SEO)

#### 📍 Sitemap.xml (خريطة الموقع)

ملف يُخبر جوجل بكل صفحات موقعك. يُحدَّث **تلقائيًا** عند إضافة أخبار جديدة.

#### 📍 Canonical URLs

كل صفحة لها رابط واحد رسمي، حتى لا يعاقبك جوجل على "محتوى مكرر".

#### 📍 hreflang (3 لغات)

```html

<link rel="alternate" hreflang="en" href=".../en/articles/xyz" />

<link rel="alternate" hreflang="ar" href=".../ar/articles/xyz" />

<link rel="alternate" hreflang="zh" href=".../zh/articles/xyz" />

```

يقول لجوجل: "هذه نفس الصفحة بثلاث لغات، لا تعتبرها تكرارًا".

#### 📍 JSON-LD (بيانات منظمة)

كود مخفي يخبر جوجل: "هذا خبر، تاريخه كذا، مصدره كذا". يجعلك تظهر في **Google News** و**Top Stories**.

#### 📍 robots.txt

ملف يخبر محركات البحث ما يُسمح لها بزحفه. نسمح لـ `Googlebot-News` و `Baiduspider` (الباحث الصيني) بالمرور بحرية.

---

### 4️⃣ الروابط الداخلية والخارجية الذكية

| النوع | الوصف | الفائدة |

|---|---|---|

| **خارجي** | `Read Original Source ↗` مع `rel="nofollow"` | يحترم حقوق المصدر + لا ينقل قوة موقعك |

| **داخلي (Related Stories)** | 4-5 أخبار مشابهة في نفس التصنيف | يزيد مدة بقاء الزائر + يحبه جوجل |

| **GlobalScore (رياضة)** | صندوق يربط لموقع نتائج مباشرة | قيمة مضافة للزائر |

---

### 5️⃣ الصفحات الأساسية الثمانية

| # | الصفحة | الوظيفة |

|---|---|---|

| 1 | الرئيسية `/` | أخبار عاجلة + تصنيفات + بحث |

| 2 | تصنيف `/category/tech` | كل أخبار التقنية |

| 3 | مقال `/articles/xyz` | الخبر الكامل + المصدر + ذو صلة |

| 4 | من نحن `/about` | هويتك ومهمتك (مهم لجوجل - EEAT) |

| 5 | اتصل بنا `/contact` | نموذج تواصل |

| 6 | سياسة الخصوصية `/privacy` | مطلوب لـ AdSense + GDPR |

| 7 | الشروط `/terms` | شروط استخدام المحتوى المُعاد نشره |

| 8 | المبادئ التحريرية `/editorial` | توضيح أنك تجميع RSS وليس ناشر أصلي ⚠️ **مهم جدًا قانونيًا** |

---

### 6️⃣ واجهة المستخدم والربح

- **Tailwind CSS** = تصميم سريع وجميل ومتوافق مع الجوال

- **Ad Slots** = أماكن جاهزة للإعلانات:

  - Leaderboard (أعلى الصفحة)

  - In-Article (داخل المقال)

  - Sidebar (جانبي)

  - Sticky Footer (ملتصق بالأسفل)

- متوافق مع **AdSense** و **Ezoic** و **Native Ads**

- **CLS = 0** (لا يقفز التصميم أثناء التحميل → جوجل يحبه)

---

## 🔄 كيف يعمل كل شيء معًا؟ (دورة الحياة)

```

1. GitHub Actions يشتغل كل 30 دقيقة (مجاني)

         ↓

2. يشغّل scripts/ingest.js

         ↓

3. يقرأ RSS من 20 مصدر (BBC, الجزيرة, 36kr, ESPN...)

         ↓

4. يستخرج الكلمات المفتاحية (RAKE محلي)

         ↓

5. يحفظ في Supabase (500MB مجانًا)

         ↓

6. Vercel / Cloudflare يعيد بناء الصفحات

         ↓

7. Sitemap يُحدَّث تلقائيًا

         ↓

8. جوجل يزحف ويفهرس الأخبار الجديدة

         ↓

9. الزوار يأتون من البحث

         ↓

10. الإعلانات تُحقّق أرباحًا 💰

```

---

## 💰 لماذا التكلفة صفر فعلًا؟

| المكوّن | الخدمة | المجاني |

|---|---|---|

| استضافة الموقع | Vercel / Cloudflare Pages | ✅ لا محدود |

| قاعدة البيانات | Supabase | ✅ 500MB |

| المهام المجدولة | GitHub Actions | ✅ 2000 دقيقة/شهر |

| الصور | Unsplash / Cloudflare | ✅ مجاني |

| الترجمة | RSS متعدد اللغات أصلاً | ✅ صفر |

| الكلمات المفتاحية | RAKE Algorithm | ✅ صفر |

| البحث | Pagefind | ✅ صفر |

| الإحصائيات | Umami / Cloudflare | ✅ صفر |

| **الإجمالي** | | **0 $** |

---

## ⚠️ تحذيرات مهمة (حتى لا يعاقبك جوجل)

1. **لا تنسخ النص الكامل** للأخبار — فقط 150-200 حرف + رابط المصدر

2. **استخدم `nofollow`** على كل رابط خارجي

3. **صفحة `/editorial`** يجب أن توضح بشكل صريح:

   > "نحن موقع تجميع، المحتوى ملك أصحابه الأصليين، نعرض المقتطفات مع روابط للمصدر"

4. **لا تستخدم AI لتوليد محتوى** — جوجل يعاقب المواقع "AI-Only"

5. **التاريخ الحقيقي للنشر** في JSON-LD (ليس تاريخ السحب)

6. **لا تستخدم `?lang=`** في الروابط — استخدم `/en/`, `/ar/`, `/zh/`

---

## 📂 هيكل المشروع (شرح كل مجلد)

```

news-aggregator/

│

├── app/                          # كل الصفحات (Next.js 14)

│   ├── [lang]/                   # المتغير: en/ar/zh

│   │   ├── page.tsx              # الصفحة الرئيسية

│   │   ├── category/[slug]/      # صفحات التصنيفات

│   │   ├── articles/[slug]/      # صفحة المقال

│   │   ├── about/ contact/       # صفحات ثابتة

│   │   ├── privacy/ terms/

│   │   ├── editorial/

│   │   └── layout.tsx            # يضبط RTL للعربية

│   ├── sitemap.ts                # يُولّد sitemap.xml تلقائيًا

│   ├── robots.ts                 # يُولّد robots.txt

│   └── layout.tsx                # التخطيط العام

│

├── components/                   # مكونات قابلة لإعادة الاستخدام

│   ├── AdSlot.tsx                # مساحات الإعلانات

│   ├── RelatedStories.tsx        # أخبار مشابهة

│   ├── GlobalScoreBox.tsx        # صندوق الرياضة

│   ├── LanguageSwitcher.tsx      # تبديل اللغة

│   └── NewsCard.tsx              # بطاقة الخبر

│

├── scripts/ingest.js             # محرك سحب RSS (الأهم!)

├── lib/supabase.ts               # اتصال قاعدة البيانات

├── middleware.ts                 # إعادة توجيه اللغات

├── .github/workflows/ingest.yml  # المهمة المجدولة

└── tailwind.config.ts            # إعدادات التصميم

```

---

## 🚀 خطوات الإطلاق العملية

1. **أنشئ حساب مجاني** على: Vercel + Supabase + GitHub

2. **انشئ مشروع Supabase** — جدول واحد اسمه `articles`

3. **انسخ الكود** إلى مستودع GitHub

4. **اضبط Secrets** في GitHub (مفاتيح Supabase)

5. **اربط المستودع بـ Vercel** — ينشر تلقائيًا

6. **أضف موقعك** في:

   - Google Search Console

   - Google News Publisher

   - Baidu 站长平台 (للسوق الصيني)

7. **انتظر 24-48 ساعة** حتى يبدأ جوجل بالفهرسة

---

## ✅ الخلاصة في 5 أسطر

1. موقع يجمع الأخبار من RSS تلقائيًا — **بدون كتابة وبدون AI مدفوع**

2. يعرض: عنوان + ملخص + رابط المصدر + أخبار مشابهة

3. محسّن لجوجل وجوجل نيوز وبايدو بـ sitemap و JSON-LD و hreflang

4. 3 لغات (عربي/إنجليزي/صيني) بدون أي تكلفة ترجمة

5. يعمل بالكامل مجانًا: Vercel + Supabase + GitHub Actions

---

## 🤔 هل تريد الخطوة التالية؟

أخبرني أيهم تريد وأعطيك **الكود الكامل القابل للنسخ فورًا**:

- **أ)** `package.json` + كل ملفات الصفحات `.tsx` كاملة

- **ب)** SQL لإنشاء جدول `articles` في Supabase

- **ج)** كل نصوص واجهة المستخدم بالعربية (الصفحات الثابتة)

- **د)** قائمة بـ 50 مصدر RSS عربي + صيني + إنجليزي جاهزة

- **هـ)** دليل مصوّر خطوة بخطوة لنشر الموقع

اختر واحدًا أو أكثر وسأبدأ به فورًا 👇

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rss-stream.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/adce064f-55de-4ed3-ab1b-2ec8a6aabadc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
