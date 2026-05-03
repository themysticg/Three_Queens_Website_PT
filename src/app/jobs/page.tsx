import { JobsPageClient } from "./jobs-page-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  let jobs: { id: string; title: string; category: string; description: string; requirements: string; salaryTier: number; icon: string | null; createdAt: Date; updatedAt: Date }[] = [];
  try {
    jobs = await prisma.job.findMany({
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });
  } catch (e) {
    console.error("[jobs] Error loading jobs:", e);
  }

  const jobsWithRequirements = jobs.map((j) => {
    let requirements: string[] = [];
    try {
      requirements = JSON.parse(j.requirements || "[]") as string[];
    } catch {
      // keep []
    }
    return {
      id: j.id,
      title: j.title,
      category: j.category,
      description: j.description,
      requirements,
      salaryTier: j.salaryTier,
      icon: j.icon,
    };
  });

  const categories = Array.from(new Set(jobs.map((j) => j.category))).sort();
  const countByCategory = categories.reduce(
    (acc, cat) => {
      acc[cat] = jobs.filter((j) => j.category === cat).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <JobsPageClient
      initialJobs={jobsWithRequirements}
      categories={categories}
      countByCategory={countByCategory}
      totalJobs={jobs.length}
    />
  );
}
