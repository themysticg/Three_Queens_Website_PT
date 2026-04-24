export async function sendDiscordNotification({
  type,
  application,
  message,
}: {
  type: "new" | "approved" | "rejected" | "device_check";
  application: { id: string; inGameName: string; status: string; user?: { username: string; email?: string | null } };
  message: string;
}) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const color = type === "new" ? 0x5865f2 : type === "approved" ? 0x57f287 : type === "device_check" ? 0xf1c40f : 0xed4245;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title:
              type === "new"
                ? "New application"
                : type === "approved"
                  ? "Application approved"
                  : type === "device_check"
                    ? "Device check requested"
                    : "Application rejected",
            description: message,
            color,
            fields: [
              { name: "In-game name", value: application.inGameName, inline: true },
              { name: "Status", value: application.status, inline: true },
              ...(application.user ? [{ name: "Discord", value: application.user.username, inline: true }] : []),
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (e) {
    console.error("Discord webhook error:", e);
  }
}
