/**
 * Discord bot HTTP helper with 429 handling. Use for bot POST/GET so mass DMs back off instead of hammering the API.
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(maxMs: number): number {
  return Math.floor(Math.random() * (maxMs + 1));
}

async function retryAfterMsFromResponse(res: Response): Promise<number> {
  const header = res.headers.get("retry-after");
  if (header) {
    const sec = parseFloat(header);
    if (!Number.isNaN(sec)) return Math.max(500, Math.ceil(sec * 1000));
  }
  try {
    const text = await res.text();
    const json = JSON.parse(text) as { retry_after?: number };
    if (typeof json.retry_after === "number") {
      return Math.max(500, Math.ceil(json.retry_after * 1000));
    }
  } catch {
    /* ignore */
  }
  return 2500;
}

type DiscordBotFetchOptions = {
  /** How many times to retry after 429 before giving up (default 10). */
  max429Retries?: number;
};

/**
 * `fetch` to Discord API with Bot auth. On 429, waits per Retry-After / JSON retry_after, then retries.
 */
export async function discordBotFetch(
  url: string,
  init: RequestInit,
  botToken: string,
  options?: DiscordBotFetchOptions
): Promise<Response> {
  const max429Retries = options?.max429Retries ?? 10;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bot ${botToken}`);

  let attempt = 0;
  for (;;) {
    const res = await fetch(url, { ...init, headers });
    if (res.status !== 429) {
      return res;
    }
    if (attempt >= max429Retries) {
      return res;
    }
    attempt++;
    const baseWait = await retryAfterMsFromResponse(res.clone());
    const waitMs = baseWait + jitter(500);
    console.warn(
      `[discord-api] Rate limited (429), waiting ${waitMs}ms before retry ${attempt}/${max429Retries}`
    );
    await sleep(waitMs);
  }
}
