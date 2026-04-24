import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

/** Only full admins (ADMIN_DISCORD_IDS) can add/remove site members. */
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
    const members = await prisma.siteMember.findMany({
      include: {
        addedBy: { select: { id: true, username: true, discordId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const discordIds = members.map((m) => m.discordId);
    const usersByDiscordId = await prisma.user
      .findMany({
        where: { discordId: { in: discordIds } },
        select: { discordId: true, username: true, avatar: true, discriminator: true },
      })
      .then(
        (list) =>
          new Map(
            list.map((u) => [u.discordId, { username: u.username, avatar: u.avatar, discriminator: u.discriminator }])
          )
      );
    const membersWithUser = members.map((m) => ({
      ...m,
      user: usersByDiscordId.get(m.discordId) ?? null,
    }));
    return NextResponse.json(membersWithUser);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list members" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const userId = result.userId;
  const actorDiscordId = (session?.user as { discordId?: string } | undefined)?.discordId ?? null;
  const ipAddress = getClientIp(request);
  const adminType = (session!.user as { adminType?: string | null }).adminType;
  if (!canManageMembers(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { discordId, adminType: newMemberType } = body;
    const discordIdStr = typeof discordId === "string" ? discordId.trim() : "";
    if (!discordIdStr) {
      return NextResponse.json({ error: "Discord ID is required" }, { status: 400 });
    }
    const allowedTypes = ["team", "jobs", "rules"] as const;
    const fullOnly = "full" as const;
    const requestedType = newMemberType === "full" ? fullOnly : allowedTypes.includes(newMemberType) ? newMemberType : null;
    if (requestedType === null) {
      return NextResponse.json(
        { error: "adminType must be one of: team, jobs, rules, full" },
        { status: 400 }
      );
    }
    // Only full admins can add a member with type "full"
    if (requestedType === "full" && adminType !== "full") {
      return NextResponse.json(
        { error: "Only full admins can add members with role Full" },
        { status: 403 }
      );
    }
    const existing = await prisma.siteMember.findUnique({
      where: { discordId: discordIdStr },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This Discord ID is already added as a member" },
        { status: 409 }
      );
    }
    const member = await prisma.siteMember.create({
      data: {
        discordId: discordIdStr,
        adminType: requestedType,
        addedById: userId,
      },
      include: {
        addedBy: { select: { id: true, username: true, discordId: true } },
      },
    });
    await createAuditLog({
      action: "admin_member_added",
      entityType: "site_member",
      entityId: member.id,
      actorUserId: userId,
      actorDiscordId,
      targetDiscordId: member.discordId,
      ipAddress,
      metadata: {
        role: member.adminType,
      },
    });
    return NextResponse.json(member);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}
