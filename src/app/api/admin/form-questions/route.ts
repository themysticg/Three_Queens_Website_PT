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
} from "@/lib/form-questions";

function canManageFormType(adminType: string | null | undefined, formType: FormType): boolean {
  if (adminType === "full") return true;
  if (formType === "whitelist" || formType === "staff") {
    return adminType === "team";
  }
  return false;
}

function parseFormType(value: unknown): FormType | null {
  return value === "whitelist" || value === "staff" ? value : null;
}

function parseType(value: unknown): FormQuestionType | null {
  return value === "text" || value === "textarea" || value === "number" || value === "select"
    ? value
    : null;
}

function parseLayout(value: unknown): FormQuestionLayout {
  return value === "half" ? "half" : "full";
}

export async function GET(request: Request) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const url = new URL(request.url);
  const formType = parseFormType(url.searchParams.get("formType"));
  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;

  if (!formType || !canManageFormType(adminType, formType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const questions = await getFormQuestions(formType, { includeInactive: true });
  return NextResponse.json(questions);
}

export async function POST(request: Request) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const body = (await request.json().catch(() => null)) as
    | {
        formType?: FormType;
        questionKey?: string;
        label?: string;
        type?: FormQuestionType;
        required?: boolean;
        placeholder?: string;
        options?: string[];
        layout?: FormQuestionLayout;
        sortOrder?: number;
        isActive?: boolean;
      }
    | null;

  const formType = parseFormType(body?.formType);
  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!body || !formType || !canManageFormType(adminType, formType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const type = parseType(body.type);
  const questionKey = normalizeQuestionKey(body.questionKey ?? "");
  const label = (body.label ?? "").trim();

  if (!questionKey || !label || !type) {
    return NextResponse.json(
      { error: "questionKey, label, and a valid type are required" },
      { status: 400 }
    );
  }

  const created = await prisma.formQuestion.create({
    data: {
      formType,
      questionKey,
      label,
      type,
      required: Boolean(body.required),
      placeholder: body.placeholder?.trim() || null,
      options: serializeQuestionOptions(Array.isArray(body.options) ? body.options : []),
      layout: parseLayout(body.layout),
      sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0,
      isActive: body.isActive ?? true,
    },
  });

  await createAuditLog({
    action: "form_question_created",
    entityType: "form_question",
    entityId: created.id,
    actorUserId: result.userId,
    actorDiscordId: (session?.user as { discordId?: string } | undefined)?.discordId ?? null,
    ipAddress: getClientIp(request),
    metadata: {
      formType,
      questionKey: created.questionKey,
      label: created.label,
    },
  });

  const questions = await getFormQuestions(formType, { includeInactive: true });
  return NextResponse.json(questions);
}
