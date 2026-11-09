const MAX_HEADLINE_LENGTH = 72;

export function slugifyHeadline(value, maxLength = MAX_HEADLINE_LENGTH) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ـ\u00ad]/g, "")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized.length <= maxLength) return normalized;
  const cut = normalized.slice(0, maxLength);
  return (cut.includes("-") ? cut.replace(/-[^-]*$/, "") : cut).replace(/-+$/g, "");
}

function getSourceSlug(article) {
  const sourceName = slugifyHeadline(article.source_name ?? "", 36);
  if (sourceName) return sourceName;

  try {
    return slugifyHeadline(new URL(article.link).hostname.replace(/^www\./, ""), 36) || "source";
  } catch {
    return "source";
  }
}

function getLinkWords(article) {
  try {
    const pathname = new URL(article.link).pathname
      .split("/")
      .filter(Boolean)
      .filter((part) => !/^\d+$/.test(part))
      .join(" ");
    return slugifyHeadline(pathname, 36);
  } catch {
    return "";
  }
}

function identity(article, index) {
  return String(article.guid || article.id || `${article.lang}:${article.link || article.title}:${index}`);
}

function dateSlug(article) {
  const value = String(article.published_at ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function uniqueByIdentity(articles) {
  const unique = new Map();
  articles.forEach((article, index) => {
    const key = identity(article, index);
    const existing = unique.get(key);
    if (!existing) unique.set(key, { article, key, index });
  });
  return [...unique.values()];
}

function buildCandidates(items, base) {
  if (items.length === 1) return [[items[0], base]];

  const bySource = new Map();
  for (const item of items) {
    const source = getSourceSlug(item.article);
    const group = bySource.get(source) ?? [];
    group.push(item);
    bySource.set(source, group);
  }

  const candidates = [];
  for (const [source, sourceItems] of bySource) {
    for (const item of sourceItems) {
      const date = dateSlug(item.article);
      const suffix = sourceItems.length > 1 && date ? `${source}-${date}` : source;
      candidates.push([item, `${base}-${suffix}`]);
    }
  }

  const collisions = new Map();
  for (const [item, candidate] of candidates) {
    const group = collisions.get(candidate) ?? [];
    group.push(item);
    collisions.set(candidate, group);
  }

  return candidates.map(([item, candidate]) => {
    const sameCandidate = collisions.get(candidate) ?? [];
    if (sameCandidate.length === 1) return [item, candidate];

    const category = slugifyHeadline(item.article.category ?? "", 24);
    const linkWords = getLinkWords(item.article);
    const moreMeaning = [category, linkWords].filter(Boolean).join("-");
    return [item, moreMeaning ? `${candidate}-${moreMeaning}` : `${candidate}-edition`];
  });
}

/** Replace generated ID suffixes with headline slugs and meaningful collision context. */
export function reindexArticleSlugs(articles, previousAliases = {}) {
  const rows = articles.map((article, index) => ({ article, oldSlug: article.slug, index }));
  const unique = uniqueByIdentity(articles);
  const grouped = new Map();

  for (const item of unique) {
    const base = slugifyHeadline(item.article.title) || slugifyHeadline(item.article.source_name, 36) || "news-article";
    const groupKey = `${item.article.lang ?? ""}:${base}`;
    const group = grouped.get(groupKey) ?? [];
    group.push({ ...item, base });
    grouped.set(groupKey, group);
  }

  const slugByIdentity = new Map();
  const used = new Map();
  for (const group of grouped.values()) {
    const proposals = buildCandidates(group, group[0].base);
    for (const [item, proposal] of proposals) {
      const langKey = String(item.article.lang ?? "");
      const usedForLang = used.get(langKey) ?? new Set();
      let candidate = proposal;
      let edition = 2;
      while (usedForLang.has(candidate)) {
        candidate = `${proposal}-edition-${edition}`;
        edition += 1;
      }
      usedForLang.add(candidate);
      used.set(langKey, usedForLang);
      slugByIdentity.set(item.key, candidate);
    }
  }

  const canonicalByOldSlug = new Map();
  for (const row of rows) {
    const key = identity(row.article, row.index);
    const slug = slugByIdentity.get(key) ?? slugifyHeadline(row.article.title) || "news-article";
    if (row.oldSlug) canonicalByOldSlug.set(row.oldSlug, slug);
    row.article.slug = slug;
  }

  const aliases = {};
  const resolve = (slug) => {
    let value = slug;
    const visited = new Set();
    while (value && !visited.has(value)) {
      visited.add(value);
      const next = canonicalByOldSlug.get(value) ?? previousAliases[value];
      if (!next || next === value) break;
      value = next;
    }
    return value;
  };

  for (const [oldSlug, target] of Object.entries(previousAliases)) {
    const canonical = resolve(target);
    if (oldSlug !== canonical) aliases[oldSlug] = canonical;
  }
  for (const row of rows) {
    if (row.oldSlug && row.oldSlug !== row.article.slug) {
      aliases[row.oldSlug] = row.article.slug;
    }
  }

  return { aliases, canonicalByOldSlug };
}