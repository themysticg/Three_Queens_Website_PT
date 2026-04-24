import { prisma } from "@/lib/prisma";

export type HubApplicationRow = {
  id: string;
  kind: "whitelist" | "staff";
  status: "approved" | "rejected";
  reviewedAt: Date;
  /** Primary label (character name or Discord name) */
  title: string;
  discordUsername: string;
  discordId: string;
  avatar: string | null;
  discriminator: string | null;
  adminNotes: string | null;
};

const TAKE_EACH = 30;

function sortByReviewedAtDesc(a: HubApplicationRow, b: HubApplicationRow): number {
  return b.reviewedAt.getTime() - a.reviewedAt.getTime();
}

/**
 * Recent whitelist + staff decisions for the public community hub.
 * Rejected entries include adminNotes as the rejection reason when set.
 */
export async function getCommunityApplicationFeed(): Promise<{
  rejected: HubApplicationRow[];
  approved: HubApplicationRow[];
}> {
  try {
    const [whitelistRows, staffRows] = await Promise.all([
      prisma.application.findMany({
        where: {
          status: { in: ["rejected", "approved"] },
          reviewedAt: { not: null },
        },
        orderBy: { reviewedAt: "desc" },
        take: TAKE_EACH,
        include: {
          user: {
            select: { username: true, avatar: true, discordId: true, discriminator: true },
          },
        },
      }),
      prisma.staffApplication.findMany({
        where: {
          status: { in: ["rejected", "approved"] },
          reviewedAt: { not: null },
        },
        orderBy: { reviewedAt: "desc" },
        take: TAKE_EACH,
        include: {
          user: {
            select: { username: true, avatar: true, discordId: true, discriminator: true },
          },
        },
      }),
    ]);

    const mapped: HubApplicationRow[] = [];

    for (const a of whitelistRows) {
      const u = a.user;
      const status = a.status === "approved" ? "approved" : "rejected";
      mapped.push({
        id: `w-${a.id}`,
        kind: "whitelist",
        status,
        reviewedAt: a.reviewedAt!,
        title: a.inGameName?.trim() || u.username,
        discordUsername: u.username,
        discordId: u.discordId,
        avatar: u.avatar,
        discriminator: u.discriminator,
        adminNotes: a.adminNotes,
      });
    }

    for (const s of staffRows) {
      const u = s.user;
      const status = s.status === "approved" ? "approved" : "rejected";
      mapped.push({
        id: `s-${s.id}`,
        kind: "staff",
        status,
        reviewedAt: s.reviewedAt!,
        title: u.username,
        discordUsername: u.username,
        discordId: u.discordId,
        avatar: u.avatar,
        discriminator: u.discriminator,
        adminNotes: s.adminNotes,
      });
    }

    const rejected = mapped.filter((r) => r.status === "rejected").sort(sortByReviewedAtDesc).slice(0, 14);
    const approved = mapped.filter((r) => r.status === "approved").sort(sortByReviewedAtDesc).slice(0, 18);

    return { rejected, approved };
  } catch {
    return { rejected: [], approved: [] };
  }
}
