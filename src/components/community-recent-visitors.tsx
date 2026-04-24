import { DiscordAvatarImage } from "@/components/discord-avatar-image";
import type { RecentVisitor } from "@/lib/recent-visitors";

function formatSeenAt(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 45) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604_800) return `${Math.floor(sec / 86_400)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CommunityRecentVisitors({ visitors }: { visitors: RecentVisitor[] }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5">
      <h2 className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] brand-text">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800/90 bg-zinc-900/70 text-[var(--accent)]">
          <UsersIcon />
        </span>
        Recent visitors
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        Discord members who were recently active on the site (updates about every minute while the tab is open).
      </p>

      {visitors.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-6 text-center text-sm text-zinc-500">
          No signed-in visitors recorded yet. Activity appears after players log in with Discord and browse the site.
        </p>
      ) : (
        <ol className="mt-4 space-y-0">
          {visitors.map((v, index) => (
            <li
              key={v.userId}
              className="flex items-center gap-3 border-b border-zinc-800/80 py-3 last:border-b-0 first:pt-0"
            >
              <span className="w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums text-zinc-600">
                {String(index + 1).padStart(2, "0")}
              </span>
              <DiscordAvatarImage
                src={v.avatarUrl}
                fallbackDiscriminator={v.discriminator}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full border border-zinc-700 bg-zinc-800 object-cover ring-2 ring-zinc-900"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-100">{v.username}</p>
                <p className="text-xs text-zinc-500">{formatSeenAt(v.lastSeenAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
