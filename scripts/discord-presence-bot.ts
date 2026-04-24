/**
 * Gateway bot: shows the bot as online and (when configured) writes Discord “who looks online”
 * to Postgres for Admin → Send Discord DMs → “Online on Discord”.
 *
 * Developer Portal → Bot → enable **Server Members Intent** and **Presence Intent** (Privileged).
 *
 * Env: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DATABASE_URL (same DB as the site).
 * Optional: DISCORD_PRESENCE_PREFETCH_MEMBERS=1 — guild.members.fetch() on ready (heavy on large servers).
 *
 *   npm run discord:presence
 */
import "dotenv/config";
import * as PrismaModule from "@prisma/client";
import { ActivityType, Client, GatewayIntentBits, type Guild } from "discord.js";

type PrismaClientLike = {
  $disconnect(): Promise<void>;
  [key: string]: unknown;
};

const PrismaClientCtor = (PrismaModule as unknown as { PrismaClient: new () => PrismaClientLike })
  .PrismaClient;
const prisma = new PrismaClientCtor();

type DiscordOnlineSnapshotDelegate = {
  upsert(args: {
    where: { guildId: string };
    create: { guildId: string; userIds: string[] };
    update: { userIds: string[] };
  }): Promise<unknown>;
};

function getDiscordOnlineSnapshotDelegate(): DiscordOnlineSnapshotDelegate | null {
  const candidate = (prisma as unknown as Record<string, unknown>)["discordOnlineSnapshot"];
  if (!candidate || typeof candidate !== "object") return null;
  return candidate as DiscordOnlineSnapshotDelegate;
}

function collectNonOfflineHumanIds(guild: Guild): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const [userId, presence] of guild.presences.cache) {
    const st = presence?.status;
    if (!st || st === "offline" || st === "invisible") continue;
    const member = guild.members.cache.get(userId);
    if (!member || member.user.bot) continue;
    if (!seen.has(userId)) {
      seen.add(userId);
      out.push(userId);
    }
  }
  return out;
}

let snapshotDebounce: ReturnType<typeof setTimeout> | null = null;

async function flushOnlineSnapshot(guild: Guild): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  const delegate = getDiscordOnlineSnapshotDelegate();
  if (!delegate) return;
  const ids = collectNonOfflineHumanIds(guild);
  try {
    await delegate.upsert({
      where: { guildId: guild.id },
      create: { guildId: guild.id, userIds: ids },
      update: { userIds: ids },
    });
    console.log(`[discord-presence] Online snapshot: ${ids.length} non-bot users (visible online/idle/dnd)`);
  } catch (e) {
    console.error("[discord-presence] Failed to write DiscordOnlineSnapshot:", e);
  }
}

function scheduleSnapshotFlush(guild: Guild): void {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (snapshotDebounce) clearTimeout(snapshotDebounce);
  snapshotDebounce = setTimeout(() => {
    snapshotDebounce = null;
    void flushOnlineSnapshot(guild);
  }, 8000);
}

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) {
    console.error("[discord-presence] DISCORD_BOT_TOKEN is not set.");
    process.exit(1);
  }

  const guildId = process.env.DISCORD_GUILD_ID?.trim();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      ...(guildId && process.env.DATABASE_URL?.trim()
        ? [GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences]
        : []),
    ],
  });

  client.once("clientReady", async () => {
    const user = client.user;
    console.log(`[discord-presence] Gateway connected as ${user?.tag}`);
    try {
      await user?.setPresence({
        status: "online",
        activities: [{ name: "Whitelist & applications", type: ActivityType.Watching }],
      });
      console.log("[discord-presence] Bot presence set to online.");
    } catch (e) {
      console.warn("[discord-presence] setPresence failed:", e);
    }

    if (!guildId) {
      console.warn("[discord-presence] DISCORD_GUILD_ID unset — online snapshot disabled.");
      return;
    }
    if (!process.env.DATABASE_URL?.trim()) {
      console.warn("[discord-presence] DATABASE_URL unset — online snapshot disabled.");
      return;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.warn(`[discord-presence] Bot is not in guild ${guildId}. Invite the bot.`);
      return;
    }

    if (process.env.DISCORD_PRESENCE_PREFETCH_MEMBERS === "1") {
      console.warn("[discord-presence] Prefetching all members (may take a while)…");
      await guild.members.fetch().catch((e) => console.warn("[discord-presence] members.fetch failed:", e));
    }

    await flushOnlineSnapshot(guild);
    setInterval(() => void flushOnlineSnapshot(guild), 45_000);
  });

  client.on("presenceUpdate", (_old, newPresence) => {
    if (!guildId || !newPresence?.guild || newPresence.guild.id !== guildId) return;
    scheduleSnapshotFlush(newPresence.guild);
  });

  client.on("error", (err) => {
    console.error("[discord-presence]", err);
  });

  client.on("shardDisconnect", (event, id) => {
    console.warn(`[discord-presence] Gateway disconnected (shard ${id}):`, event?.reason ?? event);
  });

  const shutdown = async () => {
    try {
      await prisma.$disconnect();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await client.login(token);
}

main().catch((e) => {
  console.error(e);
  void prisma.$disconnect();
  process.exit(1);
});
