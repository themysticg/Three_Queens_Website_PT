"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const VISITOR_STORAGE_KEY = "site-visitor-id";
const HEARTBEAT_INTERVAL_MS = 60_000;

function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing) return existing;

  const generated =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(VISITOR_STORAGE_KEY, generated);
  return generated;
}

export function SiteActivityTracker() {
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    const visitorId = getVisitorId();
    if (!visitorId) return;

    const sendHeartbeat = () => {
      if (document.visibilityState === "hidden") return;

      void fetch("/api/activity/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId,
          currentPath: pathname,
        }),
      }).catch(() => {});
    };

    sendHeartbeat();

    const intervalId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    const handleFocus = () => sendHeartbeat();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, status]);

  return null;
}
