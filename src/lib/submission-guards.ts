import { prisma } from "@/lib/prisma";

export const APPLICATION_COOLDOWN_MS = 10 * 60 * 1000;

type SubmissionKind = "whitelist" | "staff" | "job";

type GuardInput = {
  kind: SubmissionKind;
  userId: string;
  discordId: string | null | undefined;
  ipAddress: string | null;
};

type GuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number };

function submissionWhere(input: GuardInput, since: Date) {
  return {
    createdAt: { gte: since },
    OR: [
      { userId: input.userId },
      ...(input.discordId ? [{ submitterDiscordId: input.discordId }] : []),
      ...(input.ipAddress ? [{ submitterIp: input.ipAddress }] : []),
    ],
  };
}

export async function ensureSubmissionAllowed(input: GuardInput): Promise<GuardResult> {
  const now = Date.now();
  const since = new Date(now - APPLICATION_COOLDOWN_MS);

  const [recentWhitelist, recentStaff, recentJob] = await Promise.all([
    prisma.application.findFirst({
      where: submissionWhere(input, since),
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.staffApplication.findFirst({
      where: submissionWhere(input, since),
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.jobApplication.findFirst({
      where: submissionWhere(input, since),
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const latestRecent = [recentWhitelist, recentStaff, recentJob]
    .filter((entry): entry is { createdAt: Date } => Boolean(entry))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  if (latestRecent) {
    const retryAfterMs = APPLICATION_COOLDOWN_MS - (now - latestRecent.createdAt.getTime());
    return {
      ok: false,
      status: 429,
      error: `Please wait ${Math.max(1, Math.ceil(retryAfterMs / 60000))} more minute(s) before submitting another application.`,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  if (input.kind === "whitelist") {
    const pending = await prisma.application.findFirst({
      where: {
        userId: input.userId,
        status: { in: ["pending", "device_check"] },
      },
      select: { id: true },
    });

    if (pending) {
      return {
        ok: false,
        status: 409,
        error: "You already have a whitelist application pending review.",
      };
    }
  }

  if (input.kind === "staff") {
    const pending = await prisma.staffApplication.findFirst({
      where: {
        userId: input.userId,
        status: "pending",
      },
      select: { id: true },
    });

    if (pending) {
      return {
        ok: false,
        status: 409,
        error: "You already have a staff application pending review.",
      };
    }
  }

  return { ok: true };
}
