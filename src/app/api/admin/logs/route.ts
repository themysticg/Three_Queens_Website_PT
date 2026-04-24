import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { canViewAuditLogs } from "@/lib/admin-permissions";
import { prisma } from "@/lib/prisma";

function parseMetadata(metadata: string | null): Record<string, unknown> | null {
  if (!metadata) return null;

  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return { raw: metadata };
  }
}

export async function GET(request: Request) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canViewAuditLogs(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const take = Math.min(
    100,
    Math.max(10, Number.parseInt(url.searchParams.get("take") ?? "50", 10) || 50)
  );

  const logs = await prisma.auditLog.findMany({
    include: {
      actorUser: {
        select: {
          username: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json(
    logs.map((log) => ({
      ...log,
      metadata: parseMetadata(log.metadata),
    }))
  );
}
