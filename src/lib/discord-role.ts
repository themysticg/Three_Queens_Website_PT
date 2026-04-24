/**
 * Grants a Discord role to a user when their staff application is approved.
 * Requires DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, and DISCORD_STAFF_ROLE_ID.
 * The bot must be in the server with "Manage Roles" permission; the role must be below the bot's highest role.
 */

const DISCORD_API = "https://discord.com/api/v10";

export async function grantStaffRole(discordUserId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  const roleId = process.env.DISCORD_STAFF_ROLE_ID?.trim();

  if (!botToken || !guildId || !roleId) {
    console.warn(
      "[discord-role] Missing DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, or DISCORD_STAFF_ROLE_ID; skipping role grant."
    );
    return false;
  }

  const url = `${DISCORD_API}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
  });

  if (res.ok) return true;

  const text = await res.text();
  if (res.status === 404) {
    console.warn(
      "[discord-role] User or role not found (user may have left the server). Guild ID and Role ID must be correct."
    );
  } else if (res.status === 403) {
    console.warn(
      "[discord-role] Forbidden: bot needs Manage Roles permission and the staff role must be below the bot's highest role."
    );
  } else {
    console.error("[discord-role] Failed to add role:", res.status, text);
  }
  return false;
}
