import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { prisma } from "@/lib/prisma";

function canManageJobs(adminType: string | null | undefined) {
  return adminType === "jobs" || adminType === "full";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canManageJobs(adminType)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const title = (body?.title ?? "").trim() || existing.title;
  const category = (body?.category ?? "").trim().toUpperCase() || existing.category;
  const description = (body?.description ?? "").trim() || existing.description;
  const requirements = Array.isArray(body?.requirements)
    ? JSON.stringify(body.requirements.filter(Boolean))
    : existing.requirements;
  const salaryTier = Number.isFinite(body?.salaryTier)
    ? Math.min(4, Math.max(1, Number(body.salaryTier)))
    : existing.salaryTier;

  const job = await prisma.job.update({
    where: { id },
    data: { title, category, description, requirements, salaryTier },
  });
  return NextResponse.json(job);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canManageJobs(adminType)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
