"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { appConfig } from "@/config/app.config";
import { useBranding } from "@/components/branding-provider";

export function Header() {
  const { data: session, status } = useSession();
  const branding = useBranding();
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  const [mobileOpen, setMobileOpen] = useState(false);

  const publicLinks = [
    { href: "/community", label: "Community" },
    { href: "/rules", label: "Rules" },
    { href: "/jobs", label: "Jobs" },
    { href: "/store", label: branding.storeNavLabel },
  ];

  const signedInLinks = [
    ...publicLinks,
    { href: "/applications", label: "My applications" },
    { href: "/apply", label: branding.whitelistNavLabel },
    { href: "/apply/staff", label: "Staff" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  const navLinks = session ? signedInLinks : publicLinks;

  const logoLink = (
    <Link href="/" className="flex min-w-0 max-w-[min(100%,18rem)] items-center gap-3 font-semibold text-zinc-100">
      {branding.logoDataUrl ? (
        <img
          src={branding.logoDataUrl}
          alt={`${branding.siteName} logo`}
          className="h-9 w-9 shrink-0 rounded-lg object-cover"
          width={36}
          height={36}
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg brand-bg text-sm font-bold">
          {branding.headerIcon || appConfig.headerIcon}
        </span>
      )}
      <span className="truncate">{branding.siteName}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="container mx-auto max-w-7xl px-4 py-3">
        {/* Mobile: logo left, menu right */}
        <div className="flex min-h-12 items-center justify-between gap-3 md:hidden">
          {logoLink}
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>

        {/* Desktop: logo | centered nav | auth */}
        <div className="hidden min-h-14 min-w-0 items-center md:flex md:gap-4 lg:gap-6">
          <div className="flex min-w-0 flex-1 basis-0 items-center justify-start">{logoLink}</div>

          <nav
            className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-5 lg:gap-x-6"
            aria-label="Main"
          >
            {status === "loading" ? (
              <span className="text-sm text-zinc-500">Loading…</span>
            ) : (
              navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="max-w-[9.5rem] text-center text-sm font-medium leading-snug text-zinc-300 transition hover:text-[var(--accent)] sm:max-w-none sm:whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))
            )}
          </nav>

          <div className="flex min-w-0 flex-1 basis-0 items-center justify-end gap-3">
            {status === "loading" ? null : session ? (
              <>
                <span className="flex min-w-0 max-w-[11rem] items-center gap-2 text-sm text-zinc-400 xl:max-w-[14rem]">
                  {(session.user as { image?: string | null })?.image ? (
                    <img
                      src={(session.user as { image: string }).image}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                      width={28}
                      height={28}
                    />
                  ) : null}
                  <span className="truncate">{session.user?.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="shrink-0 rounded-lg border border-zinc-600 bg-zinc-800/80 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/api/auth/signin/discord"
                className="shrink-0 rounded-lg bg-[#5865f2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4752c4]"
              >
                Login with Discord
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className={`border-t border-zinc-800 bg-zinc-950/95 px-4 py-4 md:hidden ${mobileOpen ? "block" : "hidden"}`}>
        {status === "loading" ? (
          <span className="text-sm text-zinc-500">Loading…</span>
        ) : (
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="w-full rounded-lg border border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
              >
                {link.label}
              </Link>
            ))}
            {session ? (
              <>
                <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-300">
                  {(session.user as { image?: string | null })?.image ? (
                    <img
                      src={(session.user as { image: string }).image}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                      width={32}
                      height={32}
                    />
                  ) : null}
                  <span className="min-w-0 truncate">{session.user?.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/api/auth/signin/discord"
                className="w-full rounded-lg bg-[#5865f2] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#4752c4]"
              >
                Login with Discord
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
