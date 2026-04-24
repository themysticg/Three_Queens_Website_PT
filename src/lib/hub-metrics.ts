import { prisma } from "@/lib/prisma";

type FiveMServerResponse = {
  Data?: {
    clients?: number;
    sv_maxclients?: number;
    svMaxclients?: number;
  };
};

type DiscordInviteResponse = {
  approximate_member_count?: number;
};

function parseDiscordInviteCode(discordLink: string): string | null {
  const trimmed = discordLink.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    if (url.hostname === "discord.gg" && segments[0]) return segments[0];
    if (
      (url.hostname === "discord.com" || url.hostname === "www.discord.com") &&
      segments[0] === "invite"
    ) {
      return segments[1] ?? null;
    }
  } catch {
    return trimmed.replace(/^https?:\/\//, "").split("/").filter(Boolean).pop() ?? null;
  }
  return null;
}

async function getFiveMPlayersOnline(serverDetailId: string): Promise<string> {
  try {
    const response = await fetch(
      `https://servers-frontend.fivem.net/api/servers/single/${encodeURIComponent(serverDetailId)}`,
      { next: { revalidate: 30 } }
    );
    if (!response.ok) return "0";
    const payload = (await response.json()) as FiveMServerResponse;
    return String(payload.Data?.clients ?? 0);
  } catch {
    return "0";
  }
}

async function getDiscordMemberCount(discordLink: string): Promise<string | null> {
  const inviteCode = parseDiscordInviteCode(discordLink);
  if (!inviteCode) return null;
  try {
    const response = await fetch(
      `https://discord.com/api/v9/invites/${encodeURIComponent(inviteCode)}?with_counts=true`,
      { next: { revalidate: 300 } }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as DiscordInviteResponse;
    const members = payload.approximate_member_count;
    return typeof members === "number" && Number.isFinite(members) ? String(members) : null;
  } catch {
    return null;
  }
}

export type CommunityHubMetrics = {
  discordMembers: string;
  playersOnline: string;
  whitelistApproved: string;
  registeredUsers: string;
  ruleCategories: string;
  pendingApplications: string;
};

export async function getCommunityHubMetrics(
  serverDetailId: string,
  discordLink: string
): Promise<CommunityHubMetrics> {
  try {
    const [discordMembers, playersOnline, whitelistApproved, registeredUsers, ruleCategories, pendingApplications] =
      await Promise.all([
        getDiscordMemberCount(discordLink),
        getFiveMPlayersOnline(serverDetailId),
        prisma.application.count({ where: { status: "approved" } }),
        prisma.user.count(),
        prisma.ruleCategory.count().catch(() => 0),
        prisma.application.count({ where: { status: "pending" } }),
      ]);

    return {
      discordMembers: discordMembers ?? "—",
      playersOnline,
      whitelistApproved: String(whitelistApproved),
      registeredUsers: String(registeredUsers),
      ruleCategories: String(ruleCategories),
      pendingApplications: String(pendingApplications),
    };
  } catch {
    return {
      discordMembers: "—",
      playersOnline: "0",
      whitelistApproved: "0",
      registeredUsers: "0",
      ruleCategories: "0",
      pendingApplications: "0",
    };
  }
}
