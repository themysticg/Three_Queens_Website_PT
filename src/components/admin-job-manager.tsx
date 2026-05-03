"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/toast";

type Job = {
  id: string;
  title: string;
  category: string;
  description: string;
  requirements: string;
  salaryTier: number;
};

type EditorState = {
  id: string | null;
  title: string;
  category: string;
  description: string;
  requirementsText: string;
  salaryTier: string;
};

const EMPTY_EDITOR: EditorState = {
  id: null,
  title: "",
  category: "",
  description: "",
  requirementsText: "",
  salaryTier: "1",
};

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:border-[var(--accent)] focus:outline-none";

const SALARY_LABELS = ["$", "$$", "$$$", "$$$$"];

export function AdminJobManager() {
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/jobs")
      .then((r) => r.json())
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .catch(() => toast.addToast("Failed to load jobs", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  function resetEditor() {
    setEditor(EMPTY_EDITOR);
  }

  function startEdit(job: Job) {
    let requirements: string[] = [];
    try { requirements = JSON.parse(job.requirements) as string[]; } catch { /* ok */ }
    setEditor({
      id: job.id,
      title: job.title,
      category: job.category,
      description: job.description,
      requirementsText: requirements.join("\n"),
      salaryTier: String(job.salaryTier),
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const requirements = editor.requirementsText
      .split(/\r?\n/)
      .map((r) => r.trim())
      .filter(Boolean);
    const payload = {
      title: editor.title,
      category: editor.category,
      description: editor.description,
      requirements,
      salaryTier: Number(editor.salaryTier),
    };
    try {
      const res = await fetch(
        editor.id ? `/api/admin/jobs/${editor.id}` : "/api/admin/jobs",
        {
          method: editor.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.addToast(data.error || "Failed to save job", "error"); return; }
      if (editor.id) {
        setJobs((prev) => prev.map((j) => (j.id === editor.id ? (data as Job) : j)));
        toast.addToast("Job updated", "success");
      } else {
        setJobs((prev) => [...prev, data as Job].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title)));
        toast.addToast("Job created — it now appears on the jobs page", "success");
      }
      resetEditor();
    } catch {
      toast.addToast("Failed to save job", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? All applications for this job will also be deleted.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.addToast("Failed to delete job", "error"); return; }
      setJobs((prev) => prev.filter((j) => j.id !== id));
      if (editor.id === id) resetEditor();
      toast.addToast("Job deleted", "success");
    } catch {
      toast.addToast("Failed to delete job", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-zinc-100">
            {editor.id ? "Edit job" : "Create new job"}
          </h3>
          {editor.id && (
            <button type="button" onClick={resetEditor} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Job title
            <input value={editor.title} onChange={(e) => setEditor((s) => ({ ...s, title: e.target.value }))} className={inputClass} placeholder="e.g. LSPD Officer" required />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Category
            <input value={editor.category} onChange={(e) => setEditor((s) => ({ ...s, category: e.target.value }))} className={inputClass} placeholder="e.g. EMERGENCY SERVICES" required />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Description
            <input value={editor.description} onChange={(e) => setEditor((s) => ({ ...s, description: e.target.value }))} className={inputClass} placeholder="Short description shown on the jobs page" required />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Requirements
            <textarea rows={4} value={editor.requirementsText} onChange={(e) => setEditor((s) => ({ ...s, requirementsText: e.target.value }))} className={inputClass} placeholder="One requirement per line" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Starting salary
            <select value={editor.salaryTier} onChange={(e) => setEditor((s) => ({ ...s, salaryTier: e.target.value }))} className={inputClass}>
              {SALARY_LABELS.map((label, i) => (
                <option key={i + 1} value={i + 1}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit" disabled={saving} className="brand-bg w-full rounded-lg px-4 py-3 text-sm font-semibold transition brand-bg-hover disabled:opacity-50 sm:w-auto">
          {saving ? "Saving..." : editor.id ? "Update job" : "Create job"}
        </button>
      </form>

      {loading ? (
        <p className="text-zinc-500">Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-500">
          No jobs yet. Create one above — it will appear on the /jobs page immediately.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            let reqs: string[] = [];
            try { reqs = JSON.parse(job.requirements) as string[]; } catch { /* ok */ }
            return (
              <article key={job.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-zinc-100">{job.title}</span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">{job.category}</span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-amber-400">{SALARY_LABELS[job.salaryTier - 1] ?? "$"}</span>
                    </div>
                    <p className="text-sm text-zinc-400">{job.description}</p>
                    {reqs.length > 0 && (
                      <p className="text-xs text-zinc-500">{reqs.join(" · ")}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => startEdit(job)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(job.id, job.title)} disabled={deletingId === job.id} className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                      {deletingId === job.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
