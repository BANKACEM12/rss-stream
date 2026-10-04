/**
 * Clean APIs (cleanapis.com) — OpenAI-compatible gateway client.
 *
 * Quirk discovered while testing: non-streaming requests hide upstream
 * errors behind an opaque Cloudflare "error code: 502" page. Streaming
 * requests return the real provider error (e.g. billing) inside the SSE
 * stream. Therefore ALL chat calls here use stream:true and accumulate
 * the deltas — this is both more robust and the only way to read real
 * error messages from this provider.
 */

export type ChatMessage = { role: "system" | "user"; content: string };

export type ChatResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string; billing: boolean; providerDown: boolean };

const API_URL = "https://cleanapis.com/v1/chat/completions";
const MODELS_URL = "https://cleanapis.com/v1/models";

/** Ordered fallback chain. Override with CLEANAPIS_MODELS="a,b,c". */
export const DEFAULT_MODELS = [
  "gemini-3.7-flash",
  "deepseek-v4-flash-0731",
  "kimi-k2.6",
  "glm-5.3",
];

export function modelChain(): string[] {
  const fromEnv = process.env["CLEANAPIS_MODELS"];
  if (fromEnv?.trim()) {
    return fromEnv.split(",").map((m) => m.trim()).filter(Boolean);
  }
  return DEFAULT_MODELS;
}

function isBillingError(status: number, text: string): boolean {
  return status === 402 || /billing|payment method|insufficient|balance/i.test(text);
}

function isProviderDown(status: number, text: string): boolean {
  return status === 0 || status >= 500 || /error code: 5\d\d/i.test(text);
}

export async function chatCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens = 2500,
): Promise<ChatResult> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "text/event-stream",
      },
      body: JSON.stringify({ model, messages, stream: true, max_tokens: maxTokens }),
      signal: AbortSignal.timeout(150_000),
    });
  } catch (error) {
    return { ok: false, status: 0, error: (error as Error).message, billing: false, providerDown: true };
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    const snippet = text.slice(0, 300);
    return {
      ok: false,
      status: res.status,
      error: snippet || `HTTP ${res.status}`,
      billing: isBillingError(res.status, text),
      providerDown: isProviderDown(res.status, text),
    };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  let streamError: string | null = null;
  let finished = false;

  outer: for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      if (payload === "[DONE]") {
        // Clean APIs keeps SSE connections alive after completion
        // ("hour-long connections") — stop at [DONE] instead of hanging.
        finished = true;
        break outer;
      }
      try {
        const json = JSON.parse(payload) as {
          error?: { message?: string };
          choices?: { delta?: { content?: string } }[];
        };
        if (json.error) {
          streamError = json.error.message ?? "stream error";
          continue;
        }
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === "string") output += delta;
      } catch {
        // Partial JSON chunk — ignored; SSE lines here arrive line-aligned.
      }
    }
  }

  if (!output.trim()) {
    const error = streamError ?? "empty completion";
    return {
      ok: false,
      status: 200,
      error,
      billing: streamError ? isBillingError(200, streamError) : false,
      providerDown: streamError ? isProviderDown(200, streamError) : false,
    };
  }
  return { ok: true, text: output };
}

export async function listModels(apiKey: string): Promise<string[]> {
  const res = await fetch(MODELS_URL, {
    headers: { authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`models endpoint HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { id?: string }[] };
  return (json.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
}
