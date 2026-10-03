import { createClient } from "@supabase/supabase-js";

/** Service-role client for privileged server work (cron endpoints). */
export function adminDb() {
  return createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * The scheduled database job authenticates with the token stored in
 * ingest_state.cron_token (same mechanism as /api/public/ingest).
 */
export async function hasDbCronToken(request: Request): Promise<boolean> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return false;
  const { data } = await adminDb()
    .from("ingest_state")
    .select("cron_token")
    .eq("id", "singleton")
    .maybeSingle();
  return Boolean(data?.cron_token) && data!.cron_token === token;
}
