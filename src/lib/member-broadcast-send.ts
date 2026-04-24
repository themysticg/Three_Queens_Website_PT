import { sendMemberBroadcastDM } from "@/lib/discord-dm";

export type BroadcastAudience = "registered" | "guild" | "online_site" | "online_discord";

export type BroadcastRecipient = { discordId: string; username: string };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitterMs(max: number): number {
  return Math.floor(Math.random() * (max + 1));
}

/** Fisher–Yates copy: random send order without changing total work or rate limits (still one-at-a-time + delays). */
export function shuffleBroadcastRecipients<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function broadcastIntervalMs(audience: BroadcastAudience): number {
  const raw =
    audience === "guild"
      ? process.env.DISCORD_BROADCAST_MIN_INTERVAL_MS_GUILD
      : process.env.DISCORD_BROADCAST_MIN_INTERVAL_MS_REGISTERED;
  const fallback = audience === "guild" ? 4000 : 1200; // registered + online_site: gentler pacing
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(120_000, Math.max(400, n));
}

export type BroadcastProgress = {
  current: number;
  total: number;
  sent: number;
  failed: number;
};

export async function sendMemberBroadcastSequence(
  recipients: BroadcastRecipient[],
  params: {
    title: string;
    message: string;
    ctaLabel: string | null;
    ctaUrl: string | null;
    sentBy: string;
    audience: BroadcastAudience;
  },
  onProgress?: (p: BroadcastProgress) => void | Promise<void>
): Promise<{ sent: number; failed: number }> {
  const baseIntervalMs = broadcastIntervalMs(params.audience);
  let sent = 0;
  let failed = 0;
  const total = recipients.length;

  for (let i = 0; i < total; i++) {
    const recipient = recipients[i];
    try {
      const ok = await sendMemberBroadcastDM({
        user: recipient,
        title: params.title,
        message: params.message,
        ctaLabel: params.ctaLabel,
        ctaUrl: params.ctaUrl,
        sentBy: params.sentBy,
      });
      if (ok) sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }

    if (onProgress) {
      await onProgress({ current: i + 1, total, sent, failed });
    }

    if (i < total - 1) {
      const jitterCap = params.audience === "guild" ? 800 : 500;
      await delay(baseIntervalMs + jitterMs(jitterCap));
    }
  }

  return { sent, failed };
}
