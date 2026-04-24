import { resolveDiscordAvatarUrl } from "@/lib/discord-avatar";
import { prisma } from "@/lib/prisma";

export type RecentVisitor = {
  userId: string;
  username: string;
  avatarUrl: string;
  discriminator: string | null;
  lastSeenAt: Date;
};

/**
 * Most recently active signed-in visitors (Discord), deduped by user, ordered by latest heartbeat.
 */
export async function getRecentVisitors(limit = 12): Promise<RecentVisitor[]> {
  try {
    const rows = await prisma.siteVisitor.findMany({
      where: { userId: { not: null } },
      orderBy: { lastSeenAt: "desc" },
      take: Math.min(limit * 8, 120),
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            discordId: true,
            discriminator: true,
          },
        },
      },
    });

    const seen = new Set<string>();
    const out: RecentVisitor[] = [];

    for (const row of rows) {
      if (!row.userId || !row.user) continue;
      if (seen.has(row.userId)) continue;
      seen.add(row.userId);
      out.push({
        userId: row.user.id,
        username: row.user.username || "Player",
        avatarUrl: resolveDiscordAvatarUrl(row.user.discordId, row.user.avatar, row.user.discriminator),
        discriminator: row.user.discriminator,
        lastSeenAt: row.lastSeenAt,
      });
      if (out.length >= limit) break;
    }

    return out;
  } catch {
    return [];
  }
}
