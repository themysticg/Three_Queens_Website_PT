import Link from "next/link";
import { DiscordAvatarImage } from "@/components/discord-avatar-image";
import { resolveDiscordAvatarUrl } from "@/lib/discord-avatar";
import type { HubApplicationRow } from "@/lib/community-application-feed";

function formatReviewedAt(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function DecisionCard({ row, variant }: { row: HubApplicationRow; variant: "rejected" | "approved" }) {
  const isRejected = variant === "rejected";
  const avatarSrc = resolveDiscordAvatarUrl(row.discordId, row.avatar, row.discriminator);
  const kindLabel = row.kind === "staff" ? "Staff application" : "Whitelist application";
  const reason = row.adminNotes?.trim();

  return (
    <article
      className={`rounded-xl border bg-zinc-950/50 px-5 py-4 ${
        isRejected ? "border-red-500/35" : "border-emerald-500/35"
      }`}
    >
      <div className="flex gap-4">
        <DiscordAvatarImage
          src={avatarSrc}
          fallbackDiscriminator={row.discriminator}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-full border border-zinc-700 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold tracking-tight text-white sm:text-2xl">{row.title}</p>
          <p className="mt-1 text-base text-zinc-400">
            <span className="text-zinc-500">{kindLabel}</span>
            {" · "}
            <span className="font-medium text-zinc-300">{row.discordUsername}</span>
          </p>
          {isRejected ? (
            <p className="mt-3 text-base leading-relaxed text-red-400 sm:text-lg">
              {reason ? (
                <>
                  <span className="font-semibold text-red-300">Reason: </span>
                  {reason}
                </>
              ) : (
                <span className="text-red-400/90">No reason was provided for this rejection.</span>
              )}
            </p>
          ) : (
            <p className="mt-3 text-base leading-relaxed text-emerald-400 sm:text-lg">
              {row.kind === "staff"
                ? "Accepted for the staff team."
                : "Accepted — whitelisted."}
              {reason ? (
                <span className="mt-2 block text-emerald-400/85">Note: {reason}</span>
              ) : null}
            </p>
          )}
          <p className="mt-3 text-xs text-zinc-600">{formatReviewedAt(row.reviewedAt)}</p>
        </div>
      </div>
    </article>
  );
}

export function CommunityApplicationFeed({
  rejected,
  approved,
}: {
  rejected: HubApplicationRow[];
  approved: HubApplicationRow[];
}) {
  const empty = rejected.length === 0 && approved.length === 0;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] brand-text">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800/90 bg-zinc-900/70 text-[var(--accent)]">
              <ClipboardIcon className="h-4 w-4" />
            </span>
            Application outcomes
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Recent whitelist and staff decisions. Rejections show the staff note when one was saved; approvals appear
            below.
          </p>
        </div>
        <Link
          href="/apply"
          className="text-xs font-semibold text-zinc-400 transition hover:text-[var(--accent)]"
        >
          Apply →
        </Link>
      </div>

      {empty ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-8 text-center text-base text-zinc-500">
          No completed applications to show yet.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {rejected.length > 0 ? (
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-red-400/90">
                Rejected ({rejected.length})
              </h3>
              <ul className="space-y-3">
                {rejected.map((row) => (
                  <li key={row.id}>
                    <DecisionCard row={row} variant="rejected" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {approved.length > 0 ? (
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90">
                Accepted ({approved.length})
              </h3>
              <ul className="space-y-3">
                {approved.map((row) => (
                  <li key={row.id}>
                    <DecisionCard row={row} variant="approved" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
