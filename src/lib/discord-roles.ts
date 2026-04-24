/**
 * Assigns Discord roles to users when they are approved (e.g. whitelist role on acceptance).
 * Requires DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, and the relevant role ID.
 *
 * Requirements for role assignment to work:
 * - Bot must have "Manage Roles" permission in the server.
 * - The whitelist role must be BELOW the bot's role in Server Settings → Roles (drag bot role higher).
 * - The user must already be a member of the Discord server (they must have joined the server).
 */

const DISCORD_API = "https://discord.com/api/v10";

function logRoleError(context: string, status: number, body: string): void {
  let message = body;
  try {
    const json = JSON.parse(body) as { message?: string; code?: number };
    if (json.message) message = json.message;
    if (json.code) message += ` (code: ${json.code})`;
  } catch {
    // keep raw body
  }
  console.error(`[discord-roles] ${context}: ${status} - ${message}`);
}

/**
 * Adds a role to a user in your Discord server.
 * No-op if any required env is missing. Logs and returns false on API errors.
 */
export async function addGuildMemberRole(
  discordUserId: string,
  roleId: string,
  guildId?: string
): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  const gid = guildId ?? process.env.DISCORD_GUILD_ID?.trim();
  const rid = roleId?.trim();

  if (!botToken) {
    console.warn("[discord-roles] DISCORD_BOT_TOKEN is missing; skipping role assignment.");
    return false;
  }
  if (!gid) {
    console.warn("[discord-roles] DISCORD_GUILD_ID is missing; skipping role assignment.");
    return false;
  }
  if (!rid) {
    console.warn("[discord-roles] Role ID is empty; skipping role assignment.");
    return false;
  }

  const url = `${DISCORD_API}/guilds/${gid}/members/${discordUserId}/roles/${rid}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
  });

  if (res.ok) return true;

  const text = await res.text();
  logRoleError("Failed to add role", res.status, text);

  // Hint for common issues
  if (res.status === 403) {
    console.error(
      "[discord-roles] 403 = Forbidden. Check: (1) Bot has 'Manage Roles' permission. (2) Bot's role is ABOVE the whitelist role in Server Settings → Roles."
    );
  }
  if (res.status === 404) {
    console.error(
      "[discord-roles] 404 = Not found. The user may not be in your Discord server yet — they must join the server before the bot can assign the role."
    );
  }

  return false;
}

/**
 * Adds the configured whitelist role to the user when their whitelist application is accepted.
 * Set DISCORD_WHITELIST_ROLE_ID in .env to the role ID of your "Whitelist" (or similar) role.
 */
export async function addWhitelistRole(discordUserId: string): Promise<boolean> {
  const roleId = process.env.DISCORD_WHITELIST_ROLE_ID?.trim();
  if (!roleId) return false;
  return addGuildMemberRole(discordUserId, roleId);
}

/**
 * Adds the configured device-check role to the user when their whitelist application
 * is marked for a device check review.
 */
export async function addDeviceCheckRole(discordUserId: string): Promise<boolean> {
  const roleId = process.env.DISCORD_DEVICE_CHECK_ROLE_ID?.trim();
  if (!roleId) return false;
  return addGuildMemberRole(discordUserId, roleId);
}
