import { JobsPageClient } from "./jobs-page-client";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/config/app.config";

export const dynamic = "force-dynamic";

/**
 * Syncs app.config.businesses to the Job table (one job per business by title) and returns
 * only those jobs. The Jobs page displays only entries from config — no extras.
 * Uses title matching so it works without requiring a schema change.
 */
async function getJobsFromConfig() {
  const businesses = appConfig.businesses;
  const configTitles = businesses.map((b) => b.name);

  for (const b of businesses) {
    const existing = await prisma.job.findFirst({
      where: { title: b.name },
    });
    if (existing) {
      await prisma.job.update({
        where: { id: existing.id },
        data: {
          category: b.category,
          description: b.description,
        },
      });
    } else {
      await prisma.job.create({
        data: {
          title: b.name,
          category: b.category,
          description: b.description,
          requirements: "[]",
          salaryTier: 1,
        },
      });
    }
  }

  const jobs = await prisma.job.findMany({
    where: { title: { in: configTitles } },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  return jobs;
}

export default async function JobsPage() {
  let jobs: Awaited<ReturnType<typeof getJobsFromConfig>> = [];
  try {
    jobs = await getJobsFromConfig();
  } catch (e) {
    console.error("[jobs] Error loading jobs from config (run migrations and ensure DB is writable):", e);
  }
  const configHasJobs = appConfig.businesses.length > 0;

  // Build plain serializable objects for the client (no Prisma getters/functions)
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
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
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
      configHasJobs={configHasJobs}
    />
  );
}
