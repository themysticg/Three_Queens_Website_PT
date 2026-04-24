import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const jobs = await prisma.job.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  const withParsed = jobs.map((j) => ({
    ...j,
    requirements: JSON.parse(j.requirements || "[]") as string[],
  }));
  return NextResponse.json(withParsed);
}
