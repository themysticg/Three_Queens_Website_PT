import { ensureRuleTables } from "@/lib/ensure-rule-schema";
import { prisma } from "@/lib/prisma";

export type RuleSectionDTO = {
  id: string;
  categoryId: string;
  code: string;
  title: string;
  content: string;
  sortOrder: number;
};

export type RuleCategoryDTO = {
  id: string;
  title: string;
  sortOrder: number;
  sections: RuleSectionDTO[];
};

export async function getRulesTree(): Promise<RuleCategoryDTO[]> {
  try {
    await ensureRuleTables();
    const categories = await prisma.ruleCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      include: {
        sections: {
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        },
      },
    });
    return categories.map((c) => ({
      id: c.id,
      title: c.title,
      sortOrder: c.sortOrder,
      sections: c.sections.map((s) => ({
        id: s.id,
        categoryId: s.categoryId,
        code: s.code,
        title: s.title,
        content: s.content,
        sortOrder: s.sortOrder,
      })),
    }));
  } catch {
    return [];
  }
}
