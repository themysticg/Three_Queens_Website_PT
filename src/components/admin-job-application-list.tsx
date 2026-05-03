"use client";

import { useEffect, useState } from "react";
import { RejectionReasonModal } from "@/components/rejection-reason-modal";

type JobApplication = {
  id: string;
  status: string;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  submitterIp?: string | null;
  answers?: string | null;
  job: { id: string; title: string; category: string };
  user: { username: string; discordId: string; avatar?: string | null };
  reviewedByUser?: { username: string; avatar: string | null } | null;
};

export function AdminJobApplicationList() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    fetch("/api/job-applications")
      .then((res) => {
        if (res.status === 403) throw new Error("Forbidden");
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setApplications(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("[AdminJobApplicationList]", err);
        setApplications([]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: "approved" | "rejected", adminNotes?: string) {
    try {
      const res = await fetch(`/api/job-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setExpandedId(null);
    } catch (e) {
      console.error(e);
    }
  }

  const filtered =
    filter === "all"
      ? applications
      : applications.filter((a) => a.status === filter);

  if (loading) {
    return <p className="text-zinc-500">Loading job applications...</p>;
  }

  return (
    <div className="space-y-6">
      <RejectionReasonModal
        open={rejectModalId !== null}
        onClose={() => setRejectModalId(null)}
        onConfirm={(reason) => {
          if (rejectModalId) {
            updateStatus(rejectModalId, "rejected", reason || undefined);
            setRejectModalId(null);
          }
        }}
        title="Reject job application"
      />
      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "brand-bg"
                : "border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500">
          No job applications in this category.
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((app) => (
            <li
              key={app.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
            >
              <button
                type="button"
                className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-zinc-800/50"
                onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
              >
                <span className="font-medium text-zinc-100">{app.job.title}</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-2 text-sm text-zinc-500">
                  {app.user.avatar ? (
                    <img src={app.user.avatar} alt="" className="h-5 w-5 rounded-full object-cover" width={20} height={20} />
                  ) : null}
                  {app.user.username}
                </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      app.status === "approved"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : app.status === "rejected"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {app.status}
                  </span>
                  <span className="text-zinc-500">{expandedId === app.id ? "▼" : "▶"}</span>
                </div>
              </button>
              {expandedId === app.id && (
                <div className="border-t border-zinc-800 p-4 space-y-4">
                  <div className="text-sm">
                    <span className="text-zinc-500">Category</span>
                    <p className="text-zinc-200">{app.job.category}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-zinc-500">Applicant</span>
                    <p className="mt-0.5 flex items-center gap-2 text-zinc-200">
                      {app.user.avatar ? (
                        <img src={app.user.avatar} alt="" className="h-5 w-5 rounded-full object-cover" width={20} height={20} />
                      ) : null}
                      {app.user.username}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="text-zinc-500">Applied</span>
                    <p className="text-zinc-200">{new Date(app.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-zinc-500">IP address</span>
                    <p className="font-mono text-zinc-200">{app.submitterIp ?? "Unknown"}</p>
                  </div>
                  {app.answers && (() => {
                    try {
                      const parsed = JSON.parse(app.answers) as Record<string, string>;
                      const entries = Object.entries(parsed).filter(([, v]) => v);
                      if (entries.length === 0) return null;
                      return (
                        <div className="space-y-3 border-t border-zinc-800 pt-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Application answers</p>
                          {entries.map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="font-medium capitalize text-zinc-400">{key.replace(/_/g, " ")}</span>
                              <p className="mt-0.5 whitespace-pre-wrap text-zinc-200">{value}</p>
                            </div>
                          ))}
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                  {(app.reviewedByUser || app.reviewedAt) && app.status !== "pending" && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-800 pt-4 text-sm">
                      <span className="text-zinc-500">
                        {app.status === "approved" ? "Accepted" : "Rejected"} by{" "}
                        {app.reviewedByUser ? (
                          <span className="inline-flex items-center gap-1.5 text-zinc-300">
                            {app.reviewedByUser.avatar ? (
                              <img src={app.reviewedByUser.avatar} alt="" className="h-4 w-4 rounded-full object-cover" width={16} height={16} />
                            ) : null}
                            {app.reviewedByUser.username}
                          </span>
                        ) : (
                          "—"
                        )}
                      </span>
                      {app.reviewedAt && (
                        <span className="text-zinc-500">
                          {new Date(app.reviewedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                  {app.status === "pending" && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => updateStatus(app.id, "approved")}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectModalId(app.id)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
