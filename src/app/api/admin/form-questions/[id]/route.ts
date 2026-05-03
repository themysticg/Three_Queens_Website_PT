import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import {
  getFormQuestions,
  normalizeQuestionKey,
  serializeQuestionOptions,
  type FormQuestionLayout,
  type FormQuestionType,
  type FormType,
  WHITELIST_REQUIRED_QUESTION_KEYS,
  WHITELIST_RESERVED_QUESTION_KEYS,
} from "@/lib/form-questions";

function canManageFormType(adminType: string | null | undefined, formType: FormType): boolean {
  if (adminType === "full") return true;
  if (formType === "whitelist" || formType === "staff") {
    return adminType === "team";
  }
  if (formType === "job") {
    return adminType === "jobs" || adminType === "team";
  }
  return false;
}

function parseType(value: unknown): FormQuestionType | null {
  return value === "text" || value === "textarea" || value === "number" || value === "select"
    ? value
    : null;
}

function parseLayout(value: unknown): FormQuestionLayout {
  return value === "half" ? "half" : "full";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const { id } = await params;
  const existing = await prisma.formQuestion.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canManageFormType(adminType, existing.formType as FormType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        questionKey?: string;
        label?: string;
        type?: FormQuestionType;
        required?: boolean;
        placeholder?: string | null;
        options?: string[];
        layout?: FormQuestionLayout;
        sortOrder?: number;
        isActive?: boolean;
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const nextType = body.type ? parseType(body.type) : (existing.type as FormQuestionType);
  const nextQuestionKey = body.questionKey
    ? normalizeQuestionKey(body.questionKey)
    : existing.questionKey;
  if (!nextType) {
    return NextResponse.json({ error: "Invalid question type" }, { status: 400 });
  }
  if (
    existing.formType === "whitelist" &&
    WHITELIST_RESERVED_QUESTION_KEYS.includes(existing.questionKey as (typeof WHITELIST_RESERVED_QUESTION_KEYS)[number]) &&
    nextQuestionKey !== existing.questionKey
  ) {
    return NextResponse.json(
      { error: "Built-in whitelist question keys cannot be renamed." },
      { status: 400 }
    );
  }

  await prisma.formQuestion.update({
    where: { id },
    data: {
      questionKey: nextQuestionKey,
      label: body.label?.trim() || existing.label,
      type: nextType,
      required: typeof body.required === "boolean" ? body.required : existing.required,
      placeholder:
        body.placeholder !== undefined ? body.placeholder?.trim() || null : existing.placeholder,
      options:
        body.options !== undefined
          ? serializeQuestionOptions(Array.isArray(body.options) ? body.options : [])
          : existing.options,
      layout: body.layout ? parseLayout(body.layout) : existing.layout,
      sortOrder:
        body.sortOrder !== undefined && Number.isFinite(body.sortOrder)
          ? Number(body.sortOrder)
          : existing.sortOrder,
      isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
    },
  });

  await createAuditLog({
    action: "form_question_updated",
    entityType: "form_question",
    entityId: id,
    actorUserId: result.userId,
    actorDiscordId: (session?.user as { discordId?: string } | undefined)?.discordId ?? null,
    ipAddress: getClientIp(request),
    metadata: {
      formType: existing.formType,
      questionKey: nextQuestionKey,
    },
  });

  const questions = await getFormQuestions(existing.formType as FormType, {
    includeInactive: true,
  });
  return NextResponse.json(questions);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const { id } = await params;
  const existing = await prisma.formQuestion.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canManageFormType(adminType, existing.formType as FormType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (
    existing.formType === "whitelist" &&
    WHITELIST_REQUIRED_QUESTION_KEYS.includes(existing.questionKey as (typeof WHITELIST_REQUIRED_QUESTION_KEYS)[number])
  ) {
    return NextResponse.json(
      { error: "Core whitelist questions cannot be deleted." },
      { status: 400 }
    );
  }

  await prisma.formQuestion.delete({ where: { id } });

  await createAuditLog({
    action: "form_question_deleted",
    entityType: "form_question",
    entityId: id,
    actorUserId: result.userId,
    actorDiscordId: (session?.user as { discordId?: string } | undefined)?.discordId ?? null,
    ipAddress: getClientIp(request),
    metadata: {
      formType: existing.formType,
      questionKey: existing.questionKey,
      label: existing.label,
    },
  });

  const questions = await getFormQuestions(existing.formType as FormType, {
    includeInactive: true,
  });
  return NextResponse.json(questions);
}
