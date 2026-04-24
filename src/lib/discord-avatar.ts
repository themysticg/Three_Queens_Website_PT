/**
 * Discord OAuth often stores a full CDN URL in `User.avatar` (NextAuth `user.image`).
 * Older rows may store only the avatar hash — handle both.
 */
export function resolveDiscordAvatarUrl(
  discordId: string,
  avatar: string | null | undefined,
  discriminator: string | null | undefined
): string {
  const raw = avatar?.trim();
  if (!raw) {
    return defaultDiscordEmbedAvatar(discriminator);
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  const ext = raw.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${raw}.${ext}?size=128`;
}

export function defaultDiscordEmbedAvatar(discriminator: string | null | undefined): string {
  const d = discriminator ? Number.parseInt(discriminator, 10) : 0;
  const idx = Number.isFinite(d) ? Math.abs(d) % 5 : 0;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}
