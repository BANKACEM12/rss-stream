import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { reindexArticleSlugs } from "../src/lib/article-slugs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src", "data");
const archiveDir = join(dataDir, "archive");
const readJson = (path, fallback) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
};
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value));

const paths = [
  join(dataDir, "articles.json"),
  join(dataDir, "editorial.json"),
  ...readdirSync(archiveDir)
    .filter((name) => /^\d{4}-\d{2}\.json$/.test(name))
    .sort()
    .map((name) => join(archiveDir, name)),
];
const records = paths.map((path) => ({ path, rows: readJson(path, []) }));
const allArticles = records.flatMap(({ rows }) => rows);
const aliasesPath = join(dataDir, "url-aliases.json");
const aliasesBefore = readJson(aliasesPath, {});
const indexPath = join(dataDir, "archive-index.json");
const index = readJson(indexPath, {});
const originalSlugs = new Map();
const monthBySlug = new Map();

for (const { path, rows } of records) {
  const monthMatch = path.match(/(\d{4}-\d{2})\.json$/);
  for (const article of rows) {
    if (article.slug) originalSlugs.set(article, article.slug);
    if (monthMatch && article.slug) monthBySlug.set(article.slug, monthMatch[1]);
  }
}

const { aliases } = reindexArticleSlugs(allArticles, aliasesBefore);
let changed = 0;
for (const { path, rows } of records) {
  for (const article of rows) {
    if (originalSlugs.get(article) !== article.slug) changed += 1;
    const month = monthBySlug.get(originalSlugs.get(article)) ?? article.published_at?.slice(0, 7);
    if (month && /\/archive\//.test(path)) index[article.slug] = month;
  }
  writeJson(path, rows);
}

writeJson(indexPath, index);
writeJson(aliasesPath, aliases);
console.log(`Reindexed ${allArticles.length} records; ${changed} rows changed; ${Object.keys(aliases).length} old URLs preserved.`);