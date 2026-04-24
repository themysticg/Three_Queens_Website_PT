import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { getDiscordOnlineSnapshotState } from "@/lib/discord-online-snapshot";
import { fetchGuildApproximateMemberCount } from "@/lib/discord-guild-members";
import { MEMBER_ONLINE_WINDOW_MINUTES, memberOnlineSince } from "@/lib/member-online-window";
import { prisma } from "@/lib/prisma";

function canManageMembers(adminType: string | null | undefined): boolean {
  return adminType === "full";
}

export async function GET() {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const adminType = (session!.user as { adminType?: string | null }).adminType;
  if (!canManageMembers(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const onlineThreshold = memberOnlineSince();

    const [totalVisitors, totalMembers, onlineMembers, users, siteMembers] = await Promise.all([
      prisma.siteVisitor.count(),
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActiveAt: { gte: onlineThreshold },
        },
      }),
      prisma.user.findMany({
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          discordId: true,
          username: true,
          avatar: true,
          discriminator: true,
          createdAt: true,
          isAdmin: true,
          adminType: true,
          lastActiveAt: true,
        },
      }),
      prisma.siteMember.findMany({
        select: {
          discordId: true,
          adminType: true,
        },
      }),
    ]);

    const siteRoleByDiscordId = new Map(siteMembers.map((member) => [member.discordId, member.adminType]));

    const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
    const guildId = process.env.DISCORD_GUILD_ID?.trim();
    const guildBroadcastConfigured = Boolean(botToken && guildId);
    let approximateGuildMembers: number | null = null;
    if (guildBroadcastConfigured && botToken && guildId) {
      try {
        approximateGuildMembers = await fetchGuildApproximateMemberCount(guildId, botToken);
      } catch (e) {
        console.warn("[member-dashboard] approximateGuildMembers fetch failed:", e);
      }
    }

    const discordOnline = await getDiscordOnlineSnapshotState(prisma, guildId);

    return NextResponse.json({
      stats: {
        totalVisitors,
        totalMembers,
        onlineMembers,
        onlineWindowMinutes: MEMBER_ONLINE_WINDOW_MINUTES,
      },
      broadcast: {
        guildConfigured: guildBroadcastConfigured,
        approximateGuildMembers,
        discordOnline: {
          count: discordOnline.count,
          fresh: discordOnline.fresh,
          updatedAt: discordOnline.updatedAt?.toISOString() ?? null,
        },
      },
      members: users.map((user, index) => ({
        ...user,
        sequence: index + 1,
        siteRole: siteRoleByDiscordId.get(user.discordId) ?? null,
      })),
    });
  } catch (error) {
    console.error("[member-dashboard] Failed to load dashboard:", error);
    return NextResponse.json({ error: "Failed to load member dashboard" }, { status: 500 });
  }
}
