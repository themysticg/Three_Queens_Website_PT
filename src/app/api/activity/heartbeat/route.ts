import { auth, resolveSessionUserId } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          visitorId?: string;
          currentPath?: string;
        }
      | null;

    const visitorId = typeof body?.visitorId === "string" ? body.visitorId.trim() : "";
    const currentPath = typeof body?.currentPath === "string" ? body.currentPath.trim().slice(0, 255) : null;

    if (!visitorId || visitorId.length > 100) {
      return Response.json({ error: "visitorId is required" }, { status: 400 });
    }

    const session = await auth();
    const now = new Date();
    let userId: string | null = null;

    if (session?.user) {
      const result = await resolveSessionUserId(session);
      if (result.ok) {
        userId = result.userId;
        await prisma.user.update({
          where: { id: userId },
          data: { lastActiveAt: now },
        });
      }
    }

    await prisma.siteVisitor.upsert({
      where: { visitorId },
      create: {
        visitorId,
        currentPath,
        lastSeenAt: now,
        isAuthenticated: Boolean(userId),
        ...(userId ? { userId } : {}),
      },
      update: userId
        ? {
            userId,
            currentPath,
            lastSeenAt: now,
            isAuthenticated: true,
          }
        : {
            currentPath,
            lastSeenAt: now,
            isAuthenticated: false,
          },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[activity-heartbeat] Failed to track activity:", error);
    return Response.json({ ok: false }, { status: 200 });
  }
}
