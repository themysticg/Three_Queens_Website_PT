import type { PrismaClient } from "@prisma/client";

/** Snapshots older than this are not used for broadcast (presence bot likely stopped). */
export const DISCORD_ONLINE_SNAPSHOT_MAX_AGE_MS = 15 * 60 * 1000;

export function parseSnapshotUserIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

export async function getDiscordOnlineSnapshotState(
  prisma: PrismaClient,
  guildId: string | undefined
): Promise<{ count: number; updatedAt: Date | null; fresh: boolean }> {
  if (!guildId?.trim()) {
    return { count: 0, updatedAt: null, fresh: false };
  }
  try {
    const row = await prisma.discordOnlineSnapshot.findUnique({
      where: { guildId: guildId.trim() },
    });
    if (!row) {
      return { count: 0, updatedAt: null, fresh: false };
    }
    const userIds = parseSnapshotUserIds(row.userIds);
    const age = Date.now() - row.updatedAt.getTime();
    return {
      count: userIds.length,
      updatedAt: row.updatedAt,
      fresh: age >= 0 && age <= DISCORD_ONLINE_SNAPSHOT_MAX_AGE_MS,
    };
  } catch (e) {
    console.warn(
      "[discord-online-snapshot] Read failed (if the table is missing, run: npm run db:migrate:deploy):",
      e
    );
    return { count: 0, updatedAt: null, fresh: false };
  }
}

export async function loadDiscordOnlineRecipients(
  prisma: PrismaClient,
  guildId: string
): Promise<{ discordId: string; username: string }[] | { error: string }> {
  let row: { userIds: unknown; updatedAt: Date } | null;
  try {
    row = await prisma.discordOnlineSnapshot.findUnique({
      where: { guildId: guildId.trim() },
    });
  } catch (e) {
    console.error("[discord-online-snapshot] loadDiscordOnlineRecipients:", e);
    return {
      error:
        "Could not read Discord online snapshot. Apply migrations: npm run db:migrate:deploy (production DATABASE_URL).",
    };
  }
  if (!row) {
    return { error: "No Discord online snapshot yet. Run npm run discord:presence with Presence + Server Members intents." };
  }
  const age = Date.now() - row.updatedAt.getTime();
  if (age > DISCORD_ONLINE_SNAPSHOT_MAX_AGE_MS) {
    return {
      error:
        "Discord online snapshot is stale (presence bot may be offline). Restart npm run discord:presence and wait ~1 minute.",
    };
  }
  const ids = parseSnapshotUserIds(row.userIds);
  if (ids.length === 0) {
    return { error: "Snapshot lists zero online users right now." };
  }
  return ids.map((discordId) => ({ discordId, username: "Member" }));
}
