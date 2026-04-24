/**
 * Fetches members from a Discord guild for admin broadcast. Uses REST only.
 * Requires DISCORD_GUILD_ID, DISCORD_BOT_TOKEN, and **Server Members Intent** enabled
 * on the bot in the Developer Portal (Bot → Privileged Gateway Intents).
 */

import { discordBotFetch } from "@/lib/discord-bot-fetch";

const DISCORD_API = "https://discord.com/api/v10";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class DiscordGuildMembersError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Discord guild API error: ${status}`);
    this.name = "DiscordGuildMembersError";
  }
}

type GuildMemberApi = {
  user?: { id: string; username?: string; bot?: boolean };
};

export async function fetchBotUserId(botToken: string): Promise<string | null> {
  const res = await discordBotFetch(`${DISCORD_API}/users/@me`, { method: "GET" }, botToken);
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  return data.id ?? null;
}

/** Approximate count (includes bots); good for UI hints only. */
export async function fetchGuildApproximateMemberCount(
  guildId: string,
  botToken: string
): Promise<number | null> {
  const url = `${DISCORD_API}/guilds/${guildId}?with_counts=true`;
  const res = await discordBotFetch(url, { method: "GET" }, botToken);
  if (!res.ok) return null;
  const data = (await res.json()) as { approximate_member_count?: number };
  return typeof data.approximate_member_count === "number" ? data.approximate_member_count : null;
}

/**
 * All non-bot guild members (paginated). Excludes `excludeUserId` when set (e.g. the bot itself).
 */
export async function fetchAllGuildHumanMembers(
  guildId: string,
  botToken: string,
  excludeUserId: string | null
): Promise<{ discordId: string; username: string }[]> {
  const byId = new Map<string, { discordId: string; username: string }>();
  let after: string | undefined;

  for (;;) {
    const url = new URL(`${DISCORD_API}/guilds/${guildId}/members`);
    url.searchParams.set("limit", "1000");
    if (after) url.searchParams.set("after", after);

    const res = await discordBotFetch(url.toString(), { method: "GET" }, botToken);
    const text = await res.text();
    if (!res.ok) {
      throw new DiscordGuildMembersError(res.status, text);
    }

    const batch = JSON.parse(text) as GuildMemberApi[];
    if (!batch.length) break;

    for (const m of batch) {
      const u = m.user;
      if (!u?.id || u.bot) continue;
      if (excludeUserId && u.id === excludeUserId) continue;
      byId.set(u.id, { discordId: u.id, username: u.username?.trim() || "Member" });
    }

    if (batch.length < 1000) break;
    const lastUser = batch[batch.length - 1]?.user?.id;
    if (!lastUser) break;
    after = lastUser;
    await sleep(400);
  }

  return [...byId.values()];
}

export function guildMembersErrorMessage(status: number, body: string): string {
  if (status === 403) {
    return (
      "Discord refused listing server members. Enable **Server Members Intent** for your application " +
      "(Discord Developer Portal → Bot → Privileged Gateway Intents), save, and re-invite the bot to your server if prompted. " +
      "The bot must stay in the server and have permission to view members."
    );
  }
  if (status === 404) {
    return "Guild not found. Check DISCORD_GUILD_ID and that the bot is in that server.";
  }
  let code: number | undefined;
  try {
    code = (JSON.parse(body) as { code?: number }).code;
  } catch {
    /* ignore */
  }
  if (code === 50001) {
    return "Missing access to this server. Invite the bot and verify DISCORD_GUILD_ID.";
  }
  return `Could not list server members (HTTP ${status}).`;
}
