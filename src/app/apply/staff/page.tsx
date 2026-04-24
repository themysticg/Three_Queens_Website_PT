"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useBranding } from "@/components/branding-provider";
import { useToast } from "@/components/toast";
import type { FormQuestionDefinition } from "@/lib/form-questions";

export default function ApplyStaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const branding = useBranding();
  const [mounted, setMounted] = useState(false);
  const [questions, setQuestions] = useState<FormQuestionDefinition[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && status === "unauthenticated") {
      router.replace("/api/auth/signin/discord?callbackUrl=/apply/staff");
    }
  }, [mounted, status, router]);
  useEffect(() => {
    if (!mounted) return;

    fetch("/api/form-questions?formType=staff")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load questions");
        return res.json();
      })
      .then((data) => {
        const nextQuestions = Array.isArray(data) ? (data as FormQuestionDefinition[]) : [];
        setQuestions(nextQuestions);
        setAnswers((current) => {
          const next = { ...current };
          for (const question of nextQuestions) {
            next[question.questionKey] = current[question.questionKey] ?? "";
          }
          return next;
        });
      })
      .catch(() => setError("Failed to load staff questions."))
      .finally(() => setQuestionsLoading(false));
  }, [mounted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/staff-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit");
      }
      toast.addToast("Staff application submitted. We'll review it soon.", "success");
      setTimeout(() => router.push("/applications?tab=staff"), 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || !mounted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!session) return null;
  if (questionsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-zinc-500">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-zinc-100">Staff application</h1>
      <p className="mb-8 text-zinc-400">
        Apply to join the {branding.serverName} staff team. We&apos;ll review and get back to you.
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        {questions.map((q) => (
          <div key={q.id}>
            <label htmlFor={q.questionKey} className="mb-1 block text-sm font-medium text-zinc-300">
              {q.label}
              {q.required && <span className="text-amber-500"> *</span>}
            </label>
            {q.type === "textarea" ? (
              <textarea
                id={q.questionKey}
                name={q.questionKey}
                required={q.required}
                rows={4}
                value={answers[q.questionKey] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.questionKey]: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:border-[var(--accent)] focus:outline-none"
                placeholder={q.placeholder ?? "Your answer..."}
              />
            ) : q.type === "select" ? (
              <select
                id={q.questionKey}
                name={q.questionKey}
                required={q.required}
                value={answers[q.questionKey] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.questionKey]: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-base text-zinc-100 focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="">{q.placeholder ?? "Select..."}</option>
                {q.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={q.type === "number" ? "number" : "text"}
                id={q.questionKey}
                name={q.questionKey}
                required={q.required}
                value={answers[q.questionKey] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.questionKey]: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:border-[var(--accent)] focus:outline-none"
                placeholder={q.placeholder ?? "Your answer..."}
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="brand-bg w-full rounded-lg px-4 py-3 font-semibold transition brand-bg-hover disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit staff application"}
        </button>
      </form>
    </div>
  );
}
