import { NextResponse } from "next/server";
import { getFormQuestions, type FormType } from "@/lib/form-questions";

function parseFormType(value: string | null): FormType | null {
  return value === "whitelist" || value === "staff" ? value : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const formType = parseFormType(url.searchParams.get("formType"));

  if (!formType) {
    return NextResponse.json(
      { error: "formType must be 'whitelist' or 'staff'" },
      { status: 400 }
    );
  }

  const questions = await getFormQuestions(formType);
  return NextResponse.json(questions);
}
