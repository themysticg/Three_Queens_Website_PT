"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBranding } from "@/components/branding-provider";

export function TopBanner() {
  const branding = useBranding();
  const messages = branding.topBannerMessages ?? [];
  const ctaLabel = branding.topBannerCtaLabel;
  const ctaUrl = branding.topBannerCtaUrl || branding.discordLink;

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 8000); // change every 8s
    return () => clearInterval(id);
  }, [messages.length]);

  if (!branding.topBannerEnabled) return null;

  const text =
    messages.length > 0
      ? messages[index]
      : "Tunisia High-life RP is live now — join the city and start your story today.";

  return (
    <div className="brand-bg w-full">
      <div className="container mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-1.5 text-xs sm:text-sm font-medium">
        <span className="truncate">
          {text}
        </span>
        {ctaLabel && (
          <Link
            href={ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap rounded-full border border-zinc-900/40 bg-zinc-950/5 px-3 py-0.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wide hover:bg-zinc-950/10"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

