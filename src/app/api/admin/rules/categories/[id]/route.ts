import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { createAuditLog } from "@/lib/audit";
import { canManageRules } from "@/lib/admin-permissions";
import { ensureRuleTables } from "@/lib/ensure-rule-schema";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/request";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canManageRules(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    title?: string;
    sortOrder?: number;
  } | null;

  const data: { title?: string; sortOrder?: number } = {};
  if (body?.title !== undefined) {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    data.title = t;
  }
  if (body?.sortOrder !== undefined) {
    if (typeof body.sortOrder !== "number" || !Number.isFinite(body.sortOrder)) {
      return NextResponse.json({ error: "Invalid sortOrder" }, { status: 400 });
    }
    data.sortOrder = body.sortOrder;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    await ensureRuleTables();
    const updated = await prisma.ruleCategory.update({
      where: { id },
      data,
    });
    await createAuditLog({
      action: "rule_category_updated",
      entityType: "rule_category",
      entityId: id,
      actorUserId: result.userId,
      actorDiscordId: (session?.user as { discordId?: string } | undefined)?.discordId ?? null,
      ipAddress: getClientIp(request),
      metadata: data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canManageRules(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    await ensureRuleTables();
    await prisma.ruleCategory.delete({ where: { id } });
    await createAuditLog({
      action: "rule_category_deleted",
      entityType: "rule_category",
      entityId: id,
      actorUserId: result.userId,
      actorDiscordId: (session?.user as { discordId?: string } | undefined)?.discordId ?? null,
      ipAddress: getClientIp(request),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
}
