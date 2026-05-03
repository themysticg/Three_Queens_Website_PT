"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/toast";
import type { FormQuestionDefinition } from "@/lib/form-questions";

const CATEGORY_COLORS: Record<string, string> = {
  "EMERGENCY SERVICES": "brand-soft brand-text ring-rose-500/30",
  "CIVILIAN": "brand-soft brand-text ring-rose-500/30",
  "CRIMINAL": "brand-soft brand-text ring-rose-500/30",
  "BUSINESS": "brand-soft brand-text ring-rose-500/30",
  "GOVERNMENT": "brand-soft brand-text ring-rose-500/30",
  "MEDICAL": "brand-soft brand-text ring-rose-500/30",
  "MECHANIC": "brand-soft brand-text ring-rose-500/30",
};

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:border-[var(--accent)] focus:outline-none";

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
};

function JobApplicationModal({
  job,
  questions,
  onClose,
  onSuccess,
}: {
  job: Job;
  questions: FormQuestionDefinition[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((q) => [q.questionKey, ""]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = questions.length > 0 ? { answers: form } : undefined;
      const res = await fetch(`/api/jobs/${job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "Failed to apply";
        setError(msg);
        toast.addToast(msg, "error");
        return;
      }
      toast.addToast("Application submitted. We'll review it soon.", "success");
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800"
        >
          ✕
        </button>
        <h2 className="mb-1 text-xl font-bold text-white">Apply — {job.title}</h2>
        <p className="mb-6 text-sm text-zinc-400">{job.category}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {questions.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No questions required. Click submit to send your application.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {questions.map((q) => (
                <div key={q.id} className={q.layout === "half" ? "" : "sm:col-span-2"}>
                  <label htmlFor={q.questionKey} className="mb-1.5 block text-sm font-medium text-zinc-300">
                    {q.label}
                    {q.required && <span className="text-amber-500"> *</span>}
                  </label>
                  {q.type === "textarea" ? (
                    <textarea
                      id={q.questionKey}
                      required={q.required}
                      rows={4}
                      value={form[q.questionKey] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [q.questionKey]: e.target.value }))}
                      className={inputClass}
                      placeholder={q.placeholder ?? undefined}
                    />
                  ) : q.type === "select" ? (
                    <select
                      id={q.questionKey}
                      required={q.required}
                      value={form[q.questionKey] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [q.questionKey]: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">{q.placeholder ?? "Select..."}</option>
                      {q.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={q.questionKey}
                      type={q.type === "number" ? "number" : "text"}
                      required={q.required}
                      value={form[q.questionKey] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [q.questionKey]: e.target.value }))}
                      className={inputClass}
                      placeholder={q.placeholder ?? undefined}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="brand-bg flex-1 rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function JobsPageClient({
  initialJobs,
  categories,
  countByCategory,
  totalJobs,
}: Props) {
  const { data: session } = useSession();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<FormQuestionDefinition[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const filtered =
    selectedCategory === null
      ? initialJobs
      : initialJobs.filter((j) => j.category === selectedCategory);

  const salaryDollars = (tier: number) => "$".repeat(Math.min(4, Math.max(1, tier)));

  function handleApplyClick(job: Job) {
    setActiveJob(job);
    setQuestionsLoading(true);
    fetch(`/api/form-questions?formType=job&jobId=${job.id}`)
      .then((res) => res.json())
      .then((data) => setQuestions(Array.isArray(data) ? data : []))
      .catch(() => setQuestions([]))
      .finally(() => setQuestionsLoading(false));
  }

  function handleModalClose() {
    setActiveJob(null);
  }

  function handleSuccess() {
    setActiveJob(null);
    setTimeout(() => {
      window.location.href = "/applications?tab=jobs";
    }, 1200);
  }

  return (
    <>
      {activeJob && !questionsLoading && (
        <JobApplicationModal
          job={activeJob}
          questions={questions}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.10),transparent_30%)]" />
          <div className="relative">
          <p className="brand-soft brand-text mb-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest">
            Career Portal
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Find Your Next Role In The City
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Explore active departments, compare starting pay bands, and submit your
            in-game application in seconds with your Discord account.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Open Roles
              </p>
              <p className="mt-1 text-2xl font-bold text-white">{totalJobs}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Departments
              </p>
              <p className="mt-1 text-2xl font-bold text-white">{categories.length}</p>
            </div>
          </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                selectedCategory === null
                  ? "brand-bg text-white"
                  : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-white"
              }`}
            >
              <span>All Jobs</span>
              <span className="rounded-full bg-black/20 px-2 py-0.5">{
                totalJobs
              }</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  selectedCategory === cat
                    ? "brand-bg text-white"
                    : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                <span>{cat}</span>
                <span className="rounded-full bg-black/20 px-2 py-0.5">
                  {countByCategory[cat] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((job) => (
              <article
                key={job.id}
                className="group flex h-full flex-col rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-zinc-600"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{job.title}</h3>
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Starting {salaryDollars(job.salaryTier)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${
                      CATEGORY_COLORS[job.category] ?? "bg-slate-700 text-slate-200 ring-slate-500/40"
                    }`}
                  >
                    {job.category}
                  </span>
                </div>

                <p className="mb-4 text-sm leading-relaxed text-slate-300">
                  {job.description}
                </p>

                <ul className="mb-5 flex-1 space-y-1.5 text-sm text-slate-300">
                  {job.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-cyan-300">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>

                {session ? (
                  <button
                    type="button"
                    onClick={() => handleApplyClick(job)}
                    disabled={questionsLoading && activeJob?.id === job.id}
                    className="brand-bg rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {questionsLoading && activeJob?.id === job.id ? "Loading..." : "Start Application"}
                  </button>
                ) : (
                  <Link
                    href="/api/auth/signin/discord?callbackUrl=/jobs"
                    className="rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-3 text-center text-sm font-semibold text-slate-100 transition hover:border-rose-400/60 hover:text-white"
                  >
                    Sign in with Discord
                  </Link>
                )}
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-10 text-center">
              <p className="text-slate-300">
                {totalJobs === 0
                  ? "No jobs available yet. Create jobs from the Admin panel."
                  : "No jobs found for this department yet."}
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
