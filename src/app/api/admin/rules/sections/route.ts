import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { createAuditLog } from "@/lib/audit";
import { canManageRules } from "@/lib/admin-permissions";
import { ensureRuleTables } from "@/lib/ensure-rule-schema";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/request";

export async function POST(request: Request) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canManageRules(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    categoryId?: string;
    code?: string;
    title?: string;
    content?: string;
    sortOrder?: number;
  } | null;

  const categoryId = body?.categoryId?.trim();
  const title = body?.title?.trim();
  if (!categoryId || !title) {
    return NextResponse.json({ error: "categoryId and title are required" }, { status: 400 });
  }

  const code = body?.code?.trim() ?? "";
  const content = body?.content ?? "";
  const sortOrder =
    typeof body?.sortOrder === "number" && Number.isFinite(body.sortOrder) ? body.sortOrder : 0;

  try {
    await ensureRuleTables();
    const created = await prisma.ruleSection.create({
      data: { categoryId, code, title, content, sortOrder },
    });
    await createAuditLog({
      action: "rule_section_created",
      entityType: "rule_section",
      entityId: created.id,
      actorUserId: result.userId,
      actorDiscordId: (session?.user as { discordId?: string } | undefined)?.discordId ?? null,
      ipAddress: getClientIp(request),
      metadata: { title: created.title, categoryId },
    });
    return NextResponse.json(created);
  } catch {
    return NextResponse.json({ error: "Failed to create section (invalid category?)" }, { status: 400 });
  }
}
