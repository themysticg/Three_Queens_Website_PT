import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import {
  DiscordGuildMembersError,
  fetchAllGuildHumanMembers,
  fetchBotUserId,
  guildMembersErrorMessage,
} from "@/lib/discord-guild-members";
import {
  type BroadcastAudience,
  type BroadcastRecipient,
  sendMemberBroadcastSequence,
  shuffleBroadcastRecipients,
} from "@/lib/member-broadcast-send";
import { loadDiscordOnlineRecipients } from "@/lib/discord-online-snapshot";
import { memberOnlineSince } from "@/lib/member-online-window";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

export const maxDuration = 300;

function canManageMembers(adminType: string | null | undefined): boolean {
  return adminType === "full";
}

function wantsStream(request: Request): boolean {
  try {
    const u = new URL(request.url);
    return u.searchParams.get("stream") === "1";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const userId = result.userId;
  const actorDiscordId = (session?.user as { discordId?: string } | undefined)?.discordId ?? null;
  const ipAddress = getClientIp(request);
  const stream = wantsStream(request);

  const adminType = (session!.user as { adminType?: string | null }).adminType;
  if (!canManageMembers(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      message?: string;
      ctaLabel?: string;
      ctaUrl?: string;
      audience?: string;
      /** When set with stream=1, only this slice is sent (sorted by discordId) so each request stays under host time limits. */
      chunkOffset?: number;
      chunkSize?: number;
    };

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const ctaLabel = typeof body.ctaLabel === "string" ? body.ctaLabel.trim() : "";
    const ctaUrl = typeof body.ctaUrl === "string" ? body.ctaUrl.trim() : "";
    const audienceRaw = typeof body.audience === "string" ? body.audience.trim() : "registered";
    const audience: BroadcastAudience =
      audienceRaw === "guild"
        ? "guild"
        : audienceRaw === "online_site"
          ? "online_site"
          : audienceRaw === "online_discord"
            ? "online_discord"
            : "registered";

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
    if (!botToken) {
      return NextResponse.json({ error: "DISCORD_BOT_TOKEN is not configured." }, { status: 400 });
    }

    if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
      return NextResponse.json({ error: "CTA label and CTA URL must be used together." }, { status: 400 });
    }

    let recipients: BroadcastRecipient[];

    if (audience === "guild") {
      const guildId = process.env.DISCORD_GUILD_ID?.trim();
      if (!guildId) {
        return NextResponse.json(
          { error: "DISCORD_GUILD_ID is not configured (required to message everyone in the server)." },
          { status: 400 }
        );
      }
      try {
        const botUserId = await fetchBotUserId(botToken);
        recipients = await fetchAllGuildHumanMembers(guildId, botToken, botUserId);
      } catch (e) {
        if (e instanceof DiscordGuildMembersError) {
          console.error("[member-broadcast] Guild member list failed:", e.status, e.body);
          return NextResponse.json(
            { error: guildMembersErrorMessage(e.status, e.body) },
            { status: 502 }
          );
        }
        throw e;
      }
      if (recipients.length === 0) {
        return NextResponse.json(
          { error: "No members returned from Discord. Check bot permissions and Server Members Intent." },
          { status: 400 }
        );
      }
    } else if (audience === "online_site") {
      recipients = await prisma.user.findMany({
        where: {
          discordId: { not: "" },
          lastActiveAt: { gte: memberOnlineSince() },
        },
        select: {
          discordId: true,
          username: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
      if (recipients.length === 0) {
        return NextResponse.json(
          { error: "Nobody is active on the website in the current online window. Open the site to refresh activity, or pick another audience." },
          { status: 400 }
        );
      }
    } else if (audience === "online_discord") {
      const guildId = process.env.DISCORD_GUILD_ID?.trim();
      if (!guildId) {
        return NextResponse.json(
          { error: "DISCORD_GUILD_ID is required to target members online on Discord." },
          { status: 400 }
        );
      }
      const loaded = await loadDiscordOnlineRecipients(prisma, guildId);
      if ("error" in loaded) {
        return NextResponse.json({ error: loaded.error }, { status: 400 });
      }
      recipients = loaded;
    } else {
      recipients = await prisma.user.findMany({
        where: {
          discordId: {
            not: "",
          },
        },
        select: {
          discordId: true,
          username: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }

    const rawChunkSize = body.chunkSize;
    const rawChunkOffset = body.chunkOffset;
    const chunkSize =
      stream &&
      typeof rawChunkSize === "number" &&
      Number.isFinite(rawChunkSize) &&
      rawChunkSize > 0
        ? Math.min(250, Math.floor(rawChunkSize))
        : undefined;
    const chunkOffset =
      chunkSize !== undefined &&
      typeof rawChunkOffset === "number" &&
      Number.isFinite(rawChunkOffset) &&
      rawChunkOffset >= 0
        ? Math.floor(rawChunkOffset)
        : 0;

    const fullAudienceTotal = recipients.length;
    const chunkMode = chunkSize !== undefined;

    if (chunkMode) {
      const sorted = [...recipients].sort((a, b) => a.discordId.localeCompare(b.discordId));
      recipients = sorted.slice(chunkOffset, chunkOffset + chunkSize);
    } else {
      recipients = shuffleBroadcastRecipients(recipients);
    }

    const sentBy = session?.user?.name ?? "Admin";
    const ctaLabelFinal = ctaLabel || null;
    const ctaUrlFinal = ctaUrl || null;

    if (stream) {
      const encoder = new TextEncoder();
      const streamBody = new ReadableStream({
        async start(controller) {
          const write = (obj: object) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
          };

          try {
            write({
              type: "start",
              total: recipients.length,
              fullTotal: chunkMode ? fullAudienceTotal : recipients.length,
              chunkOffset: chunkMode ? chunkOffset : undefined,
              chunkMode: chunkMode || undefined,
              audience,
            });

            let sent = 0;
            let failed = 0;
            if (recipients.length > 0) {
              const r = await sendMemberBroadcastSequence(
                recipients,
                {
                  title,
                  message,
                  ctaLabel: ctaLabelFinal,
                  ctaUrl: ctaUrlFinal,
                  sentBy,
                  audience,
                },
                (p) => {
                  write({
                    type: "progress",
                    ...p,
                    globalCurrent: chunkMode ? chunkOffset + p.current : p.current,
                    fullTotal: chunkMode ? fullAudienceTotal : p.total,
                  });
                }
              );
              sent = r.sent;
              failed = r.failed;
            }

            try {
              await createAuditLog({
                action: "admin_member_broadcast",
                entityType: "member_broadcast",
                actorUserId: userId,
                actorDiscordId,
                ipAddress,
                metadata: {
                  title,
                  audience,
                  attempted: recipients.length,
                  sent,
                  failed,
                  chunkMode,
                  chunkOffset: chunkMode ? chunkOffset : undefined,
                  fullAudienceTotal: chunkMode ? fullAudienceTotal : undefined,
                },
              });
            } catch (logErr) {
              console.error("[member-broadcast] Audit log failed:", logErr);
            }

            const nextOff = chunkOffset + recipients.length;
            write({
              type: "done",
              attempted: recipients.length,
              sent,
              failed,
              audience,
              fullTotal: chunkMode ? fullAudienceTotal : undefined,
              nextChunkOffset: chunkMode ? nextOff : undefined,
              broadcastComplete: chunkMode ? nextOff >= fullAudienceTotal : true,
            });
          } catch (err) {
            console.error("[member-broadcast] Stream error:", err);
            write({
              type: "error",
              message: err instanceof Error ? err.message : "Broadcast failed.",
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(streamBody, {
        status: 200,
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const { sent, failed } = await sendMemberBroadcastSequence(recipients, {
      title,
      message,
      ctaLabel: ctaLabelFinal,
      ctaUrl: ctaUrlFinal,
      sentBy,
      audience,
    });

    await createAuditLog({
      action: "admin_member_broadcast",
      entityType: "member_broadcast",
      actorUserId: userId,
      actorDiscordId,
      ipAddress,
      metadata: {
        title,
        audience,
        attempted: recipients.length,
        sent,
        failed,
      },
    });

    return NextResponse.json({
      attempted: recipients.length,
      sent,
      failed,
      audience,
    });
  } catch (error) {
    console.error("[member-broadcast] Failed to send bulk message:", error);
    return NextResponse.json({ error: "Failed to send private messages." }, { status: 500 });
  }
}
