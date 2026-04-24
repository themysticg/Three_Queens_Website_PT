"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

type WhitelistApplication = {
  id: string;
  inGameName: string;
  status: string;
  createdAt: string;
};

type JobApplication = {
  id: string;
  status: string;
  createdAt: string;
  job: { id: string; title: string; category: string };
};

type StaffApplication = {
  id: string;
  status: string;
  createdAt: string;
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

function MyApplicationsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = tabParam === "jobs" ? "jobs" : tabParam === "staff" ? "staff" : "whitelist";
  const [whitelistApps, setWhitelistApps] = useState<WhitelistApplication[]>([]);
  const [jobApps, setJobApps] = useState<JobApplication[]>([]);
  const [staffApps, setStaffApps] = useState<StaffApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/api/auth/signin/discord?callbackUrl=/applications");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/job-applications").then((r) => r.json()),
      fetch("/api/staff-applications").then((r) => r.json()),
    ])
      .then(([wl, job, staff]) => {
        if (Array.isArray(wl)) setWhitelistApps(wl);
        if (Array.isArray(job)) setJobApps(job);
        if (Array.isArray(staff)) setStaffApps(staff);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-100">My applications</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/jobs"
            className="w-full rounded-lg border border-zinc-600 px-4 py-3 text-center text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 sm:w-auto"
          >
            Browse jobs
          </Link>
          <Link
            href="/apply"
            className="w-full rounded-lg border border-zinc-600 px-4 py-3 text-center text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 sm:w-auto"
          >
            New whitelist application
          </Link>
          <Link
            href="/apply/staff"
            className="brand-bg w-full rounded-lg px-4 py-3 text-center font-medium transition brand-bg-hover sm:w-auto"
          >
            New staff application
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-2 border-b border-zinc-800 pb-3 sm:flex sm:pb-0">
        <Link
          href="/applications"
          className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
            tab === "whitelist"
              ? "brand-border brand-text bg-zinc-900/60"
              : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Whitelist ({whitelistApps.length})
        </Link>
        <Link
          href="/applications?tab=jobs"
          className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
            tab === "jobs"
              ? "brand-border brand-text bg-zinc-900/60"
              : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Jobs ({jobApps.length})
        </Link>
        <Link
          href="/applications?tab=staff"
          className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:py-2 ${
            tab === "staff"
              ? "brand-border brand-text bg-zinc-900/60"
              : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Staff ({staffApps.length})
        </Link>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : tab === "staff" ? (
        staffApps.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <p className="text-zinc-400">You haven&apos;t submitted any staff applications yet.</p>
            <Link href="/apply/staff" className="brand-text mt-4 inline-block hover:underline">
              Apply for staff →
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {staffApps.map((app) => (
              <li
                key={app.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-zinc-100">Staff application</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClassName(app.status)}`}
                  >
                    {getStatusLabel(app.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  Submitted {new Date(app.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : tab === "whitelist" ? (
        whitelistApps.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <p className="text-zinc-400">You haven&apos;t submitted any whitelist applications yet.</p>
            <Link href="/apply" className="brand-text mt-4 inline-block hover:underline">
              Submit your first application →
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {whitelistApps.map((app) => (
              <li
                key={app.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-zinc-100">{app.inGameName}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClassName(app.status)}`}
                  >
                    {getStatusLabel(app.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  Submitted {new Date(app.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : jobApps.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-400">You haven&apos;t applied for any jobs yet.</p>
          <Link href="/jobs" className="brand-text mt-4 inline-block hover:underline">
            Browse jobs →
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {jobApps.map((app) => (
            <li
              key={app.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-zinc-100">{app.job.title}</span>
                <span className="text-xs text-zinc-500">{app.job.category}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClassName(app.status)}`}
                >
                  {getStatusLabel(app.status)}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                Applied {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MyApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-zinc-500">Loading...</p>
        </div>
      }
    >
      <MyApplicationsContent />
    </Suspense>
  );
}
