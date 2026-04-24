"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DiscordAvatarImage } from "@/components/discord-avatar-image";
import { resolveDiscordAvatarUrl } from "@/lib/discord-avatar";

type SiteMember = {
  id: string;
  discordId: string;
  adminType: string;
  createdAt: string;
  addedBy: { id: string; username: string; discordId: string };
  user: { username: string; avatar: string | null; discriminator: string | null } | null;
};

type MemberDirectoryEntry = {
  id: string;
  sequence: number;
  discordId: string;
  username: string;
  avatar: string | null;
  discriminator: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  isAdmin: boolean;
  adminType: string | null;
  siteRole: string | null;
};

type MemberDashboardData = {
  stats: {
    totalVisitors: number;
    totalMembers: number;
    onlineMembers: number;
    onlineWindowMinutes: number;
  };
  broadcast?: {
    guildConfigured: boolean;
    approximateGuildMembers: number | null;
    discordOnline?: {
      count: number;
      fresh: boolean;
      updatedAt: string | null;
    };
  };
  members: MemberDirectoryEntry[];
};

type AdminMembersListProps = {
  isFullAdmin: boolean;
};

function formatRoleLabel(role: string | null | undefined): string {
  if (role === "full") return "Full admin";
  if (role === "team") return "Team admin";
  if (role === "jobs") return "Jobs admin";
  if (role === "rules") return "Rules creator";
  return "Member";
}

function isOnline(lastActiveAt: string | null, onlineWindowMinutes: number): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() <= onlineWindowMinutes * 60 * 1000;
}

function broadcastScopeLabel(audience: string): string {
  if (audience === "guild") return "server members";
  if (audience === "online_site") return "members active on the website";
  if (audience === "online_discord") return "members online on Discord (snapshot)";
  return "registered members";
}

type BroadcastProgress = { current: number; total: number; sent: number; failed: number };

type BroadcastStreamDone = {
  sent: number;
  failed: number;
  audience: string;
  attempted: number;
  fullTotal?: number;
  nextChunkOffset?: number;
  broadcastComplete: boolean;
};

async function consumeMemberBroadcastStream(
  res: Response,
  priorSent: number,
  priorFailed: number,
  setBroadcastProgress: Dispatch<SetStateAction<BroadcastProgress | null>>
): Promise<{
  err: string | null;
  done: BroadcastStreamDone | null;
  partial: boolean;
  streamAudience: string;
  lastLp: BroadcastProgress | null;
}> {
  const outcome: { done: BroadcastStreamDone | null; err: string | null } = { done: null, err: null };
  const streamMeta: {
    audience: string;
    lastProgress: BroadcastProgress | null;
  } = { audience: "registered", lastProgress: null };

  const reader = res.body?.getReader();
  if (!reader) {
    return {
      err: "Could not read the server response.",
      done: null,
      partial: false,
      streamAudience: "registered",
      lastLp: null,
    };
  }

  const decoder = new TextDecoder();
  let buffer = "";

  const handleLine = (line: string) => {
    const t = line.trim();
    if (!t) return;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(t) as Record<string, unknown>;
    } catch {
      return;
    }
    if (msg.type === "start" && typeof msg.total === "number") {
      if (typeof msg.audience === "string") streamMeta.audience = msg.audience;
      const ft = typeof msg.fullTotal === "number" ? msg.fullTotal : msg.total;
      const co = typeof msg.chunkOffset === "number" ? msg.chunkOffset : 0;
      setBroadcastProgress({ current: co, total: ft, sent: priorSent, failed: priorFailed });
    } else if (msg.type === "progress") {
      const cur =
        typeof msg.globalCurrent === "number" ? Number(msg.globalCurrent) : Number(msg.current) || 0;
      const tot = typeof msg.fullTotal === "number" ? Number(msg.fullTotal) : Number(msg.total) || 0;
      streamMeta.lastProgress = {
        current: cur,
        total: tot,
        sent: priorSent + (Number(msg.sent) || 0),
        failed: priorFailed + (Number(msg.failed) || 0),
      };
      setBroadcastProgress(streamMeta.lastProgress);
    } else if (msg.type === "done") {
      outcome.done = {
        sent: Number(msg.sent) || 0,
        failed: Number(msg.failed) || 0,
        audience: String(msg.audience ?? streamMeta.audience),
        attempted: Number(msg.attempted) || 0,
        fullTotal: typeof msg.fullTotal === "number" ? msg.fullTotal : undefined,
        nextChunkOffset: typeof msg.nextChunkOffset === "number" ? msg.nextChunkOffset : undefined,
        broadcastComplete: typeof msg.broadcastComplete === "boolean" ? msg.broadcastComplete : true,
      };
    } else if (msg.type === "error") {
      outcome.err = String(msg.message ?? "Broadcast failed.");
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) handleLine(line);
  }
  if (buffer.trim()) handleLine(buffer);

  const lp = streamMeta.lastProgress;
  const partial = !outcome.done && !outcome.err && Boolean(lp && lp.current > 0);

  return {
    err: outcome.err,
    done: outcome.done,
    partial,
    streamAudience: streamMeta.audience,
    lastLp: lp,
  };
}

export function AdminMembersList({ isFullAdmin }: AdminMembersListProps) {
  const [members, setMembers] = useState<SiteMember[]>([]);
  const [dashboard, setDashboard] = useState<MemberDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [discordId, setDiscordId] = useState("");
  const [adminType, setAdminType] = useState<"team" | "jobs" | "rules" | "full">("team");
  const [submitting, setSubmitting] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);
  const [lookupPreview, setLookupPreview] = useState<{ username: string; avatar: string | null } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastCtaLabel, setBroadcastCtaLabel] = useState("");
  const [broadcastCtaUrl, setBroadcastCtaUrl] = useState("");
  const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);
  const [broadcastAudience, setBroadcastAudience] = useState<
    "online_discord" | "online_site" | "registered" | "guild"
  >("online_discord");
  const [broadcastProgress, setBroadcastProgress] = useState<BroadcastProgress | null>(null);
  const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLookup = useCallback((id: string) => {
    const trimmed = id.trim();
    if (trimmed.length < 17) {
      setLookupPreview(null);
      return;
    }
    setLookupLoading(true);
    fetch(`/api/members/lookup?discordId=${encodeURIComponent(trimmed)}`)
      .then((res) => (res.ok ? res.json() : { username: null, avatar: null }))
      .then((data) => {
        if (data.username || data.avatar) setLookupPreview({ username: data.username ?? "Unknown", avatar: data.avatar ?? null });
        else setLookupPreview(null);
      })
      .catch(() => setLookupPreview(null))
      .finally(() => setLookupLoading(false));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, dashboardRes] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/admin/member-dashboard"),
      ]);

      if (membersRes.status === 403 || dashboardRes.status === 403) {
        throw new Error("Forbidden");
      }

      if (!membersRes.ok || !dashboardRes.ok) {
        throw new Error("Failed");
      }

      const [siteMembers, dashboardData] = await Promise.all([
        membersRes.json() as Promise<SiteMember[]>,
        dashboardRes.json() as Promise<MemberDashboardData>,
      ]);

      setMemberError(null);
      setMembers(siteMembers);
      setDashboard(dashboardData);
    } catch {
      setMembers([]);
      setDashboard(null);
      setMemberError("Failed to load member data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setMemberError(null);
    setMemberSuccess(null);
    const idToAdd = discordId.trim();
    if (!idToAdd) {
      setMemberError("Enter a Discord ID.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId: idToAdd, adminType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMemberError(data.error || "Failed to add member");
        return;
      }
      setDiscordId("");
      setLookupPreview(null);
      setAdminType("team");
      setMemberSuccess("Member added. They may need to sign out and sign in again for access.");
      await loadData();
    } catch {
      setMemberError("Failed to add member");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this member? They will lose admin access until added again.")) return;
    try {
      const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      setMemberSuccess("Member removed.");
      await loadData();
    } catch {
      setMemberError("Failed to remove member");
    }
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    setBroadcastError(null);
    setBroadcastSuccess(null);

    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setBroadcastError("Enter both a title and a message.");
      return;
    }

    if ((broadcastCtaLabel.trim() && !broadcastCtaUrl.trim()) || (!broadcastCtaLabel.trim() && broadcastCtaUrl.trim())) {
      setBroadcastError("CTA label and CTA URL must be filled in together.");
      return;
    }

    if (broadcastAudience === "guild") {
      const ok = window.confirm(
        "Send a Discord DM to every human member in your server (not only people who logged into the website)? Messages are sent slowly (several seconds apart) to avoid rate limits. Large servers can take a long time and may hit hosting time limits."
      );
      if (!ok) return;
    }

    setBroadcastSubmitting(true);
    setBroadcastProgress(null);

    // Smaller chunks for "guild" (slower per-DM pacing). Keeps each request under typical ~300s serverless limits.
    const CHUNK_SIZE = broadcastAudience === "guild" ? 20 : 45;

    let offset = 0;
    let aggSent = 0;
    let aggFail = 0;
    let lastAudience: string = broadcastAudience;

    try {
      while (true) {
        const body = JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          ctaLabel: broadcastCtaLabel,
          ctaUrl: broadcastCtaUrl,
          audience: broadcastAudience,
          chunkOffset: offset,
          chunkSize: CHUNK_SIZE,
        });

        const res = await fetch("/api/admin/member-broadcast?stream=1", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setBroadcastError(data.error || "Failed to send private messages.");
          setBroadcastProgress(null);
          return;
        }

        const chunkResult = await consumeMemberBroadcastStream(res, aggSent, aggFail, setBroadcastProgress);

        if (chunkResult.err) {
          setBroadcastError(chunkResult.err);
          setBroadcastProgress(null);
          return;
        }

        lastAudience = chunkResult.streamAudience;

        if (chunkResult.partial) {
          const lp = chunkResult.lastLp;
          const scope = broadcastScopeLabel(lastAudience);
          if (lp && lp.current > 0) {
            const incomplete = lp.total > 0 && lp.current < lp.total;
            setBroadcastSuccess(
              incomplete
                ? `Partial run (host time limit or disconnect): ${lp.sent} DMs sent, ${lp.failed} failed — processed ${lp.current} of ${lp.total} (${scope}). ${aggSent > 0 ? `Earlier completed batches: ${aggSent} sent. ` : ""}Re-run may repeat some users in the interrupted batch.`
                : `Sent ${lp.sent} Discord DMs (${scope}). ${lp.failed ? `${lp.failed} failed.` : ""} Final confirmation was not received.`
            );
          } else {
            setBroadcastError("Connection lost or failed while sending.");
          }
          window.setTimeout(() => setBroadcastProgress(null), 1200);
          return;
        }

        if (!chunkResult.done) {
          setBroadcastError("Broadcast finished without a result. Check logs.");
          setBroadcastProgress(null);
          return;
        }

        const d = chunkResult.done;
        aggSent += d.sent;
        aggFail += d.failed;
        const ft = d.fullTotal ?? d.attempted;
        const next = d.nextChunkOffset ?? offset + d.attempted;

        if (d.broadcastComplete || next >= ft || d.attempted === 0) {
          break;
        }

        offset = next;
        await new Promise((r) => setTimeout(r, 600));
      }

      const scope = broadcastScopeLabel(lastAudience);
      setBroadcastSuccess(
        `Sent ${aggSent} Discord DMs in auto-batches (${scope}). ${aggFail ? `${aggFail} failed across all batches.` : "No failures reported."}`
      );
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastCtaLabel("");
      setBroadcastCtaUrl("");
      window.setTimeout(() => setBroadcastProgress(null), 900);
    } catch {
      setBroadcastError("Connection lost or failed while sending.");
      setBroadcastProgress(null);
    } finally {
      setBroadcastSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-zinc-500">Loading members...</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Members added here get admin access without editing .env. Only <strong>full admins</strong> (Discord IDs in <code className="rounded bg-zinc-800 px-1">ADMIN_DISCORD_IDS</code>) can add or remove members.
      </p>

      <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="members-discord-id" className="text-xs font-medium text-zinc-400">
            Discord ID
          </label>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <input
              id="members-discord-id"
              type="text"
              value={discordId}
              onChange={(e) => {
                const val = e.target.value;
                setDiscordId(val);
                setLookupPreview(null);
                if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);
                if (val.trim().length >= 17) {
                  lookupTimeoutRef.current = setTimeout(() => fetchLookup(val), 400);
                }
              }}
              onBlur={() => discordId.trim().length >= 17 && fetchLookup(discordId)}
              placeholder="e.g. 123456789012345678"
              className="w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--accent)] focus:outline-none lg:w-72"
            />
            {lookupLoading && <span className="text-xs text-zinc-500">Looking up…</span>}
            {lookupPreview && !lookupLoading && (
              <span className="flex items-center gap-2 rounded bg-zinc-800/80 px-2 py-1 text-sm text-zinc-200">
                <DiscordAvatarImage
                  src={resolveDiscordAvatarUrl(discordId.trim(), lookupPreview.avatar, null)}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full object-cover"
                />
                <span>{lookupPreview.username}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="members-role" className="text-xs font-medium text-zinc-400">
            Role
          </label>
          <select
            id="members-role"
            value={adminType}
            onChange={(e) => setAdminType(e.target.value as "team" | "jobs" | "rules" | "full")}
            className="w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-3 text-base text-zinc-100 focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="team">Team (whitelist + staff)</option>
            <option value="jobs">Jobs + store</option>
            <option value="rules">Rules creator</option>
            {isFullAdmin && <option value="full">Full (all)</option>}
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="brand-bg w-full rounded-lg px-4 py-3 text-sm font-medium transition brand-bg-hover disabled:opacity-50 lg:w-auto"
        >
          {submitting ? "Adding…" : "Add member"}
        </button>
      </form>

      {memberError && (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{memberError}</p>
      )}
      {memberSuccess && (
        <p className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {memberSuccess}
        </p>
      )}

      {dashboard && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Total visitors</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{dashboard.stats.totalVisitors}</p>
              <p className="mt-1 text-sm text-zinc-500">Unique browsers that have opened the site.</p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Registered members</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{dashboard.stats.totalMembers}</p>
              <p className="mt-1 text-sm text-zinc-500">Members who have signed in with Discord.</p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Members online</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{dashboard.stats.onlineMembers}</p>
              <p className="mt-1 text-sm text-zinc-500">Active in the last {dashboard.stats.onlineWindowMinutes} minutes.</p>
            </div>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Send Discord DMs</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Sends from your bot <strong>one user at a time</strong> with pauses and 429 backoff. Large audiences are sent in <strong>automatic batches</strong> (stable order by Discord ID) so hosting time limits (e.g. Vercel ~5 min) don’t stop the run halfway. Recipients must share a server with the bot.{" "}
                <strong>Online on Discord</strong> uses a live list from <code className="rounded bg-zinc-800 px-1 text-xs">npm run discord:presence</code> (Presence + Server Members intents). Very large servers may not expose every online user to the bot.
              </p>
            </div>
            <fieldset className="space-y-2">
              <legend className="sr-only">Audience</legend>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="broadcast-audience"
                  checked={broadcastAudience === "online_discord"}
                  onChange={() => setBroadcastAudience("online_discord")}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-zinc-200">Online on Discord (green dot / idle / DND)</span>
                  <span className="block text-zinc-500">
                    From gateway presence snapshot:{" "}
                    <strong>{dashboard.broadcast?.discordOnline?.count ?? 0}</strong> non-bot users
                    {dashboard.broadcast?.discordOnline?.updatedAt
                      ? ` · updated ${new Date(dashboard.broadcast.discordOnline.updatedAt).toLocaleString()}`
                      : ""}
                    . Requires presence bot + <code className="rounded bg-zinc-800 px-1 text-xs">DATABASE_URL</code>.
                  </span>
                  {(!dashboard.broadcast?.discordOnline?.fresh || (dashboard.broadcast?.discordOnline?.count ?? 0) < 1) && (
                    <span className="mt-1 block text-amber-500/90">
                      Run <code className="rounded bg-zinc-800 px-1 text-xs">npm run discord:presence</code> on a host that can reach your DB; enable{" "}
                      <strong>Presence</strong> and <strong>Server Members</strong> intents; wait until the count above updates (within ~15 minutes).
                    </span>
                  )}
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="broadcast-audience"
                  checked={broadcastAudience === "online_site"}
                  onChange={() => setBroadcastAudience("online_site")}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-zinc-200">Online on website only</span>
                  <span className="block text-zinc-500">
                    Same as <strong>Members online</strong> above: signed in with Discord and active in the last{" "}
                    {dashboard.stats.onlineWindowMinutes} minutes ({dashboard.stats.onlineMembers}) — not Discord status.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="broadcast-audience"
                  checked={broadcastAudience === "registered"}
                  onChange={() => setBroadcastAudience("registered")}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-zinc-200">All registered on website</span>
                  <span className="block text-zinc-500">
                    Everyone who has signed in with Discord ({dashboard.stats.totalMembers}).
                  </span>
                </span>
              </label>
              <label
                className={`flex items-start gap-2 text-sm ${
                  dashboard.broadcast?.guildConfigured ? "cursor-pointer text-zinc-300" : "cursor-not-allowed text-zinc-500"
                }`}
              >
                <input
                  type="radio"
                  name="broadcast-audience"
                  checked={broadcastAudience === "guild"}
                  onChange={() => dashboard.broadcast?.guildConfigured && setBroadcastAudience("guild")}
                  disabled={!dashboard.broadcast?.guildConfigured}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-zinc-200">Everyone in the Discord server (full list)</span>
                  <span className="block text-zinc-500">
                    All human members in the server linked by{" "}
                    <code className="rounded bg-zinc-800 px-1 text-xs">DISCORD_GUILD_ID</code>
                    {dashboard.broadcast?.approximateGuildMembers != null
                      ? ` (~${dashboard.broadcast.approximateGuildMembers} including bots in Discord’s count).`
                      : "."}{" "}
                    Requires{" "}
                    <strong>Server Members Intent</strong> on the bot (Developer Portal → Bot → Privileged Gateway Intents).
                  </span>
                  {!dashboard.broadcast?.guildConfigured && (
                    <span className="mt-1 block text-amber-500/90">
                      Set both <code className="rounded bg-zinc-800 px-1 text-xs">DISCORD_BOT_TOKEN</code> and{" "}
                      <code className="rounded bg-zinc-800 px-1 text-xs">DISCORD_GUILD_ID</code> to enable this option.
                    </span>
                  )}
                </span>
              </label>
            </fieldset>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                Title
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Community update"
                  className="rounded border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                CTA label (optional)
                <input
                  type="text"
                  value={broadcastCtaLabel}
                  onChange={(e) => setBroadcastCtaLabel(e.target.value)}
                  placeholder="Open website"
                  className="rounded border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
              Message
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={5}
                placeholder="Write the private message you want all members to receive."
                className="rounded border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
              CTA URL (optional)
              <input
                type="url"
                value={broadcastCtaUrl}
                onChange={(e) => setBroadcastCtaUrl(e.target.value)}
                placeholder="https://example.com/news"
                className="rounded border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </label>
            {broadcastProgress !== null && (
              <div className="w-full space-y-2">
                <div
                  className="h-4 w-full overflow-hidden rounded-full bg-zinc-800 ring-1 ring-zinc-600/50"
                  aria-label="Broadcast progress"
                >
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={broadcastProgress.total}
                    aria-valuenow={broadcastProgress.current}
                    className="h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400 transition-[width] duration-500 ease-out"
                    style={{
                      width: `${
                        broadcastProgress.total > 0
                          ? Math.min(100, (broadcastProgress.current / broadcastProgress.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-center text-xs text-zinc-400">
                  {broadcastProgress.current} / {broadcastProgress.total} processed · {broadcastProgress.sent} sent ·{" "}
                  {broadcastProgress.failed} failed
                </p>
              </div>
            )}
            {broadcastError && (
              <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{broadcastError}</p>
            )}
            {broadcastSuccess && (
              <p className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                {broadcastSuccess}
              </p>
            )}
            <button
              type="submit"
              disabled={
                broadcastSubmitting ||
                (broadcastAudience === "registered" && !dashboard.members.length) ||
                (broadcastAudience === "online_site" && dashboard.stats.onlineMembers < 1) ||
                (broadcastAudience === "online_discord" &&
                  (!dashboard.broadcast?.discordOnline?.fresh || (dashboard.broadcast?.discordOnline?.count ?? 0) < 1)) ||
                (broadcastAudience === "guild" && !dashboard.broadcast?.guildConfigured)
              }
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
            >
              {broadcastSubmitting
                ? "Sending…"
                : broadcastAudience === "guild"
                  ? `Message everyone in Discord server${
                      dashboard.broadcast?.approximateGuildMembers != null
                        ? ` (~${dashboard.broadcast.approximateGuildMembers})`
                        : ""
                    }`
                  : broadcastAudience === "online_discord"
                    ? `Message Discord-online (${dashboard.broadcast?.discordOnline?.count ?? 0})`
                    : broadcastAudience === "online_site"
                      ? `Message website-online (${dashboard.stats.onlineMembers})`
                      : `Message all registered (${dashboard.stats.totalMembers})`}
            </button>
          </form>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">All registered members</h3>
            {dashboard.members.length === 0 ? (
              <p className="text-sm text-zinc-500">No registered members have signed in yet.</p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {dashboard.members.map((member) => {
                    const online = isOnline(member.lastActiveAt, dashboard.stats.onlineWindowMinutes);
                    const effectiveRole = member.siteRole ?? member.adminType;
                    return (
                      <article key={member.id} className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
                        <div className="flex items-center gap-3">
                          <DiscordAvatarImage
                            src={resolveDiscordAvatarUrl(member.discordId, member.avatar, member.discriminator)}
                            fallbackDiscriminator={member.discriminator}
                            alt=""
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-zinc-100">{member.username}</p>
                            <p className="truncate font-mono text-xs text-zinc-500">{member.discordId}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-zinc-500">Access</p>
                            <p className="text-sm text-zinc-300">{formatRoleLabel(effectiveRole)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-zinc-500">Status</p>
                            <p className={`text-sm ${online ? "text-emerald-400" : "text-zinc-400"}`}>{online ? "Online" : "Offline"}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-zinc-500">Joined</p>
                            <p className="text-sm text-zinc-300">{new Date(member.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-zinc-500">Last active</p>
                            <p className="text-sm text-zinc-300">
                              {member.lastActiveAt ? new Date(member.lastActiveAt).toLocaleString() : "No activity yet"}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="hidden overflow-x-auto rounded-lg border border-zinc-700 md:block">
                  <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700 bg-zinc-800/80">
                      <th className="px-4 py-2 font-medium text-zinc-400">#</th>
                      <th className="px-4 py-2 font-medium text-zinc-400">Member</th>
                      <th className="px-4 py-2 font-medium text-zinc-400">Access</th>
                      <th className="px-4 py-2 font-medium text-zinc-400">Joined</th>
                      <th className="px-4 py-2 font-medium text-zinc-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.members.map((member) => {
                      const online = isOnline(member.lastActiveAt, dashboard.stats.onlineWindowMinutes);
                      const effectiveRole = member.siteRole ?? member.adminType;
                      return (
                        <tr key={member.id} className="border-b border-zinc-800 last:border-0">
                          <td className="px-4 py-2 font-mono text-xs text-zinc-500">{member.sequence}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <DiscordAvatarImage
                                src={resolveDiscordAvatarUrl(member.discordId, member.avatar, member.discriminator)}
                                fallbackDiscriminator={member.discriminator}
                                alt=""
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                              <div className="flex flex-col">
                                <span className="text-zinc-200">{member.username}</span>
                                <span className="font-mono text-xs text-zinc-500">{member.discordId}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-zinc-300">
                            <div className="flex flex-col">
                              <span>{formatRoleLabel(effectiveRole)}</span>
                              {member.isAdmin && !member.siteRole && member.adminType && (
                                <span className="text-xs text-zinc-500">Env admin</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-zinc-500">{new Date(member.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-col">
                              <span className={online ? "text-emerald-400" : "text-zinc-400"}>
                                {online ? "Online" : "Offline"}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {member.lastActiveAt ? new Date(member.lastActiveAt).toLocaleString() : "No activity yet"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">Site-added members ({members.length})</h3>
        {members.length === 0 ? (
          <p className="text-sm text-zinc-500">No members added from the site yet.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {members.map((m) => (
                <article key={m.id} className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
                  <div className="flex items-center gap-3">
                    <DiscordAvatarImage
                      src={resolveDiscordAvatarUrl(m.discordId, m.user?.avatar ?? null, m.user?.discriminator ?? null)}
                      fallbackDiscriminator={m.user?.discriminator ?? null}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-zinc-100">{m.user?.username ?? "Unknown"}</p>
                      <p className="truncate font-mono text-xs text-zinc-500">{m.discordId}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Role</p>
                      <p className="text-sm text-zinc-300">{formatRoleLabel(m.adminType)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Added by</p>
                      <p className="text-sm text-zinc-300">{m.addedBy?.username ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Added</p>
                      <p className="text-sm text-zinc-300">{new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(m.id)}
                    className="mt-4 w-full rounded-lg border border-red-500/40 px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-zinc-700 md:block">
              <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800/80">
                  <th className="px-4 py-2 font-medium text-zinc-400">Member</th>
                  <th className="px-4 py-2 font-medium text-zinc-400">Role</th>
                  <th className="px-4 py-2 font-medium text-zinc-400">Added by</th>
                  <th className="px-4 py-2 font-medium text-zinc-400">Added</th>
                  <th className="px-4 py-2 font-medium text-zinc-400"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-800 last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <DiscordAvatarImage
                          src={resolveDiscordAvatarUrl(m.discordId, m.user?.avatar ?? null, m.user?.discriminator ?? null)}
                          fallbackDiscriminator={m.user?.discriminator ?? null}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="text-zinc-200">{m.user?.username ?? "Unknown"}</span>
                          <span className="font-mono text-xs text-zinc-500">{m.discordId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-zinc-300">{formatRoleLabel(m.adminType)}</td>
                    <td className="px-4 py-2 text-zinc-400">{m.addedBy?.username ?? "—"}</td>
                    <td className="px-4 py-2 text-zinc-500">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleRemove(m.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
