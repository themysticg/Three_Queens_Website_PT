import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotification } from "@/lib/discord";
import { sendApplicationDecisionDM } from "@/lib/discord-dm";
import { addDeviceCheckRole, addWhitelistRole } from "@/lib/discord-roles";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

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
  const canManageWhitelist = adminType === "team" || adminType === "full";
  if (!canManageWhitelist) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const { status, adminNotes } = body;
    if (!status || !["approved", "rejected", "device_check"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const application = await prisma.application.update({
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
    await sendDiscordNotification({
      type: status === "approved" ? "approved" : status === "device_check" ? "device_check" : "rejected",
      application,
      message:
        status === "approved"
          ? `**${application.inGameName}** has been approved.`
          : status === "device_check"
            ? `**${application.inGameName}** was moved to device check review.`
          : `**${application.inGameName}** has been rejected.`,
    });
    await sendApplicationDecisionDM(
      {
        ...application,
        reviewedAt: application.reviewedAt ?? null,
        user: application.user,
      },
      status
    ).catch((e) => console.error("[discord-dm] Failed to send DM:", e));
    if (status === "approved" && application.user.discordId) {
      const roleOk = await addWhitelistRole(application.user.discordId).catch((e) => {
        console.error("[discord-roles] Failed to add whitelist role:", e);
        return false;
      });
      if (!roleOk) {
        console.warn(
          "[discord-roles] Whitelist role was not assigned. Check server logs above for Discord API errors. Ensure the user is in your server and the bot role is above the whitelist role."
        );
      }
    }
    if (status === "device_check" && application.user.discordId) {
      const roleOk = await addDeviceCheckRole(application.user.discordId).catch((e) => {
        console.error("[discord-roles] Failed to add device check role:", e);
        return false;
      });
      if (!roleOk) {
        console.warn(
          "[discord-roles] Device-check role was not assigned. Check server logs above for Discord API errors and confirm DISCORD_DEVICE_CHECK_ROLE_ID is set."
        );
      }
    }
    await createAuditLog({
      action: status === "approved" ? "application_approved" : status === "device_check" ? "application_device_check" : "application_rejected",
      entityType: "whitelist_application",
      entityId: application.id,
      actorUserId: userId,
      actorDiscordId: discordId,
      targetDiscordId: application.user.discordId,
      ipAddress,
      metadata: {
        status,
        adminNotes: application.adminNotes,
        inGameName: application.inGameName,
        applicantUsername: application.user.username,
      },
    });
    return NextResponse.json(application);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
