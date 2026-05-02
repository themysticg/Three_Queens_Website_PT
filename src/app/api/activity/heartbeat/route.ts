import { auth, resolveSessionUserId } from "@/auth";
import { prisma } from "@/lib/prisma";

function isMissingSiteVisitorTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; meta?: { modelName?: string; table?: string } };
  return (
    candidate.code === "P2021" &&
    (candidate.meta?.modelName === "SiteVisitor" ||
      candidate.meta?.table === "public.SiteVisitor")
  );
}

function isMissingUserTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; meta?: { modelName?: string; table?: string } };
  return (
    candidate.code === "P2021" &&
    (candidate.meta?.modelName === "User" || candidate.meta?.table === "public.User")
  );
}

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
        try {
          await prisma.user.update({
            where: { id: userId },
            data: { lastActiveAt: now },
          });
        } catch (error) {
          if (!isMissingUserTable(error)) {
            throw error;
          }
        }
      }
    }

    try {
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
    } catch (error) {
      if (!isMissingSiteVisitorTable(error)) {
        throw error;
      }
      // Heartbeat is non-critical; skip visitor tracking until DB schema is applied.
      return Response.json({ ok: true, trackingSkipped: true });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[activity-heartbeat] Failed to track activity:", error);
    return Response.json({ ok: false }, { status: 200 });
  }
}
