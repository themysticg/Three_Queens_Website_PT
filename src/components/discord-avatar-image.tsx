"use client";

import { useState } from "react";
import { defaultDiscordEmbedAvatar } from "@/lib/discord-avatar";

type Props = {
  src: string;
  fallbackDiscriminator?: string | null;
  alt: string;
  className?: string;
  width: number;
  height: number;
};

/**
 * Renders a Discord avatar URL; if the URL fails (expired hash, bad data), shows default embed avatar.
 */
export function DiscordAvatarImage({ src, fallbackDiscriminator, alt, className, width, height }: Props) {
  const [current, setCurrent] = useState(src);
  const fallback = defaultDiscordEmbedAvatar(fallbackDiscriminator ?? null);

  return (
    <img
      src={current}
      alt={alt}
      width={width}
      height={height}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
    />
  );
}
