import Link from "next/link";
import { CommunityRecentVisitors } from "@/components/community-recent-visitors";
import { getBrandingSettings } from "@/lib/site-settings";
import { CommunityApplicationFeed } from "@/components/community-application-feed";
import { getCommunityApplicationFeed } from "@/lib/community-application-feed";
import { getCommunityHubMetrics } from "@/lib/hub-metrics";
import { getRecentVisitors } from "@/lib/recent-visitors";
import { getRulesTree } from "@/lib/rules";

export const dynamic = "force-dynamic";

type StatCardProps = {
  label: string;
  value: string;
  active?: boolean;
};

function StatCard({ label, value, active }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-center ${
        active ? "ring-1 ring-[var(--accent)]/40" : ""
      }`}
    >
      <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
    </div>
  );
}

export default async function CommunityPage() {
  const branding = await getBrandingSettings();
  const [metrics, rules, recentVisitors, applicationFeed] = await Promise.all([
    getCommunityHubMetrics(branding.fivemServerDetailId, branding.discordLink),
    getRulesTree(),
    getRecentVisitors(14),
    getCommunityApplicationFeed(),
  ]);

  return (
    <div className="space-y-10 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 px-6 py-10 sm:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.10),transparent_30%)]" />
        <div className="relative space-y-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Community</p>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Community <span className="brand-text">hub</span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-zinc-400 sm:text-base">
            Community activity, whitelist status, live server snapshot, and the official rulebook — everything you need
            in one place.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Discord members" value={metrics.discordMembers} active />
        <StatCard label="Online (FiveM)" value={metrics.playersOnline} />
        <StatCard label="Whitelist OK" value={metrics.whitelistApproved} />
        <StatCard label="Profiles" value={metrics.registeredUsers} />
        <StatCard label="Rule categories" value={metrics.ruleCategories} />
        <StatCard label="Pending apps" value={metrics.pendingApplications} />
      </section>

      <nav
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/90 bg-zinc-950/40 px-4 py-3"
        aria-label="Quick links"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Quick links</span>
        <span className="hidden h-4 w-px bg-zinc-700 sm:block" aria-hidden />
        <Link href="/rules" className="text-sm font-medium text-zinc-300 transition hover:text-[var(--accent)]">
          Rules
        </Link>
        <span className="text-zinc-600">·</span>
        <Link
          href={branding.discordLink || "#"}
          target={branding.discordLink ? "_blank" : undefined}
          rel={branding.discordLink ? "noreferrer" : undefined}
          className="text-sm font-medium text-zinc-300 transition hover:text-[var(--accent)]"
        >
          Discord
        </Link>
        <span className="text-zinc-600">·</span>
        <Link href="/apply" className="text-sm font-medium text-zinc-300 transition hover:text-[var(--accent)]">
          {branding.whitelistNavLabel}
        </Link>
        <span className="text-zinc-600">·</span>
        <Link href="/jobs" className="text-sm font-medium text-zinc-300 transition hover:text-[var(--accent)]">
          Jobs
        </Link>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <CommunityRecentVisitors visitors={recentVisitors} />

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] brand-text">Rules overview</h2>
            <Link
              href="/rules"
              className="text-xs font-semibold text-zinc-400 transition hover:text-[var(--accent)]"
            >
              View all →
            </Link>
          </div>
          {rules.length === 0 ? (
            <p className="mt-4 text-base leading-relaxed text-zinc-500">
              Rule categories will appear here once a full admin adds them under Admin → Rules.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {rules.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/rules#${cat.id}`}
                    className="block rounded-xl border border-zinc-800 bg-zinc-950/50 px-5 py-4 transition hover:border-zinc-600"
                  >
                    <span className="block text-xl font-bold tracking-tight text-white sm:text-2xl">{cat.title}</span>
                    <span className="mt-1.5 block text-base leading-snug text-zinc-400">
                      {cat.sections.length} {cat.sections.length === 1 ? "section" : "sections"} — open the full rulebook for details.
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <CommunityApplicationFeed rejected={applicationFeed.rejected} approved={applicationFeed.approved} />
    </div>
  );
}
