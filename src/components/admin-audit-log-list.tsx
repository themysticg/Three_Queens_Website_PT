"use client";

import { useEffect, useMemo, useState } from "react";

type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorDiscordId: string | null;
  targetDiscordId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorUser: {
    username: string;
    avatar: string | null;
  } | null;
};

function prettifyAction(action: string): string {
  return action.replace(/_/g, " ");
}

export function AdminAuditLogList() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/logs?take=75")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load logs");
        return res.json();
      })
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;

    return logs.filter((log) => {
      const haystack = [
        log.action,
        log.entityType,
        log.actorDiscordId ?? "",
        log.targetDiscordId ?? "",
        log.ipAddress ?? "",
        JSON.stringify(log.metadata ?? {}),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [logs, search]);

  if (loading) {
    return <p className="text-zinc-500">Loading logs...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Audit logs</h3>
          <p className="text-sm text-zinc-500">
            Recent application events, review actions, and admin changes.
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by action, Discord ID, IP..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:border-[var(--accent)] focus:outline-none sm:max-w-sm"
        />
      </div>

      {filteredLogs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-500">
          No logs match this search.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <article
              key={log.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full brand-soft px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                      {prettifyAction(log.action)}
                    </span>
                    <span className="text-sm text-zinc-400">{log.entityType}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                    {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                    {log.entityId && <span>ID: {log.entityId}</span>}
                  </div>
                </div>
                {log.actorUser && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    {log.actorUser.avatar ? (
                      <img
                        src={log.actorUser.avatar}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                        width={32}
                        height={32}
                      />
                    ) : null}
                    <span>{log.actorUser.username}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Actor</p>
                  <p className="mt-1 text-zinc-200">{log.actorDiscordId ?? "Unknown"}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Target</p>
                  <p className="mt-1 text-zinc-200">{log.targetDiscordId ?? "N/A"}</p>
                </div>
              </div>

              {log.metadata && (
                <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-xs text-zinc-300">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
