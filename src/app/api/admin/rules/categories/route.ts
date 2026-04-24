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
    title?: string;
    sortOrder?: number;
  } | null;

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const sortOrder = typeof body?.sortOrder === "number" && Number.isFinite(body.sortOrder) ? body.sortOrder : 0;

  try {
    await ensureRuleTables();
    const created = await prisma.ruleCategory.create({
      data: { title, sortOrder },
    });
    await createAuditLog({
      action: "rule_category_created",
      entityType: "rule_category",
      entityId: created.id,
      actorUserId: result.userId,
      actorDiscordId: (session?.user as { discordId?: string } | undefined)?.discordId ?? null,
      ipAddress: getClientIp(request),
      metadata: { title: created.title },
    });
    return NextResponse.json(created);
  } catch (error) {
    console.error("[admin/rules/categories] POST", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
