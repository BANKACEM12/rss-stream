import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { adminDb, hasDbCronToken } from "@/lib/cron-token.server";
import { writeArticle, type QueueArticle } from "@/lib/article-writer.server";
import { chatCompletion, listModels, modelChain } from "@/lib/cleanapis.server";

const BATCH_SIZE = 3;
const CLAIM_MINUTES = 10;
const MAX_ATTEMPTS = 20;

/**
 * AI article generation queue. Every cron run picks the newest articles
 * that have no AI body yet and writes one. Provider/billing outages abort
 * the run without burning per-article retry budget, so generation resumes
 * by itself the moment the provider recovers.
 */
async function runGenerate(limit: number) {
  const apiKey = process.env["cleanapis"];
  if (!apiKey) throw new Error("cleanapis secret is not configured");
  const db = adminDb();
  const staleBefore = new Date(Date.now() - CLAIM_MINUTES * 60_000).toISOString();

  const { data: pending, error } = await db
    .from("articles")
    .select("id, slug, title, summary, lang, category, keywords, source_name, body_attempts")
    .is("body", null)
    .lt("body_attempts", MAX_ATTEMPTS)
    .or(`body_started_at.is.null,body_started_at.lt.${staleBefore}`)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`queue read failed: ${error.message}`);

  let generated = 0;
  const failures: string[] = [];

  for (const row of (pending ?? []) as (QueueArticle & { body_attempts: number })[]) {
    // Claim the row so overlapping runs skip it.
    await db
      .from("articles")
      .update({ body_started_at: new Date().toISOString() })
      .eq("id", row.id);

    const { data: related } = await db
      .from("articles")
      .select("slug, title")
      .eq("lang", row.lang)
      .eq("category", row.category)
      .neq("id", row.id)
      .order("published_at", { ascending: false })
      .limit(2);

    const result = await writeArticle(apiKey, row, related ?? []);

    if (result.ok) {
      await db
        .from("articles")
        .update({
          body: result.bodyHtml,
          body_model: result.model,
          body_generated_at: new Date().toISOString(),
          body_started_at: null,
        })
        .eq("id", row.id);
      generated++;
      continue;
    }

    if (result.fatal) {
      // Provider/billing outage: release the claim untouched and stop the
      // run — retry budget stays intact and the next cron run self-heals.
      await db.from("articles").update({ body_started_at: null }).eq("id", row.id);
      return { aborted: result.error, generated, failures, pending: (pending ?? []).length };
    }

    await db
      .from("articles")
      .update({ body_attempts: row.body_attempts + 1, body_started_at: null })
      .eq("id", row.id);
    failures.push(`${row.slug}: ${result.error}`);
  }

  return { generated, failures, pending: (pending ?? []).length };
}

/** Diagnostic: lists provider models and pings the first fallback model. */
async function selfTest() {
  const apiKey = process.env["cleanapis"];
  if (!apiKey) return { ok: false, error: "cleanapis secret is not configured" };
  const models = await listModels(apiKey);
  const chain = modelChain();
  const probe = await chatCompletion(
    apiKey,
    chain[0]!,
    [{ role: "user", content: "Reply with the single word: OK" }],
    16,
  );
  return {
    ok: probe.ok,
    availableModels: models,
    fallbackChain: chain,
    probe: probe.ok ? { model: chain[0], reply: probe.text.slice(0, 40) } : probe,
  };
}

async function handle({ request }: { request: Request }) {
  if (!(await hasDbCronToken(request))) {
    const unauthorized = await authenticateCronRequest(request);
    if (unauthorized) return unauthorized;
  }
  const url = new URL(request.url);
  try {
    if (url.searchParams.get("selftest") === "1") {
      return Response.json(await selfTest());
    }
    const limit = Math.min(Number(url.searchParams.get("limit")) || BATCH_SIZE, 10);
    const result = await runGenerate(limit);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      { ok: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/generate-articles")({
  server: { handlers: { GET: handle, POST: handle } },
});
