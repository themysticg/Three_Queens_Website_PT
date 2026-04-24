import { NextResponse } from "next/server";
import { getRulesTree } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function GET() {
  const tree = await getRulesTree();
  return NextResponse.json(tree);
}
