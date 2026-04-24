import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { sendDecisionDM } from "@/lib/discord-dm";
import { grantStaffRole } from "@/lib/discord-role";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

function canManageStaffApps(adminType: string | null | undefined): boolean {
  return adminType === "team" || adminType === "full";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const userId = result.userId;
  const discordId = (session?.user as { discordId?: string } | undefined)?.discordId ?? null;
  const ipAddress = getClientIp(request);
  const adminType = (session!.user as { adminType?: string | null }).adminType;
  if (!canManageStaffApps(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const { status, adminNotes } = body;
    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const application = await prisma.staffApplication.update({
      where: { id },
      data: {
        status,
        adminNotes: adminNotes ? String(adminNotes).trim() : null,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
      include: {
        user: true,
        reviewedByUser: { select: { username: true, avatar: true } },
      },
    });
    await sendDecisionDM(
      {
        type: "staff",
        user: application.user,
        adminNotes: application.adminNotes,
        reviewedAt: application.reviewedAt ?? null,
      },
      status
    ).catch((e) => console.error("[discord-dm] Staff application DM failed:", e));

    if (status === "approved" && application.user?.discordId) {
      await grantStaffRole(application.user.discordId).catch((e) =>
        console.error("[discord-role] Staff role grant failed:", e)
      );
    }

    await createAuditLog({
      action: status === "approved" ? "staff_application_approved" : "staff_application_rejected",
      entityType: "staff_application",
      entityId: application.id,
      actorUserId: userId,
      actorDiscordId: discordId,
      targetDiscordId: application.user.discordId,
      ipAddress,
      metadata: {
        status,
        adminNotes: application.adminNotes,
        applicantUsername: application.user.username,
      },
    });

    return NextResponse.json(application);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
