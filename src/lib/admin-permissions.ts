/** Site / Discord-backed admin roles (User.adminType, SiteMember.adminType, .env lists). */
export type SiteAdminType = "full" | "team" | "jobs" | "rules";

export function canManageRules(adminType: string | null | undefined): boolean {
  return adminType === "full" || adminType === "rules";
}

/** Rules-only editors cannot view global audit logs. */
export function canViewAuditLogs(adminType: string | null | undefined): boolean {
  return adminType === "team" || adminType === "jobs" || adminType === "full";
}
