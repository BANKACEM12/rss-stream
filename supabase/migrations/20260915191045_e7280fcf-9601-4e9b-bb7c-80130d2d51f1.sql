CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guid TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  link TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  lang TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX articles_lang_published_idx ON public.articles (lang, published_at DESC);
CREATE INDEX articles_lang_category_published_idx ON public.articles (lang, category, published_at DESC);
CREATE INDEX articles_keywords_idx ON public.articles USING GIN (keywords);

GRANT SELECT ON public.articles TO anon;
GRANT SELECT ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read articles" ON public.articles FOR SELECT USING (true);