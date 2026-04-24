/**
 * Sends a Discord DM to the applicant when their application is accepted, rejected,
 * or marked for a device check.
 * Works for Whitelist (team), Job, and Staff applications. Message content is driven by
 * app.config.dmTemplates so you can customize everything in one place.
 * Requires DISCORD_BOT_TOKEN. The bot must share a server with the user to open a DM.
 */

import type { DmApplicationTemplate } from "@/config/app.config";
import { discordBotFetch } from "@/lib/discord-bot-fetch";
import { getFreshBrandingSettings } from "@/lib/site-settings";

const DISCORD_API = "https://discord.com/api/v10";

// Discord embed limits (exceeding these causes the message to fail silently or return 400)
const EMBED_DESCRIPTION_MAX = 4096;
const EMBED_FIELD_VALUE_MAX = 1024;
const EMBED_FIELD_NAME_MAX = 256;
const EMBED_FOOTER_MAX = 2048;

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

export type DmApplicationType = "whitelist" | "job" | "staff";

/** Payload for whitelist DMs (team application) */
export type WhitelistDmPayload = {
  type: "whitelist";
  user: { discordId: string; username: string };
  adminNotes: string | null;
  reviewedAt: Date | null;
};

/** Payload for job application DMs */
export type JobDmPayload = {
  type: "job";
  user: { discordId: string; username: string };
  adminNotes: string | null;
  reviewedAt: Date | null;
  jobTitle: string;
};

/** Payload for staff application DMs */
export type StaffDmPayload = {
  type: "staff";
  user: { discordId: string; username: string };
  adminNotes: string | null;
  reviewedAt: Date | null;
};

export type DecisionDmPayload = WhitelistDmPayload | JobDmPayload | StaffDmPayload;
export type DecisionDmStatus = "approved" | "rejected" | "device_check";

export type BroadcastDmPayload = {
  user: { discordId: string; username: string };
  title: string;
  message: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sentBy?: string | null;
};

async function getAuthorName(): Promise<string> {
  const branding = await getFreshBrandingSettings();
  return (
    process.env.DISCORD_DM_AUTHOR_NAME ??
    branding.discordDmAuthorName ??
    branding.serverName ??
    "Whitelist System"
  );
}

async function getFooterText(): Promise<string> {
  const name = await getAuthorName();
  const year = new Date().getFullYear();
  return `© ${year} ${name} - All rights reserved`;
}

function formatDecisionDate(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getApplicationTypeLabel(type: DecisionDmPayload["type"]): string {
  switch (type) {
    case "whitelist":
      return "Whitelist";
    case "job":
      return "Job";
    case "staff":
      return "Staff";
    default:
      return "Application";
  }
}

function getApplicationsUrl(): string | null {
  const base = process.env.NEXTAUTH_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/applications`;
}

async function buildBroadcastEmbed(payload: BroadcastDmPayload): Promise<object> {
  const lines = [payload.message.trim()];
  if (payload.ctaLabel?.trim() && payload.ctaUrl?.trim()) {
    lines.push(`[${payload.ctaLabel.trim()}](${payload.ctaUrl.trim()})`);
  }
  if (payload.sentBy?.trim()) {
    lines.push(`Sent by: **${payload.sentBy.trim()}**`);
  }

  const authorName = await getAuthorName();
  const footerText = await getFooterText();

  return {
    author: {
      name: authorName,
    },
    title: truncate(payload.title.trim() || "New message", EMBED_FIELD_NAME_MAX),
    description: truncate(lines.filter(Boolean).join("\n\n"), EMBED_DESCRIPTION_MAX),
    color: 0xf59e0b,
    footer: {
      text: truncate(footerText, EMBED_FOOTER_MAX),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Builds an embed in a "ticket style" format: title, short intro line, then labeled fields
 * (Application Type, Status, Decision date, Reason, Next steps), matching the Ticket Closed style.
 */
async function buildEmbed(
  payload: DecisionDmPayload,
  status: DecisionDmStatus
): Promise<object> {
  const branding = await getFreshBrandingSettings();
  const templates = branding.dmTemplates?.[payload.type] as DmApplicationTemplate | undefined;
  if (!templates) {
    throw new Error(`[discord-dm] No dmTemplates for type: ${payload.type}`);
  }
  const t =
    status === "approved"
      ? templates.accepted
      : status === "rejected"
        ? templates.rejected
        : templates.deviceCheck;
  if (!t) {
    throw new Error(`[discord-dm] No dmTemplate for status: ${status} on type: ${payload.type}`);
  }
  const reason = payload.adminNotes?.trim() || t.reasonDefault;
  const decisionDate = payload.reviewedAt
    ? formatDecisionDate(payload.reviewedAt)
    : formatDecisionDate(new Date());
  const isAccepted = status === "approved";
  const isDeviceCheck = status === "device_check";
  const serverName = branding.siteName || branding.serverName || "our server";
  const typeLabel = getApplicationTypeLabel(payload.type);

  const introLine = isAccepted
    ? `Your ${typeLabel.toLowerCase()} application for *${serverName}* was **accepted**.`
    : isDeviceCheck
      ? `Your ${typeLabel.toLowerCase()} application for *${serverName}* is now in **device check** review.`
      : `Your ${typeLabel.toLowerCase()} application for *${serverName}* was **rejected**.`;
  const viewUrl = getApplicationsUrl();
  let description = viewUrl
    ? `${introLine}\n\nIt can be [viewed here](${viewUrl}).`
    : introLine;
  if (t.footerNote) {
    description += `\n\n*${t.footerNote}*`;
  }

  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: "Application type", value: typeLabel, inline: true },
    ...(payload.type === "job" && "jobTitle" in payload
      ? [{ name: "Position", value: payload.jobTitle, inline: true as const }]
      : []),
    {
      name: "Status",
      value: isAccepted ? "✅ Accepted" : isDeviceCheck ? "🟡 Device check" : "❌ Rejected",
      inline: true,
    },
    { name: "Decision date", value: decisionDate, inline: true },
  ];

  fields.push({
    name: "Reason",
    value: truncate(reason, EMBED_FIELD_VALUE_MAX),
    inline: false,
  });

  const nextStepsValue = t.nextSteps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n");
  fields.push({
    name: truncate(isAccepted ? "Next steps" : isDeviceCheck ? "What happens next" : "What you can do", EMBED_FIELD_NAME_MAX),
    value: truncate(nextStepsValue, EMBED_FIELD_VALUE_MAX),
    inline: false,
  });

  const footerText = truncate(`${await getFooterText()} • ${decisionDate}`, EMBED_FOOTER_MAX);
  const authorName = await getAuthorName();

  return {
    author: {
      name: authorName,
    },
    title: isAccepted ? "Application Accepted" : isDeviceCheck ? "Device Check Required" : "Application Rejected",
    description: truncate(description, EMBED_DESCRIPTION_MAX),
    color: isAccepted ? 0x57f287 : isDeviceCheck ? 0xf1c40f : 0xed4245,
    fields: fields.map((f) => ({
      name: truncate(f.name, EMBED_FIELD_NAME_MAX),
      value: truncate(f.value, EMBED_FIELD_VALUE_MAX),
      inline: f.inline,
    })),
    footer: {
      text: footerText,
    },
    timestamp: new Date().toISOString(),
  };
}

async function createDMChannel(discordUserId: string, botToken: string): Promise<string | null> {
  const res = await discordBotFetch(
    `${DISCORD_API}/users/@me/channels`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: discordUserId }),
    },
    botToken
  );
  if (!res.ok) {
    const text = await res.text();
    const code = parseDiscordErrorCode(text);
    if (res.status === 403 && (code === 50007 || code === 50278)) {
      console.warn(
        "[discord-dm] Cannot DM this user (they may have DMs disabled for server members or haven't shared a server with the bot). Application was still updated."
      );
    } else {
      console.error("[discord-dm] Failed to create DM channel:", res.status, text);
    }
    return null;
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

function parseDiscordErrorCode(text: string): number | undefined {
  try {
    const json = JSON.parse(text) as { code?: number };
    return json.code;
  } catch {
    return undefined;
  }
}

async function sendChannelMessage(
  channelId: string,
  botToken: string,
  embed: object
): Promise<boolean> {
  const res = await discordBotFetch(
    `${DISCORD_API}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    },
    botToken
  );
  if (!res.ok) {
    const text = await res.text();
    const code = parseDiscordErrorCode(text);
    if (res.status === 403 && (code === 50007 || code === 50278)) {
      console.warn(
        "[discord-dm] Cannot send message to this user (DMs disabled or not allowed). Application was still updated."
      );
    } else {
      console.error("[discord-dm] Failed to send message:", res.status, text);
    }
    return false;
  }
  return true;
}

/**
 * Sends a DM to the applicant with the decision or device-check status.
 * Use for whitelist, job, or staff applications. Content is taken from app.config.dmTemplates.
 * No-op if DISCORD_BOT_TOKEN is not set or the user has no discordId.
 */
export async function sendDecisionDM(
  payload: DecisionDmPayload,
  status: DecisionDmStatus
): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!botToken) {
    console.warn("[discord-dm] DISCORD_BOT_TOKEN not set; skipping DM.");
    return;
  }

  const discordId = payload.user?.discordId;
  if (!discordId) {
    console.warn("[discord-dm] No discordId on applicant; skipping DM.");
    return;
  }

  let embed: object;
  try {
    embed = await buildEmbed(payload, status);
  } catch (e) {
    console.error("[discord-dm] Failed to build embed:", e);
    return;
  }

  const channelId = await createDMChannel(discordId, botToken);
  if (!channelId) return;

  const sent = await sendChannelMessage(channelId, botToken, embed);
  if (!sent) {
    console.error("[discord-dm] Send returned false; check Discord API errors above.");
  }
}

export async function sendMemberBroadcastDM(payload: BroadcastDmPayload): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!botToken) {
    console.warn("[discord-dm] DISCORD_BOT_TOKEN not set; skipping broadcast DM.");
    return false;
  }

  if (!payload.user?.discordId) {
    console.warn("[discord-dm] Broadcast recipient missing discordId; skipping DM.");
    return false;
  }

  const embed = await buildBroadcastEmbed(payload);
  const channelId = await createDMChannel(payload.user.discordId, botToken);
  if (!channelId) return false;

  return sendChannelMessage(channelId, botToken, embed);
}

/**
 * @deprecated Use sendDecisionDM with payload.type === "whitelist" instead.
 * Kept for backward compatibility with the whitelist PATCH route.
 */
export async function sendApplicationDecisionDM(
  application: {
    inGameName: string;
    status: string;
    reviewedAt: Date | null;
    adminNotes: string | null;
    user: { discordId: string; username: string };
  },
  status: DecisionDmStatus
): Promise<void> {
  await sendDecisionDM(
    {
      type: "whitelist",
      user: application.user,
      adminNotes: application.adminNotes,
      reviewedAt: application.reviewedAt,
    },
    status
  );
}
