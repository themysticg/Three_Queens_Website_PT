import Link from "next/link";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBrandingSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

type HomepageMetrics = {
  members: string;
  staffCount: string;
  jobsCount: string;
  pendingApps: string;
  serverStatus: string;
  playersOnline: string;
  maxPlayers: string;
  serverConnect: string;
};

type FiveMServerResponse = {
  Data?: {
    clients?: number;
    sv_maxclients?: number;
    svMaxclients?: number;
    connectEndPoints?: string[];
  };
};

type DiscordInviteResponse = {
  approximate_member_count?: number;
};

function parseDiscordInviteCode(discordLink: string): string | null {
  const trimmed = discordLink.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);

    if (url.hostname === "discord.gg" && segments[0]) {
      return segments[0];
    }

    if (
      (url.hostname === "discord.com" || url.hostname === "www.discord.com") &&
      segments[0] === "invite"
    ) {
      return segments[1] ?? null;
    }
  } catch {
    return trimmed.replace(/^https?:\/\//, "").split("/").filter(Boolean).pop() ?? null;
  }

  return null;
}

async function getFiveMPlayerMetrics(serverDetailId: string): Promise<
  Pick<HomepageMetrics, "playersOnline" | "maxPlayers" | "serverStatus" | "serverConnect">
> {
  try {
    const response = await fetch(
      `https://servers-frontend.fivem.net/api/servers/single/${encodeURIComponent(serverDetailId)}`,
      {
        next: { revalidate: 30 },
      }
    );

    if (!response.ok) {
      throw new Error(`FiveM API returned ${response.status}`);
    }

    const payload = (await response.json()) as FiveMServerResponse;
    const playersOnline = payload.Data?.clients ?? 0;
    const maxPlayers = payload.Data?.sv_maxclients ?? payload.Data?.svMaxclients ?? 0;
    const serverConnect = payload.Data?.connectEndPoints?.[0] ?? serverDetailId;

    return {
      playersOnline: String(playersOnline),
      maxPlayers: String(maxPlayers || 128),
      serverStatus: "Online",
      serverConnect,
    };
  } catch {
    return {
      playersOnline: "0",
      maxPlayers: "128",
      serverStatus: "Unavailable",
      serverConnect: serverDetailId,
    };
  }
}

async function getDiscordMemberCount(discordLink: string): Promise<string | null> {
  const inviteCode = parseDiscordInviteCode(discordLink);
  if (!inviteCode) return null;

  try {
    const response = await fetch(
      `https://discord.com/api/v9/invites/${encodeURIComponent(inviteCode)}?with_counts=true`,
      {
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      throw new Error(`Discord invite API returned ${response.status}`);
    }

    const payload = (await response.json()) as DiscordInviteResponse;
    const members = payload.approximate_member_count;

    return typeof members === "number" && Number.isFinite(members) ? String(members) : null;
  } catch {
    return null;
  }
}

async function getHomepageMetrics(serverDetailId: string, discordLink: string): Promise<HomepageMetrics> {
  try {
    const [discordMembers, staffCount, jobsCount, pendingApps, liveServer] = await Promise.all([
      getDiscordMemberCount(discordLink),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.job.count(),
      prisma.application.count({ where: { status: "pending" } }),
      getFiveMPlayerMetrics(serverDetailId),
    ]);

    return {
      members: discordMembers ?? "250+",
      staffCount: String(staffCount),
      jobsCount: String(jobsCount),
      pendingApps: String(pendingApps),
      serverStatus: liveServer.serverStatus,
      playersOnline: liveServer.playersOnline,
      maxPlayers: liveServer.maxPlayers,
      serverConnect: liveServer.serverConnect,
    };
  } catch {
    return {
      members: "250+",
      staffCount: "10+",
      jobsCount: "6",
      pendingApps: "Open",
      serverStatus: "Online",
      playersOnline: "0",
      maxPlayers: "128",
      serverConnect: serverDetailId,
    };
  }
}

function applyTemplate(value: string, tokens: Record<string, string>): string {
  return value.replace(/\{(\w+)\}/g, (_, key: string) => tokens[key] ?? "");
}

function resolveStatValue(value: string, tokens: Record<string, string>): string {
  if (value.includes("{playersOnline}") && !value.includes("{maxPlayers}")) {
    return `${tokens.playersOnline}/${tokens.maxPlayers}`;
  }

  return applyTemplate(value, tokens);
}

function getButtonClasses(tone: "discord" | "primary" | "secondary"): string {
  if (tone === "discord") {
    return "bg-[#5865f2] text-white hover:bg-[#4752c4]";
  }

  if (tone === "secondary") {
    return "border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800";
  }

  return "brand-bg text-[var(--accent-foreground)] brand-bg-hover";
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl space-y-2">
      {eyebrow ? (
        <p className="brand-text text-[11px] font-semibold uppercase tracking-[0.22em]">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
      {description ? <p className="text-sm text-zinc-400 sm:text-base">{description}</p> : null}
    </div>
  );
}

export default async function HomePage() {
  let session: Session | null = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  const branding = await getBrandingSettings();
  const homepage = branding.homepage;
  const metrics = await getHomepageMetrics(branding.fivemServerDetailId, branding.discordLink);
  const showDiscordWidget = Boolean(branding.discordWidgetServerId?.trim());

  const tokens = {
    serverName: branding.serverName,
    siteName: branding.siteName,
    discordLink: branding.discordLink,
    applyUrl: session ? "/apply" : "/api/auth/signin/discord?callbackUrl=/apply",
    jobsUrl: "/jobs",
    storeUrl: "/store",
    applicationsUrl: "/applications",
    adminUrl: "/admin",
    members: metrics.members,
    staffCount: metrics.staffCount,
    jobsCount: metrics.jobsCount,
    pendingApps: metrics.pendingApps,
    playersOnline: metrics.playersOnline,
    maxPlayers: metrics.maxPlayers,
    serverStatus: metrics.serverStatus,
    serverConnect: metrics.serverConnect,
  };

  return (
    <div className="space-y-12 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950">
        {homepage.hero.backgroundImageUrl ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url("${homepage.hero.backgroundImageUrl}")` }}
            />
            <div className="absolute inset-0 bg-black/65" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.20),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_28%),linear-gradient(135deg,rgba(10,10,12,0.96),rgba(8,8,12,0.92))]" />
        )}
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:40px_40px]" />

        <div className="relative grid gap-8 px-6 py-8 xl:grid-cols-[1.1fr_0.9fr] xl:px-10 xl:py-10">
          <div className="flex h-full flex-col gap-5">
            {homepage.hero.badge ? (
              <div className="inline-flex items-center rounded-full brand-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
                {applyTemplate(homepage.hero.badge, tokens)}
              </div>
            ) : null}
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                {applyTemplate(homepage.hero.title, tokens)}
              </h1>
              <p className="max-w-2xl text-base text-zinc-300 sm:text-lg">
                {applyTemplate(homepage.hero.subtitle, tokens)}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {[homepage.hero.primaryButton, homepage.hero.secondaryButton]
                .filter((button) => button.label.trim() && button.href.trim())
                .map((button) => {
                  const href = applyTemplate(button.href, tokens);
                  const label = applyTemplate(button.label, tokens);

                  return (
                    <Link
                      key={`${button.tone}-${label}-${href}`}
                      href={href}
                      target={button.openInNewTab ? "_blank" : undefined}
                      rel={button.openInNewTab ? "noreferrer" : undefined}
                      className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition ${getButtonClasses(button.tone)}`}
                    >
                      {label}
                    </Link>
                  );
                })}
            </div>
            {homepage.stats.length > 0 ? (
              <section className="flex min-h-[15rem] flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/75 px-5 py-4">
                <div className="flex w-full flex-1 flex-col justify-between text-xs uppercase tracking-[0.22em] text-zinc-400">
                  {homepage.stats.map((stat) => {
                    const resolvedValue = resolveStatValue(stat.value, tokens);
                    const valueClass = stat.tone === "success" ? "text-emerald-400" : "text-zinc-100";

                    return (
                      <div
                        key={`${stat.label}-${stat.value}`}
                        className="flex items-center justify-between gap-4 border-b border-white/5 py-2 last:border-b-0"
                      >
                        <span className="flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-zinc-200 sm:text-base">
                          {stat.tone === "success" ? (
                            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.7)]" />
                          ) : (
                            <span className="h-1 w-1 rounded-full bg-zinc-700" />
                          )}
                          <span>{applyTemplate(stat.label, tokens)}:</span>
                        </span>
                        <span className={`text-sm font-semibold sm:text-base ${valueClass}`}>
                          {resolvedValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-black/35 p-4 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                {applyTemplate(homepage.hero.snapshotEyebrow, tokens)}
              </p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="max-w-md text-xl font-bold leading-tight text-white">
                  {applyTemplate(homepage.hero.snapshotTitle, tokens)}
                </h2>
                {homepage.hero.snapshotDescription ? (
                  <p className="mt-3 max-w-md text-sm text-zinc-400">
                    {applyTemplate(homepage.hero.snapshotDescription, tokens)}
                  </p>
                ) : null}
                {homepage.hero.snapshotTags.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {homepage.hero.snapshotTags.map((tag) => (
                      <div
                        key={tag}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
                      >
                        {applyTemplate(tag, tokens)}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {showDiscordWidget ? (
              <div className="overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-black/35 p-3 backdrop-blur">
                <iframe
                  src={`https://discord.com/widget?id=${branding.discordWidgetServerId.trim()}&theme=dark`}
                  width="100%"
                  height="360"
                  frameBorder="0"
                  sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                  title="Discord server"
                  className="block rounded-xl"
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {homepage.features.items.length > 0 ? (
        <section className="space-y-5">
          <SectionIntro
            eyebrow={applyTemplate(homepage.features.eyebrow, tokens)}
            title={applyTemplate(homepage.features.title, tokens)}
            description={applyTemplate(homepage.features.description, tokens)}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {homepage.features.items.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
              >
                <h3 className="text-base font-semibold text-white">
                  {applyTemplate(item.title, tokens)}
                </h3>
                {item.description ? (
                  <p className="mt-2 text-sm text-zinc-400">
                    {applyTemplate(item.description, tokens)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {homepage.gallery.items.length > 0 ? (
        <section className="space-y-5">
          <SectionIntro
            eyebrow={applyTemplate(homepage.gallery.eyebrow, tokens)}
            title={applyTemplate(homepage.gallery.title, tokens)}
            description={applyTemplate(homepage.gallery.description, tokens)}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {homepage.gallery.items.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"
              >
                <div className="relative aspect-[16/10] bg-gradient-to-br from-zinc-800 via-zinc-950 to-zinc-900">
                  {item.imageUrl ? (
                    <>
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/5" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_28%)]" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-base font-semibold text-white">
                      {applyTemplate(item.title, tokens)}
                    </h3>
                    {item.description ? (
                      <p className="mt-1 text-sm text-zinc-300">
                        {applyTemplate(item.description, tokens)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        {homepage.join.items.length > 0 ? (
          <section className="space-y-5">
            <SectionIntro
              eyebrow={applyTemplate(homepage.join.eyebrow, tokens)}
              title={applyTemplate(homepage.join.title, tokens)}
              description={applyTemplate(homepage.join.description, tokens)}
            />
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {homepage.join.items.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
                >
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full brand-bg text-xs font-bold">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">
                    {applyTemplate(item.title, tokens)}
                  </h3>
                  {item.description ? (
                    <p className="mt-2 text-sm text-zinc-400">
                      {applyTemplate(item.description, tokens)}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {homepage.announcements.items.length > 0 ? (
          <section className="space-y-5">
            <SectionIntro
              eyebrow={applyTemplate(homepage.announcements.eyebrow, tokens)}
              title={applyTemplate(homepage.announcements.title, tokens)}
              description={applyTemplate(homepage.announcements.description, tokens)}
            />
            <div className="grid gap-4">
              {homepage.announcements.items.map((item) => (
                <article
                  key={`${item.tag}-${item.title}`}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
                >
                  {item.tag ? (
                    <p className="brand-text text-[11px] font-semibold uppercase tracking-[0.2em]">
                      {applyTemplate(item.tag, tokens)}
                    </p>
                  ) : null}
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {applyTemplate(item.title, tokens)}
                  </h3>
                  {item.body ? (
                    <p className="mt-2 text-sm text-zinc-400">
                      {applyTemplate(item.body, tokens)}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {homepage.departments.items.length > 0 ? (
        <section className="space-y-5">
          <SectionIntro
            eyebrow={applyTemplate(homepage.departments.eyebrow, tokens)}
            title={applyTemplate(homepage.departments.title, tokens)}
            description={applyTemplate(homepage.departments.description, tokens)}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {homepage.departments.items.map((item) => (
              <article
                key={item.name}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
              >
                <h3 className="text-base font-semibold text-white">
                  {applyTemplate(item.name, tokens)}
                </h3>
                {item.summary ? (
                  <p className="mt-2 text-sm text-zinc-400">
                    {applyTemplate(item.summary, tokens)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {homepage.faq.items.length > 0 ? (
        <section className="space-y-5">
          <SectionIntro
            eyebrow={applyTemplate(homepage.faq.eyebrow, tokens)}
            title={applyTemplate(homepage.faq.title, tokens)}
            description={applyTemplate(homepage.faq.description, tokens)}
          />
          <div className="space-y-3">
            {homepage.faq.items.map((item) => (
              <details
                key={item.question}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
              >
                <summary className="cursor-pointer list-none text-left text-base font-semibold text-white">
                  {applyTemplate(item.question, tokens)}
                </summary>
                {item.answer ? (
                  <p className="mt-3 text-sm text-zinc-400">
                    {applyTemplate(item.answer, tokens)}
                  </p>
                ) : null}
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
