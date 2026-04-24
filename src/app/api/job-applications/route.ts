import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { prisma } from "@/lib/prisma";

function canManageJobApps(adminType: string | null | undefined): boolean {
  return adminType === "jobs" || adminType === "full";
}

export async function GET() {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const userId = result.userId;
  try {
    const adminType = (session!.user as { adminType?: string | null }).adminType;
    if (canManageJobApps(adminType)) {
      const applications = await prisma.jobApplication.findMany({
        include: {
          job: true,
          user: true,
          reviewedByUser: { select: { username: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(applications);
    }
    const applications = await prisma.jobApplication.findMany({
      where: { userId },
      include: { job: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(applications);
  } catch (e) {
    console.error("[job-applications] Prisma error:", e);
    return NextResponse.json([], { status: 200 });
  }
}
