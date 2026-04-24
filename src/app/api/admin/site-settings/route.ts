import { NextResponse } from "next/server";
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth";
import { createAuditLog } from "@/lib/audit";
import type { BrandingSettingsInput } from "@/lib/branding";
import { getClientIp } from "@/lib/request";
import { getFreshBrandingSettings, saveBrandingSettings } from "@/lib/site-settings";

function isAdmin(adminType: string | null | undefined): boolean {
  return adminType === "team" || adminType === "jobs" || adminType === "full";
}

function canEditSiteSettings(adminType: string | null | undefined): boolean {
  return adminType === "full";
}

export async function GET() {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!isAdmin(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getFreshBrandingSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const session = await auth();
  const result = await resolveSessionUserId(session);
  if (!result.ok) return unauthorizedOrDatabaseError(result);

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType;
  if (!canEditSiteSettings(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as BrandingSettingsInput | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.logoDataUrl && body.logoDataUrl.length > 250_000) {
    return NextResponse.json(
      { error: "Logo is too large. Use a smaller image." },
      { status: 400 }
    );
  }

  try {
    const settings = await saveBrandingSettings(body);
    await createAuditLog({
      action: "site_settings_updated",
      entityType: "site_settings",
      entityId: "default",
      actorUserId: result.userId,
      actorDiscordId: (session?.user as { discordId?: string } | undefined)?.discordId ?? null,
      ipAddress: getClientIp(request),
      metadata: {
        serverName: settings.serverName,
        siteName: settings.siteName,
        primaryColor: settings.primaryColor,
        headerIcon: settings.headerIcon,
        whitelistNavLabel: settings.whitelistNavLabel,
        storeNavLabel: settings.storeNavLabel,
        hasLogo: Boolean(settings.logoDataUrl),
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("[site-settings] Failed to save settings:", error);
    const message = error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
