"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import type { FormQuestionDefinition } from "@/lib/form-questions";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:border-[var(--accent)] focus:outline-none";

export function ApplicationForm() {
  const router = useRouter();
  const toast = useToast();
  const [questions, setQuestions] = useState<FormQuestionDefinition[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/form-questions?formType=whitelist")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load questions");
        return res.json();
      })
      .then((data) => {
        const nextQuestions = Array.isArray(data) ? (data as FormQuestionDefinition[]) : [];
        setQuestions(nextQuestions);
        setForm((current) => {
          const next = { ...current };
          for (const question of nextQuestions) {
            next[question.questionKey] = current[question.questionKey] ?? "";
          }
          return next;
        });
      })
      .catch(() => {
        setError("Failed to load whitelist questions.");
      })
      .finally(() => setQuestionsLoading(false));
  }, []);

  const questionsByKey = useMemo(
    () => Object.fromEntries(questions.map((question) => [question.questionKey, question])),
    [questions]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      toast.addToast("Application submitted. We'll review and notify you via Discord.", "success");
      setTimeout(() => {
        router.push("/applications");
        router.refresh();
      }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  const placeholder = (q: FormQuestionDefinition) => q.placeholder ?? undefined;

  if (questionsLoading) {
    return <p className="text-zinc-500">Loading form questions...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        {questions.map((q) => {
          const isHalfWidth = q.layout === "half";
          const isTextarea = q.type === "textarea";
          const isNumber = q.type === "number";
          const isSelect = q.type === "select";
          return (
            <div
              key={q.id}
              className={isHalfWidth ? "" : "sm:col-span-2"}
            >
              <label htmlFor={q.questionKey} className="mb-1.5 block text-sm font-medium text-zinc-300">
                {q.label}
                {q.required && <span className="text-amber-500"> *</span>}
              </label>
              {isTextarea ? (
                <textarea
                  id={q.questionKey}
                  required={q.required}
                  rows={
                    q.questionKey === "experience" || q.questionKey === "motivation" ? 4 : 3
                  }
                  value={form[q.questionKey] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [q.questionKey]: e.target.value }))}
                  className={inputClass}
                  placeholder={placeholder(q)}
                />
              ) : isSelect ? (
                <select
                  id={q.questionKey}
                  required={q.required}
                  value={form[q.questionKey] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [q.questionKey]: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">{placeholder(q) ?? "Select..."}</option>
                  {q.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={q.questionKey}
                  type={isNumber ? "number" : "text"}
                  min={questionsByKey.age?.questionKey === q.questionKey && isNumber ? 16 : undefined}
                  max={questionsByKey.age?.questionKey === q.questionKey && isNumber ? 120 : undefined}
                  required={q.required}
                  value={form[q.questionKey] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [q.questionKey]: e.target.value }))}
                  className={inputClass}
                  placeholder={placeholder(q)}
                />
              )}
            </div>
          );
        })}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="brand-bg w-full rounded-lg py-3 font-semibold transition brand-bg-hover disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit application"}
      </button>
    </form>
  );
}
