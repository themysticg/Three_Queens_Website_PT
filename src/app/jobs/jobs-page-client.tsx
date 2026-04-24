"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/toast";

const CATEGORY_ICONS: Record<string, string> = {
  "ALL JOBS": "💼",
  "EMERGENCY SERVICES": "🛡️",
  "CIVILIAN": "👤",
  "CRIMINAL": "🔗",
  "BUSINESS": "💵",
  "GOVERNMENT": "🏛️",
  "MEDICAL": "❤️",
  "MECHANIC": "🔧",
};

const CATEGORY_COLORS: Record<string, string> = {
  "EMERGENCY SERVICES": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "CIVILIAN": "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "CRIMINAL": "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "BUSINESS": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "GOVERNMENT": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "MEDICAL": "bg-red-500/20 text-red-400 border-red-500/30",
  "MECHANIC": "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

type Job = {
  id: string;
  title: string;
  category: string;
  description: string;
  requirements: string[];
  salaryTier: number;
  icon: string | null;
};

type Props = {
  initialJobs: Job[];
  categories: string[];
  countByCategory: Record<string, number>;
  totalJobs: number;
  configHasJobs?: boolean;
};

export function JobsPageClient({
  initialJobs,
  categories,
  countByCategory,
  totalJobs,
  configHasJobs = false,
}: Props) {
  const { data: session } = useSession();
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const filtered =
    selectedCategory === null
      ? initialJobs
      : initialJobs.filter((j) => j.category === selectedCategory);

  const salaryDollars = (tier: number) => "$".repeat(Math.min(4, Math.max(1, tier)));

  async function handleApply(jobId: string) {
    setApplyingId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.addToast(data.error || "Failed to apply", "error");
        return;
      }
      toast.addToast("Application submitted. We'll review it soon.", "success");
      setTimeout(() => {
        window.location.href = "/applications?tab=jobs";
      }, 1200);
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-zinc-100">Jobs</h1>
      <p className="mb-8 text-zinc-400">
        Browse open positions and apply in-game. Sign in with Discord to apply.
      </p>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar - Categories */}
        <aside className="w-full shrink-0 lg:w-56">
          <h2 className="brand-text mb-3 text-sm font-semibold uppercase tracking-wider">
            Categories
          </h2>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  selectedCategory === null
                    ? "brand-bg"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                <span>{CATEGORY_ICONS["ALL JOBS"] ?? "💼"}</span>
                <span>ALL JOBS</span>
                <span className="ml-auto">({totalJobs})</span>
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat}>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    selectedCategory === cat
                      ? "brand-bg"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat] ?? "📋"}</span>
                  <span className="truncate">{cat}</span>
                  <span className="ml-auto">({countByCategory[cat] ?? 0})</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-zinc-500">
            TOTAL JOBS <span className="brand-text">{totalJobs}</span>
          </p>
          <p className="text-xs text-zinc-500">
            SALARY RANGE <span className="brand-text">$-$$$$</span>
          </p>
        </aside>

        {/* Job cards grid */}
        <div className="min-w-0 flex-1">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((job) => (
              <article
                key={job.id}
                className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-2xl" aria-hidden>
                    {job.icon ?? "💼"}
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-medium ${
                      CATEGORY_COLORS[job.category] ?? "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {job.category}
                  </span>
                </div>
                <h3 className="mb-1 text-lg font-bold text-zinc-100">
                  {job.title}
                </h3>
                <p className="mb-3 text-sm text-zinc-400">{job.description}</p>
                <ul className="mb-3 flex-1 space-y-0.5 text-xs text-zinc-500">
                  {job.requirements.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
                <p className="mb-3 text-xs text-zinc-500">
                  STARTING{" "}
                  <span className="brand-text">
                    {salaryDollars(job.salaryTier)}
                  </span>
                </p>
                {session ? (
                  <button
                    type="button"
                    onClick={() => handleApply(job.id)}
                    disabled={applyingId === job.id}
                    className="brand-soft w-full rounded-lg px-4 py-3 text-sm font-medium transition brand-soft-hover disabled:opacity-50"
                  >
                    {applyingId === job.id ? "Applying..." : "APPLY NOW"}
                  </button>
                ) : (
                  <Link
                    href="/api/auth/signin/discord?callbackUrl=/jobs"
                    className="brand-soft block w-full rounded-lg px-4 py-3 text-center text-sm font-medium transition brand-soft-hover"
                  >
                    Sign in to apply
                  </Link>
                )}
              </article>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
              <p className="text-zinc-500">
                {totalJobs === 0 && configHasJobs
                  ? "No jobs loaded yet. Ensure the database is set up (run migrations) and that the app can write to it."
                  : "No jobs in this category."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
