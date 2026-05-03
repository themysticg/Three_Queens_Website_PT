"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminApplicationList } from "@/components/admin-application-list";
import { AdminAuditLogList } from "@/components/admin-audit-log-list";
import { AdminBrandingSettings } from "@/components/admin-branding-settings";
import { AdminFormQuestionManager } from "@/components/admin-form-question-manager";
import { AdminJobApplicationList } from "@/components/admin-job-application-list";
import { AdminJobManager } from "@/components/admin-job-manager";
import { AdminStaffApplicationList } from "@/components/admin-staff-application-list";
import { AdminMembersList } from "@/components/admin-members-list";
import { AdminStoreManager } from "@/components/admin-store-manager";
import { AdminRulesManager } from "@/components/admin-rules-manager";
import { canManageRules as userCanManageRules, canViewAuditLogs } from "@/lib/admin-permissions";
import { canManageStore } from "@/lib/store";

type AdminTab =
  | "whitelist"
  | "jobs"
  | "staff"
  | "store"
  | "members"
  | "branding"
  | "logs"
  | "forms"
  | "rules";

function AdminJobsSection() {
  const [subTab, setSubTab] = useState<"applications" | "manage">("applications");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["applications", "manage"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setSubTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${subTab === t ? "brand-bg" : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}>
            {t === "applications" ? "Applications" : "Manage jobs"}
          </button>
        ))}
      </div>
      {subTab === "applications" ? <AdminJobApplicationList /> : <AdminJobManager />}
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("whitelist");

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  const canManageWhitelist = adminType === "team" || adminType === "full";
  const canManageJobs = adminType === "jobs" || adminType === "full";
  const canManageStaff = adminType === "team" || adminType === "full";
  const canManageStoreCatalog = canManageStore(adminType);
  const canManageMembers = adminType === "full"; // only ADMIN_DISCORD_IDS
  const canManageBranding = adminType === "full";
  const canManageRules = userCanManageRules(adminType);
  const canViewLogs = canViewAuditLogs(adminType);
  const canManageForms = canManageWhitelist || canManageStaff;
  const activeTab = useMemo<AdminTab>(() => {
    if (tab === "whitelist" && canManageWhitelist) return tab;
    if (tab === "jobs" && canManageJobs) return tab;
    if (tab === "staff" && canManageStaff) return tab;
    if (tab === "store" && canManageStoreCatalog) return tab;
    if (tab === "members" && canManageMembers) return tab;
    if (tab === "branding" && canManageBranding) return tab;
    if (tab === "rules" && canManageRules) return tab;
    if (tab === "logs" && canViewLogs) return tab;
    if (tab === "forms" && canManageForms) return tab;
    if (canManageWhitelist) return "whitelist";
    if (canManageJobs) return "jobs";
    if (canManageStaff) return "staff";
    if (canManageStoreCatalog) return "store";
    if (canManageMembers) return "members";
    if (canManageBranding) return "branding";
    if (canManageRules) return "rules";
    if (canManageForms) return "forms";
    if (canViewLogs) return "logs";
    return "members";
  }, [
    tab,
    canManageWhitelist,
    canManageJobs,
    canManageStaff,
    canManageStoreCatalog,
    canManageMembers,
    canManageBranding,
    canManageRules,
    canViewLogs,
    canManageForms,
  ]);
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/api/auth/signin/discord?callbackUrl=/admin");
      return;
    }
    if (status === "authenticated") {
      const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
      if (!isAdmin) {
        const t = setTimeout(() => router.replace("/"), 10000);
        return () => clearTimeout(t);
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  const discordId = (session?.user as { discordId?: string } | undefined)?.discordId;

  // Logged in but not admin: show why and how to fix
  if (session && !isAdmin) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="mb-2 text-lg font-semibold text-amber-400">Admin access required</h2>
        <p className="mb-3 text-sm text-zinc-300">
          Your account is not in the admin list. To access the admin panel:
        </p>
        <ol className="mb-4 list-inside list-decimal space-y-1 text-sm text-zinc-400">
          <li>Ask an existing admin to add you from <strong>Admin → Manage members</strong> (no .env edit needed), or add your Discord ID to the server environment variables.</li>
          {discordId && (
            <li className="mt-2 rounded bg-zinc-800/80 px-2 py-1 font-mono text-amber-300">
              Your Discord ID: <strong>{discordId}</strong>
            </li>
          )}
          <li>
            Set <code className="rounded bg-zinc-800 px-1">ADMIN_DISCORD_IDS</code> (or{" "}
            <code className="rounded bg-zinc-800 px-1">TEAM_ADMIN_DISCORD_IDS</code> /{" "}
            <code className="rounded bg-zinc-800 px-1">JOBS_ADMIN_DISCORD_IDS</code> /{" "}
            <code className="rounded bg-zinc-800 px-1">RULES_ADMIN_DISCORD_IDS</code>) in your .env
            file or, on Vercel, in Project Settings → Environment Variables.
          </li>
          <li>Redeploy or restart the app, then sign out and sign in again.</li>
        </ol>
        <p className="text-xs text-zinc-500">
          Redirecting you to the homepage in a few seconds…
        </p>
      </div>
    );
  }

  if (!session || !isAdmin) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Admin</h1>
      <p className="mb-2 text-zinc-600 dark:text-zinc-400">
        {[canManageWhitelist && "whitelist", canManageJobs && "job", canManageStaff && "staff", canManageStoreCatalog && "store catalog", canManageForms && "forms", canManageBranding && "branding", canManageRules && "rules", canViewLogs && "logs"]
          .filter(Boolean)
          .join(", ")}
        {" "}management.
      </p>
      {!canManageStaff && (canManageWhitelist || canManageJobs) && (
        <p className="mb-6 text-xs text-amber-600/90 dark:text-amber-400/90">
          To review <strong>staff</strong> applications, add your Discord ID to <code className="rounded bg-zinc-800 px-1">ADMIN_DISCORD_IDS</code> or <code className="rounded bg-zinc-800 px-1">TEAM_ADMIN_DISCORD_IDS</code> in .env, then sign in again.
        </p>
      )}
      {canManageStaff && (
        <p className="mb-6 text-xs text-zinc-500">
          Staff applications from /apply/staff appear in the <strong>Staff applications</strong> tab below.
        </p>
      )}

      <div className="mb-4 grid gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800 sm:flex sm:flex-wrap sm:pb-0">
        {canManageWhitelist && (
          <button
            type="button"
            onClick={() => setTab("whitelist")}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
              activeTab === "whitelist"
                ? "brand-border brand-text bg-zinc-100/80 dark:bg-zinc-900/80"
                : "border-zinc-200 text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            Whitelist (team)
          </button>
        )}
        {canManageJobs && (
          <button
            type="button"
            onClick={() => setTab("jobs")}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
              activeTab === "jobs"
                ? "brand-border brand-text bg-zinc-100/80 dark:bg-zinc-900/80"
                : "border-zinc-200 text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            Jobs & city positions
          </button>
        )}
        {canManageStaff && (
          <button
            type="button"
            onClick={() => setTab("staff")}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
              activeTab === "staff"
                ? "brand-border brand-text bg-zinc-100/80 dark:bg-zinc-900/80"
                : "border-zinc-200 text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            Staff applications
          </button>
        )}
        {canManageStoreCatalog && (
          <button
            type="button"
            onClick={() => setTab("store")}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
              activeTab === "store"
                ? "brand-border brand-text bg-zinc-100/80 dark:bg-zinc-900/80"
                : "border-zinc-200 text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            Store catalog
          </button>
        )}
        {canManageMembers && (
          <button
            type="button"
            onClick={() => setTab("members")}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
              activeTab === "members"
                ? "brand-border brand-text bg-zinc-100/80 dark:bg-zinc-900/80"
                : "border-zinc-200 text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            Manage members
          </button>
        )}
        {canManageBranding && (
          <button
            type="button"
            onClick={() => setTab("branding")}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
              activeTab === "branding"
                ? "brand-border brand-text bg-zinc-100/80 dark:bg-zinc-900/80"
                : "border-zinc-200 text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            Branding
          </button>
        )}
        {canManageRules && (
          <button
            type="button"
            onClick={() => setTab("rules")}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
              activeTab === "rules"
                ? "brand-border brand-text bg-zinc-100/80 dark:bg-zinc-900/80"
                : "border-zinc-200 text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            Rules
          </button>
        )}
        {canManageForms && (
          <button
            type="button"
            onClick={() => setTab("forms")}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
              activeTab === "forms"
                ? "brand-border brand-text bg-zinc-100/80 dark:bg-zinc-900/80"
                : "border-zinc-200 text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            Forms
          </button>
        )}
        {canViewLogs && (
          <button
            type="button"
            onClick={() => setTab("logs")}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
              activeTab === "logs"
                ? "brand-border brand-text bg-zinc-100/80 dark:bg-zinc-900/80"
                : "border-zinc-200 text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            Logs
          </button>
        )}
      </div>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-500">
        Viewing: <strong className="text-zinc-600 dark:text-zinc-400">
          {activeTab === "whitelist"
            ? "Whitelist (team)"
            : activeTab === "jobs"
              ? "Jobs & city positions"
              : activeTab === "staff"
                ? "Staff applications"
                : activeTab === "store"
                  ? "Store catalog"
                  : activeTab === "members"
                    ? "Manage members"
                    : activeTab === "branding"
                      ? "Branding"
                      : activeTab === "rules"
                        ? "Rules"
                        : activeTab === "forms"
                          ? "Forms"
                          : "Logs"}
        </strong>
        {activeTab !== "staff" && canManageStaff && activeTab !== "members" && activeTab !== "store" && " — Staff applications are in the tab above."}
      </p>

      {activeTab === "whitelist" && <AdminApplicationList />}
      {activeTab === "jobs" && <AdminJobsSection />}
      {activeTab === "staff" && <AdminStaffApplicationList />}
      {activeTab === "store" && <AdminStoreManager />}
      {activeTab === "members" && <AdminMembersList isFullAdmin={adminType === "full"} />}
      {activeTab === "branding" && <AdminBrandingSettings />}
      {activeTab === "rules" && <AdminRulesManager />}
      {activeTab === "forms" && <AdminFormQuestionManager />}
      {activeTab === "logs" && <AdminAuditLogList />}
    </div>
  );
}
