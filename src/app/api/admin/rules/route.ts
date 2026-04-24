import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { canManageRules } from "@/lib/admin-permissions";
import { getRulesTree } from "@/lib/rules";

export async function GET() {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canManageRules(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tree = await getRulesTree();
  return NextResponse.json(tree);
}
