/**
 * Zero-cost keyword extraction (RAKE-style): stopword removal + frequency
 * ranking. No AI, no API calls.
 */

const STOPWORDS = new Set<string>([
  // English
  "the","a","an","and","or","but","if","of","at","by","for","with","about","against","between","into","through","during","before","after","above","below","to","from","up","down","in","out","on","off","over","under","again","further","then","once","here","there","all","any","both","each","few","more","most","other","some","such","no","nor","not","only","own","same","so","than","too","very","can","will","just","should","now","is","are","was","were","be","been","being","have","has","had","do","does","did","this","that","these","those","it","its","as","he","she","they","we","you","his","her","their","our","your","says","said","new","after","amid",
  // Arabic
  "في","من","على","عن","إلى","الى","مع","هذا","هذه","ذلك","التي","الذي","كان","كانت","بعد","قبل","بين","خلال","حول","أن","إن","ان","ما","لا","لم","لن","قد","كل","هو","هي","هم","به","بها","له","لها","أو","او","ثم","حتى","عند","منذ","أمام","ضد","دون","غير","أيضا","أيضاً",
]);

const SPLIT = /[^\p{L}\p{N}]+/u;

export function extractKeywords(text: string, limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().split(SPLIT)) {
    const word = raw.trim();
    if (word.length < 2) continue;
    if (STOPWORDS.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    // CJK: single chars carry little signal, require 2+ chars (already ensured)
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

export function slugify(text: string, fallback: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 70)
    .replace(/^-+|-+$/g, "");
  return `${base || "story"}-${fallback}`;
}

export function excerpt(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
