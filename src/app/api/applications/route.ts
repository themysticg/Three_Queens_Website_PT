import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotification } from "@/lib/discord";
import { createAuditLog } from "@/lib/audit";
import { getFormQuestions, validateAnswers } from "@/lib/form-questions";
import { getClientIp } from "@/lib/request";
import { ensureSubmissionAllowed } from "@/lib/submission-guards";

export async function GET() {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const userId = result.userId;
  const adminType = (session!.user as { adminType?: string | null }).adminType;
  const canManageWhitelist = adminType === "team" || adminType === "full";
  if (canManageWhitelist) {
    const applications = await prisma.application.findMany({
      include: {
        user: true,
        reviewedByUser: { select: { username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(applications);
  }
  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(applications);
}

export async function POST(request: Request) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);
  const userId = result.userId;
  const discordId = (session?.user as { discordId?: string } | undefined)?.discordId ?? null;
  const actorName = session?.user?.name ?? "Unknown";
  const ipAddress = getClientIp(request);
  try {
    const body = await request.json();
    const questionDefinitions = await getFormQuestions("whitelist");
    const rawAnswers =
      body && typeof body.answers === "object" && body.answers !== null ? body.answers : body;
    const validation = validateAnswers(questionDefinitions, rawAnswers as Record<string, unknown>);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    const answers = validation.normalized;
    const inGameName = answers.inGameName;
    const age = Number(answers.age) || 0;
    const timezone = answers.timezone;
    const experience = answers.experience;
    const motivation = answers.motivation;
    const characterStory = answers.characterStory || null;
    const additionalInfo = answers.additionalInfo || null;

    if (!inGameName || !age || !timezone || !experience || !motivation) {
      return NextResponse.json(
        { error: "Whitelist questions must include valid in-game name, age, Discord ID, experience, and motivation answers." },
        { status: 400 }
      );
    }
    const guard = await ensureSubmissionAllowed({
      kind: "whitelist",
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
    const application = await prisma.application.create({
      data: {
        userId,
        inGameName,
        age,
        timezone,
        experience,
        motivation,
        characterStory,
        additionalInfo,
        answers: JSON.stringify(answers),
        submitterIp: ipAddress,
        submitterDiscordId: discordId,
      },
      include: { user: true },
    });
    await createAuditLog({
      action: "application_submitted",
      entityType: "whitelist_application",
      entityId: application.id,
      actorUserId: userId,
      actorDiscordId: discordId,
      targetDiscordId: application.user.discordId,
      ipAddress,
      metadata: {
        status: application.status,
        inGameName: application.inGameName,
        submittedBy: actorName,
      },
    });
    await sendDiscordNotification({
      type: "new",
      application,
      message: `New application from **${application.inGameName}** (${application.user.username})`,
    });
    return NextResponse.json(application);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}
