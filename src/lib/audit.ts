import { prisma } from "@/lib/prisma";
import { getAuditWebhookUrl } from "@/lib/site-settings";

export type AuditLogInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId: string;
  actorDiscordId: string | null;
  targetDiscordId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
};

const FIELD_MAX = 1020;
const DESC_MAX = 3500;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function mention(discordId: string | null | undefined): string {
  const id = discordId?.trim();
  if (!id || !/^\d{5,}$/.test(id)) return "—";
  return `<@${id}>`;
}

function embedColor(action: string): number {
  const a = action.toLowerCase();
  if (a.includes("rejected")) return 0xed4245;
  if (a.includes("approved")) return 0x57f287;
  if (a.includes("device_check")) return 0xfee75c;
  if (a.includes("deleted") || a.includes("removed")) return 0xeb459e;
  if (a.includes("submitted")) return 0x5865f2;
  if (a.startsWith("rule_")) return 0xc084fc;
  if (a.includes("form_question")) return 0x99aab5;
  if (a.includes("site_settings")) return 0x00b0f4;
  if (a.includes("admin_member") || a.includes("broadcast")) return 0xfaa61a;
  return 0xfeb457;
}

function humanizeAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ACTION_TITLES: Record<string, string> = {
  application_submitted: "Whitelist · Application submitted",
  application_approved: "Whitelist · Application approved",
  application_rejected: "Whitelist · Application rejected",
  application_device_check: "Whitelist · Device check",
  staff_application_submitted: "Staff · Application submitted",
  staff_application_approved: "Staff · Application approved",
  staff_application_rejected: "Staff · Application rejected",
  job_application_submitted: "Job · Application submitted",
  job_application_approved: "Job · Application approved",
  job_application_rejected: "Job · Application rejected",
  rule_category_created: "Rules · Category created",
  rule_category_updated: "Rules · Category updated",
  rule_category_deleted: "Rules · Category deleted",
  rule_section_created: "Rules · Section created",
  rule_section_updated: "Rules · Section updated",
  rule_section_deleted: "Rules · Section deleted",
  site_settings_updated: "Site · Settings updated",
  form_question_created: "Forms · Question created",
  form_question_updated: "Forms · Question updated",
  form_question_deleted: "Forms · Question deleted",
  admin_member_role_changed: "Admin · Member role changed",
  admin_member_banned: "Admin · Member banned",
  admin_member_unbanned: "Admin · Member unbanned",
  admin_member_added: "Admin · Member added",
  admin_member_removed: "Admin · Member removed",
  admin_member_broadcast: "Admin · Member broadcast",
  broadcast_sent: "Admin · Broadcast sent",
};

function embedTitle(action: string): string {
  return ACTION_TITLES[action] ?? `Site · ${humanizeAction(action)}`;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function buildDescription(payload: AuditLogInput): string {
  const m = payload.metadata ?? {};
  const lines: string[] = [];
  lines.push(`**Record** \`${payload.entityId ?? "—"}\``);

  const ig = str(m.inGameName);
  if (ig) lines.push(`**Character** ${truncate(ig, 120)}`);

  const sub = str(m.submittedBy);
  if (sub) lines.push(`**Submitted as** ${truncate(sub, 80)}`);

  const applicant = str(m.applicantUsername);
  if (applicant && applicant !== sub) lines.push(`**Applicant** ${truncate(applicant, 80)}`);

  const jobTitle = str(m.jobTitle);
  if (jobTitle) lines.push(`**Position** ${truncate(jobTitle, 120)}`);

  const ruleTitle = str(m.title);
  if (ruleTitle && (payload.entityType === "rule_category" || payload.entityType === "rule_section")) {
    lines.push(`**Title** ${truncate(ruleTitle, 300)}`);
  }

  const catId = str(m.categoryId);
  if (catId && payload.entityType === "rule_section") {
    lines.push(`**Category ID** \`${catId}\``);
  }

  const st = str(m.status);
  if (st) lines.push(`**Status** \`${st}\``);

  const notes = str(m.adminNotes);
  if (notes && notes.toLowerCase() !== "null") {
    lines.push(`**Staff note** ${truncate(notes, 400)}`);
  }

  if (payload.action === "site_settings_updated") {
    const sn = str(m.serverName);
    const site = str(m.siteName);
    const col = str(m.primaryColor);
    const nav = str(m.whitelistNavLabel);
    if (sn) lines.push(`**Server name** ${truncate(sn, 100)}`);
    if (site) lines.push(`**Site name** ${truncate(site, 100)}`);
    if (col) lines.push(`**Primary color** \`${col}\``);
    if (nav) lines.push(`**Whitelist nav** ${truncate(nav, 80)}`);
  }

  if (payload.action === "admin_member_broadcast") {
    const bt = str(m.title);
    if (bt) lines.push(`**Message title** ${truncate(bt, 200)}`);
    if (typeof m.attempted === "number") {
      const sent = typeof m.sent === "number" ? m.sent : 0;
      const failed = typeof m.failed === "number" ? m.failed : 0;
      lines.push(`**Delivery** ${sent}/${m.attempted} sent · ${failed} failed`);
    }
  }

  return truncate(lines.join("\n"), DESC_MAX);
}

function buildDetailsField(payload: AuditLogInput): string | null {
  const m = payload.metadata;
  if (!m || Object.keys(m).length === 0) return null;

  const skip = new Set([
    "inGameName",
    "submittedBy",
    "applicantUsername",
    "jobTitle",
    "title",
    "categoryId",
    "status",
    "adminNotes",
    "serverName",
    "siteName",
    "primaryColor",
    "whitelistNavLabel",
    "attempted",
    "sent",
    "failed",
  ]);

  const label: Record<string, string> = {
    jobId: "Job ID",
    formId: "Form ID",
    questionId: "Question ID",
    headerIcon: "Header icon",
  };

  const rows: string[] = [];
  for (const [k, v] of Object.entries(m)) {
    if (skip.has(k)) continue;
    if (v === null || v === undefined) continue;
    const vs = String(v).trim();
    if (!vs || vs.toLowerCase() === "null") continue;
    const lab = label[k] ?? k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
    rows.push(`**${lab}** ${truncate(vs, 180)}`);
  }

  if (rows.length === 0) return null;
  return truncate(rows.join("\n"), FIELD_MAX);
}

export async function createAuditLog(payload: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId ?? null,
        actorUserId: payload.actorUserId,
        actorDiscordId: payload.actorDiscordId,
        targetDiscordId: payload.targetDiscordId ?? null,
        ipAddress: payload.ipAddress ?? null,
        metadata:
          payload.metadata != null && Object.keys(payload.metadata).length > 0
            ? JSON.stringify(payload.metadata)
            : null,
      },
    });
  } catch (e) {
    console.error("[audit] failed to persist audit log", e);
  }

  await sendAuditWebhook(payload);
}

async function sendAuditWebhook(payload: AuditLogInput) {
  const url = await getAuditWebhookUrl();
  if (!url) {
    return;
  }

  const actorM = mention(payload.actorDiscordId);
  const targetId = payload.targetDiscordId ?? null;
  const targetM =
    targetId && targetId === payload.actorDiscordId?.trim()
      ? "_Same as actor_"
      : mention(targetId);

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "Actor", value: actorM, inline: true },
    { name: "Target", value: targetM, inline: true },
  ];

  if (payload.ipAddress) {
    fields.push({
      name: "IP",
      value: `\`${payload.ipAddress}\``,
      inline: true,
    });
  }

  const details = buildDetailsField(payload);
  if (details) {
    fields.push({ name: "Extra", value: details, inline: false });
  }

  const body = {
    embeds: [
      {
        title: embedTitle(payload.action),
        description: buildDescription(payload),
        color: embedColor(payload.action),
        fields,
        footer: { text: `${payload.entityType} · ${payload.action}` },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[audit] webhook failed", res.status, t);
    }
  } catch (e) {
    console.error("[audit] webhook error", e);
  }
}
