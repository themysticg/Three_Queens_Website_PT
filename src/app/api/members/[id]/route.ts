import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

/** Only full admins (ADMIN_DISCORD_IDS) can add/remove site members. */
function canManageMembers(adminType: string | null | undefined): boolean {
  return adminType === "full";
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const { id } = await params;
  try {
    const existing = await prisma.siteMember.findUnique({
      where: { id },
      select: { id: true, discordId: true, adminType: true },
    });
    await prisma.siteMember.delete({
      where: { id },
    });
    await createAuditLog({
      action: "admin_member_removed",
      entityType: "site_member",
      entityId: id,
      actorUserId: userId,
      actorDiscordId,
      targetDiscordId: existing?.discordId ?? null,
      ipAddress,
      metadata: {
        role: existing?.adminType ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
