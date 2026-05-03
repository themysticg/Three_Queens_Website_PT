import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { prisma } from "@/lib/prisma";

function canManageJobs(adminType: string | null | undefined) {
  return adminType === "jobs" || adminType === "full";
}

export async function GET() {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canManageJobs(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const jobs = await prisma.job.findMany({ orderBy: [{ category: "asc" }, { title: "asc" }] });
  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canManageJobs(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const title = (body?.title ?? "").trim();
  const category = (body?.category ?? "").trim().toUpperCase();
  const description = (body?.description ?? "").trim();
  const requirements = Array.isArray(body?.requirements) ? body.requirements.filter(Boolean) : [];
  const salaryTier = Number.isFinite(body?.salaryTier) ? Math.min(4, Math.max(1, Number(body.salaryTier))) : 1;

  if (!title || !category || !description) {
    return NextResponse.json({ error: "title, category, and description are required" }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: { title, category, description, requirements: JSON.stringify(requirements), salaryTier },
  });
  return NextResponse.json(job, { status: 201 });
}
