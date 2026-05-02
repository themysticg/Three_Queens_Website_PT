import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  defaultBrandingSettings,
  mergeBrandingSettings,
  type BrandingSettings,
  type BrandingSettingsInput,
  type DmTemplateMap,
} from "@/lib/branding";
import type { HomepageContent } from "@/lib/homepage-content";

const SITE_SETTINGS_ID = "default";
const MISSING_HOMEPAGE_COLUMN = "homepageContentJson";
const MISSING_FIVEM_SERVER_ID_COLUMN = "fivemServerDetailId";

function parseMessages(value: string | null): string[] | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : undefined;
  } catch {
    return undefined;
  }
}

function parseDmTemplates(value: string | null): Partial<DmTemplateMap> | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as Partial<DmTemplateMap>;
  } catch {
    return undefined;
  }
}

function parseHomepageContent(value: string | null): Partial<HomepageContent> | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as Partial<HomepageContent>;
  } catch {
    return undefined;
  }
}

function isMissingSchemaColumnError(error: unknown, columnName: string): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
    const column = String(error.meta?.column ?? "");
    return column.includes(columnName);
  }

  if (error instanceof Error) {
    return error.message.includes(columnName);
  }

  return false;
}

function isMissingHomepageContentColumnError(error: unknown): boolean {
  return isMissingSchemaColumnError(error, MISSING_HOMEPAGE_COLUMN);
}

function isMissingFiveMServerIdColumnError(error: unknown): boolean {
  return isMissingSchemaColumnError(error, MISSING_FIVEM_SERVER_ID_COLUMN);
}

async function ensureHomepageContentColumn(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "homepageContentJson" TEXT'
    );
  } catch {
    // Ignore auto-repair failures and let the original request error surface.
  }
}

async function ensureFiveMServerIdColumn(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "fivemServerDetailId" TEXT'
    );
  } catch {
    // Ignore auto-repair failures and let the original request error surface.
  }
}

function mapSiteSettingsRecord(
  record:
    | {
        serverName: string | null;
        siteName: string | null;
        logoDataUrl: string | null;
        primaryColor: string | null;
        headerIcon: string | null;
        whitelistNavLabel: string | null;
        storeNavLabel: string | null;
        footerText: string | null;
        discordLink: string | null;
        discordWidgetServerId: string | null;
        fivemServerDetailId: string | null;
        homepageSubtitle: string | null;
        storePageTitle: string | null;
        storePageDescription: string | null;
        topBannerEnabled: boolean | null;
        topBannerCtaLabel: string | null;
        topBannerCtaUrl: string | null;
        topBannerMessages: string | null;
        footerBadgeLabel: string | null;
        footerTagline: string | null;
        footerConnectButtonText: string | null;
        footerConnectBlurb: string | null;
        footerCopyrightNote: string | null;
        footerBottomTaglineLeft: string | null;
        footerBottomTaglineRight: string | null;
        footerNavHeading: string | null;
        footerConnectHeading: string | null;
        footerDiscordCardTitle: string | null;
        discordDmAuthorName: string | null;
        dmTemplatesJson: string | null;
        homepageContentJson: string | null;
        logsWebhookUrl: string | null;
      }
    | null
): BrandingSettings {
  if (!record) return defaultBrandingSettings;
  const input: BrandingSettingsInput = {
    ...record,
    topBannerMessages: parseMessages(record.topBannerMessages),
    dmTemplates: parseDmTemplates(record.dmTemplatesJson),
    homepage: parseHomepageContent(record.homepageContentJson),
    fivemServerDetailId: record.fivemServerDetailId,
  };
  return mergeBrandingSettings(input);
}

async function loadSiteSettingsRecord() {
  try {
    return await prisma.siteSettings.findUnique({
      where: { id: SITE_SETTINGS_ID },
    });
  } catch (error) {
    if (!isMissingHomepageContentColumnError(error) && !isMissingFiveMServerIdColumnError(error)) {
      throw error;
    }

    if (isMissingHomepageContentColumnError(error)) {
      await ensureHomepageContentColumn();
    }
    if (isMissingFiveMServerIdColumnError(error)) {
      await ensureFiveMServerIdColumn();
    }
    return prisma.siteSettings.findUnique({
      where: { id: SITE_SETTINGS_ID },
    });
  }
}

export const getBrandingSettings = cache(async (): Promise<BrandingSettings> => {
  try {
    const record = await loadSiteSettingsRecord();
    return mapSiteSettingsRecord(record);
  } catch {
    return defaultBrandingSettings;
  }
});

export async function getFreshBrandingSettings(): Promise<BrandingSettings> {
  try {
    const record = await loadSiteSettingsRecord();
    return mapSiteSettingsRecord(record);
  } catch {
    return defaultBrandingSettings;
  }
}

export async function saveBrandingSettings(
  input: BrandingSettingsInput
): Promise<BrandingSettings> {
  const merged = mergeBrandingSettings(input);

  const payload = {
    serverName: merged.serverName,
    siteName: merged.siteName,
    logoDataUrl: merged.logoDataUrl,
    primaryColor: merged.primaryColor,
    headerIcon: merged.headerIcon,
    whitelistNavLabel: merged.whitelistNavLabel,
    storeNavLabel: merged.storeNavLabel,
    footerText: merged.footerText,
    discordLink: merged.discordLink,
    discordWidgetServerId: merged.discordWidgetServerId,
    fivemServerDetailId: merged.fivemServerDetailId,
    homepageSubtitle: merged.homepageSubtitle,
    storePageTitle: merged.storePageTitle,
    storePageDescription: merged.storePageDescription,
    topBannerEnabled: merged.topBannerEnabled,
    topBannerCtaLabel: merged.topBannerCtaLabel,
    topBannerCtaUrl: merged.topBannerCtaUrl,
    topBannerMessages: JSON.stringify(merged.topBannerMessages),
    footerBadgeLabel: merged.footerBadgeLabel,
    footerTagline: merged.footerTagline,
    footerConnectButtonText: merged.footerConnectButtonText,
    footerConnectBlurb: merged.footerConnectBlurb,
    footerCopyrightNote: merged.footerCopyrightNote,
    footerBottomTaglineLeft: merged.footerBottomTaglineLeft,
    footerBottomTaglineRight: merged.footerBottomTaglineRight,
    footerNavHeading: merged.footerNavHeading,
    footerConnectHeading: merged.footerConnectHeading,
    footerDiscordCardTitle: merged.footerDiscordCardTitle,
    discordDmAuthorName: merged.discordDmAuthorName,
    dmTemplatesJson: JSON.stringify(merged.dmTemplates),
    homepageContentJson: JSON.stringify(merged.homepage),
    logsWebhookUrl: merged.logsWebhookUrl,
  };

  let record;
  try {
    record = await prisma.siteSettings.upsert({
      where: { id: SITE_SETTINGS_ID },
      create: {
        id: SITE_SETTINGS_ID,
        ...payload,
      },
      update: payload,
    });
  } catch (error) {
    if (!isMissingHomepageContentColumnError(error) && !isMissingFiveMServerIdColumnError(error)) {
      throw error;
    }

    if (isMissingHomepageContentColumnError(error)) {
      await ensureHomepageContentColumn();
    }
    if (isMissingFiveMServerIdColumnError(error)) {
      await ensureFiveMServerIdColumn();
    }
    record = await prisma.siteSettings.upsert({
      where: { id: SITE_SETTINGS_ID },
      create: {
        id: SITE_SETTINGS_ID,
        ...payload,
      },
      update: payload,
    });
  }

  return mapSiteSettingsRecord(record);
}

export async function getAuditWebhookUrl(): Promise<string | null> {
  const settings = await getFreshBrandingSettings();
  const fromDb = settings.logsWebhookUrl?.trim();
  if (fromDb) return fromDb;
  return (
    process.env.DISCORD_WEBHOOK_URL?.trim() ||
    process.env.DISCORD_AUDIT_WEBHOOK_URL?.trim() ||
    null
  );
}
