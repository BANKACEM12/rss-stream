import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { FEEDS } from "@/lib/sources";
import { parseFeed, toIso } from "@/lib/rss.server";
import { excerpt, extractKeywords, slugify } from "@/lib/keywords";

const FEEDS_PER_RUN = 10;
const ITEMS_PER_FEED = 15;
const LEASE_MINUTES = 5;

function admin() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function hash(input: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  return h1.toString(36);
}

async function runIngest() {
  const db = admin();
  const now = new Date();

  const { data: state, error: stateError } = await db
    .from("ingest_state")
    .select("cursor, paused, lease_until, inserted_total")
    .eq("id", "singleton")
    .maybeSingle();

  if (stateError) throw new Error(`state read failed: ${stateError.message}`);
  if (state?.paused) return { skipped: "paused" as const, inserted: 0 };
  if (state?.lease_until && new Date(state.lease_until) > now) {
    return { skipped: "already_running" as const, inserted: 0 };
  }

  // Single-flight lease.
  const leaseUntil = new Date(now.getTime() + LEASE_MINUTES * 60_000).toISOString();
  const { error: leaseError } = await db
    .from("ingest_state")
    .update({ lease_until: leaseUntil })
    .eq("id", "singleton")
    .or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`);
  if (leaseError) throw new Error(`lease failed: ${leaseError.message}`);

  const start = (state?.cursor ?? 0) % FEEDS.length;
  const batch = Array.from({ length: Math.min(FEEDS_PER_RUN, FEEDS.length) }, (_, i) =>
    FEEDS[(start + i) % FEEDS.length]!,
  );

  let inserted = 0;
  const failures: string[] = [];

  for (const feed of batch) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; NewsPulseBot/1.0; +aggregator, headlines only)",
          accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const items = parseFeed(await response.text()).slice(0, ITEMS_PER_FEED);

      const rows = items
        .filter((item) => item.title.length > 8)
        .map((item) => {
          const guid = `${feed.lang}:${hash(item.guid || item.link)}`;
          const summary = excerpt(item.description || item.title, 200);
          return {
            guid,
            slug: slugify(item.title, hash(guid)),
            title: excerpt(item.title, 180),
            summary,
            link: item.link,
            source_name: feed.source,
            source_url: feed.siteUrl,
            lang: feed.lang,
            category: feed.category,
            image_url: item.image,
            keywords: extractKeywords(`${item.title} ${summary}`),
            published_at: toIso(item.pubDate),
          };
        });

      if (rows.length) {
        // Idempotent: duplicate guids are ignored, never re-inserted.
        const { data, error } = await db
          .from("articles")
          .upsert(rows, { onConflict: "guid", ignoreDuplicates: true })
          .select("id");
        if (error) throw new Error(error.message);
        inserted += data?.length ?? 0;
      }
    } catch (error) {
      failures.push(`${feed.source} (${feed.category}): ${(error as Error).message}`);
    }
  }

  await db
    .from("ingest_state")
    .update({
      lease_until: null,
      cursor: (start + batch.length) % FEEDS.length,
      last_run_at: new Date().toISOString(),
      last_error: failures.length ? failures.join(" | ").slice(0, 800) : null,
      inserted_total: (state?.inserted_total ?? 0) + inserted,
    })
    .eq("id", "singleton");

  // Housekeeping: keep the free database small.
  await db
    .from("articles")
    .delete()
    .lt("published_at", new Date(Date.now() - 45 * 86_400_000).toISOString());

  return {
    feeds: batch.length,
    inserted,
    failures,
    nextCursor: (start + batch.length) % FEEDS.length,
  };
}

/** The scheduled database job authenticates with a token stored in ingest_state. */
async function hasDbToken(request: Request): Promise<boolean> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return false;
  const { data } = await admin()
    .from("ingest_state")
    .select("cron_token")
    .eq("id", "singleton")
    .maybeSingle();
  return Boolean(data?.cron_token) && data!.cron_token === token;
}

async function handle({ request }: { request: Request }) {
  if (!(await hasDbToken(request))) {
    const unauthorized = await authenticateCronRequest(request);
    if (unauthorized) return unauthorized;
  }
  try {
    const result = await runIngest();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: (error as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/public/ingest")({
  server: { handlers: { GET: handle, POST: handle } },
});
