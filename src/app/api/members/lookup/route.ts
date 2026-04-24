import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Only full admins can lookup Discord users. */
function canManageMembers(adminType: string | null | undefined): boolean {
  return adminType === "full";
}

function discordAvatarUrl(userId: string, avatarHash: string | null): string | null {
  if (!avatarHash) return null;
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}`;
}

/**
 * GET /api/members/lookup?discordId=xxx
 * Returns { username, avatar } for the given Discord ID (from our DB or Discord API).
 */
export async function GET(request: Request) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const adminType = (session!.user as { adminType?: string | null }).adminType;
  if (!canManageMembers(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const discordId = searchParams.get("discordId")?.trim();
  if (!discordId) {
    return NextResponse.json({ error: "discordId is required" }, { status: 400 });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { discordId },
      select: { username: true, avatar: true },
    });
    if (user) {
      return NextResponse.json({
        username: user.username,
        avatar: user.avatar ?? null,
      });
    }
    const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
    if (botToken) {
      const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { username?: string; avatar?: string | null };
        const avatar = data.avatar
          ? discordAvatarUrl(discordId, data.avatar)
          : null;
        return NextResponse.json({
          username: data.username ?? "Unknown",
          avatar,
        });
      }
    }
    return NextResponse.json({ username: null, avatar: null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
