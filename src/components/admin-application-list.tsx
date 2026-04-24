"use client";

import { useEffect, useState } from "react";
import { RejectionReasonModal } from "@/components/rejection-reason-modal";
import type { FormQuestionDefinition } from "@/lib/form-questions";
import { buildWhitelistAnswerMap } from "@/lib/question-answer-utils";

type Application = {
  id: string;
  inGameName: string;
  age: number;
  timezone: string;
  experience: string;
  motivation: string;
  characterStory: string | null;
  additionalInfo: string | null;
  status: string;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  answers?: string | null;
  submitterIp?: string | null;
  submitterDiscordId?: string | null;
  user?: {
    username: string;
    email: string | null;
    avatar: string | null;
    discordId?: string | null;
  } | null;
  reviewedByUser?: { username: string; avatar: string | null } | null;
};

function getStatusLabel(status: string) {
  return status === "device_check" ? "device check" : status;
}

function getStatusClassName(status: string) {
  if (status === "approved") return "bg-emerald-500/20 text-emerald-400";
  if (status === "rejected") return "bg-red-500/20 text-red-400";
  if (status === "device_check") return "bg-yellow-500/20 text-yellow-300";
  return "bg-amber-500/20 text-amber-400";
}

export function AdminApplicationList() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [questions, setQuestions] = useState<FormQuestionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "device_check">("pending");
  const [discordSearch, setDiscordSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/applications").then((res) => {
        if (res.status === 403) throw new Error("Forbidden");
        return res.json();
      }),
      fetch("/api/form-questions?formType=whitelist").then((res) => {
        if (!res.ok) throw new Error("Failed to load questions");
        return res.json();
      }),
    ])
      .then(([applicationData, questionData]) => {
        setApplications(Array.isArray(applicationData) ? applicationData : []);
        setQuestions(Array.isArray(questionData) ? questionData : []);
      })
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: "approved" | "rejected" | "device_check", adminNotes?: string) {
    try {
      const res = await fetch(`/api/applications/${id}`, {
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

  const filteredByDiscord = discordSearch.trim()
    ? filtered.filter((a) => {
        const term = discordSearch.trim().toLowerCase();
        const authId = (a.user?.discordId ?? "").toLowerCase();
        const formDiscordId = (a.timezone ?? "").toLowerCase(); // field labeled "Discord id" in form
        return authId.includes(term) || formDiscordId.includes(term);
      })
    : filtered;

  if (loading) {
    return <p className="text-zinc-500">Loading applications...</p>;
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
        title="Reject whitelist application"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["pending", "device_check", "approved", "rejected", "all"] as const).map((f) => (
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
        <div className="w-full max-w-xs flex-1 sm:w-auto">
          <input
            type="text"
            value={discordSearch}
            onChange={(e) => setDiscordSearch(e.target.value)}
            placeholder="Search by Discord ID"
            className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
        </div>
      </div>
      {filteredByDiscord.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500">
          No applications match this view.
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredByDiscord.map((app) => {
            const answers = buildWhitelistAnswerMap(app);
            return (
              <li
                key={app.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
              >
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-zinc-800/50"
                  onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                >
                  <span className="font-medium text-zinc-100">{app.inGameName}</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-2 text-sm text-zinc-500">
                      {app.user?.avatar ? (
                        <img
                          src={app.user.avatar}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover"
                          width={20}
                          height={20}
                        />
                      ) : null}
                      {app.user?.username ?? "—"}
                      {app.user?.discordId && (
                        <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
                          {app.user.discordId}
                        </span>
                      )}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClassName(app.status)}`}
                    >
                      {getStatusLabel(app.status)}
                    </span>
                    <span className="text-zinc-500">{expandedId === app.id ? "▼" : "▶"}</span>
                  </div>
                </button>
                {expandedId === app.id && (
                  <div className="border-t border-zinc-800 p-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 text-sm">
                      <div>
                        <span className="text-zinc-500">Submitted</span>
                        <p className="text-zinc-200">{new Date(app.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">IP address</span>
                        <p className="font-mono text-zinc-200">{app.submitterIp ?? "Unknown"}</p>
                      </div>
                    </div>
                    {questions.map((question) => (
                      <div key={question.id}>
                        <span className="text-zinc-500 text-sm">{question.label}</span>
                        <p className="mt-1 whitespace-pre-wrap text-zinc-200">
                          {answers[question.questionKey] || "—"}
                        </p>
                      </div>
                    ))}
                    {(app.reviewedByUser || app.reviewedAt) && app.status !== "pending" && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-800 pt-4 text-sm">
                        <span className="text-zinc-500">
                          {app.status === "approved"
                            ? "Accepted"
                            : app.status === "device_check"
                              ? "Marked for device check"
                              : "Rejected"} by{" "}
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
                    {(app.status === "pending" || app.status === "device_check") && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(app.id, "device_check")}
                          className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-yellow-400"
                        >
                          Device check
                        </button>
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
