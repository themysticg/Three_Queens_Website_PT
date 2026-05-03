import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ensureSubmissionAllowed } from "@/lib/submission-guards";
import { getFormQuestions, validateAnswers } from "@/lib/form-questions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const userId = result.userId;
  const discordId = (session?.user as { discordId?: string } | undefined)?.discordId ?? null;
  const ipAddress = getClientIp(request);
  const { id: jobId } = await params;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const existing = await prisma.jobApplication.findUnique({
    where: { jobId_userId: { jobId, userId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You have already applied for this job" },
      { status: 400 }
    );
  }

  const guard = await ensureSubmissionAllowed({
    kind: "job",
    userId,
    discordId,
    ipAddress,
  });
  if (!guard.ok) {
    const response = NextResponse.json({ error: guard.error }, { status: guard.status });
    if (guard.retryAfterSeconds) {
      response.headers.set("Retry-After", String(guard.retryAfterSeconds));
    }
    return response;
  }

  const questions = await getFormQuestions("job", { jobId });
  let answersJson: string | null = null;

  if (questions.length > 0) {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const answers = (body.answers ?? {}) as Record<string, unknown>;
    const validation = validateAnswers(questions, answers);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 422 });
    }
    answersJson = JSON.stringify(validation.normalized);
  }

  const application = await prisma.jobApplication.create({
    data: {
      jobId,
      userId,
      answers: answersJson,
      submitterIp: ipAddress,
      submitterDiscordId: discordId,
    },
    include: { job: true, user: true },
  });

  await createAuditLog({
    action: "job_application_submitted",
    entityType: "job_application",
    entityId: application.id,
    actorUserId: userId,
    actorDiscordId: discordId,
    targetDiscordId: application.user.discordId,
    ipAddress,
    metadata: {
      status: application.status,
      jobId,
      jobTitle: application.job.title,
    },
  });

  return NextResponse.json(application);
}
