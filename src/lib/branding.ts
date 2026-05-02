import { appConfig, type DmApplicationTemplate, type DmStatusTemplate } from "@/config/app.config";
import {
  defaultHomepageContent,
  normalizeHomepageContent,
  type HomepageContent,
} from "@/lib/homepage-content";

export type DmTemplateMap = Record<"whitelist" | "job" | "staff", DmApplicationTemplate>;

export type BrandingSettings = {
  serverName: string;
  siteName: string;
  logoDataUrl: string | null;
  primaryColor: string;
  headerIcon: string;
  whitelistNavLabel: string;
  storeNavLabel: string;
  discordLink: string;
  discordWidgetServerId: string;
  fivemServerDetailId: string;
  homepageSubtitle: string;
  storePageTitle: string;
  storePageDescription: string;
  topBannerEnabled: boolean;
  topBannerCtaLabel: string;
  topBannerCtaUrl: string;
  topBannerMessages: string[];
  footerBadgeLabel: string;
  footerTagline: string;
  footerText: string;
  footerConnectButtonText: string;
  footerConnectBlurb: string;
  footerCopyrightNote: string;
  footerBottomTaglineLeft: string;
  footerBottomTaglineRight: string;
  footerNavHeading: string;
  footerConnectHeading: string;
  footerDiscordCardTitle: string;
  discordDmAuthorName: string;
  dmTemplates: DmTemplateMap;
  homepage: HomepageContent;
  logsWebhookUrl: string | null;
};

export type BrandingSettingsInput = {
  serverName?: string | null;
  siteName?: string | null;
  logoDataUrl?: string | null;
  primaryColor?: string | null;
  headerIcon?: string | null;
  whitelistNavLabel?: string | null;
  storeNavLabel?: string | null;
  discordLink?: string | null;
  discordWidgetServerId?: string | null;
  fivemServerDetailId?: string | null;
  homepageSubtitle?: string | null;
  storePageTitle?: string | null;
  storePageDescription?: string | null;
  topBannerEnabled?: boolean | null;
  topBannerCtaLabel?: string | null;
  topBannerCtaUrl?: string | null;
  topBannerMessages?: string[] | null;
  footerBadgeLabel?: string | null;
  footerTagline?: string | null;
  footerText?: string | null;
  footerConnectButtonText?: string | null;
  footerConnectBlurb?: string | null;
  footerCopyrightNote?: string | null;
  footerBottomTaglineLeft?: string | null;
  footerBottomTaglineRight?: string | null;
  footerNavHeading?: string | null;
  footerConnectHeading?: string | null;
  footerDiscordCardTitle?: string | null;
  discordDmAuthorName?: string | null;
  dmTemplates?: Partial<DmTemplateMap> | null;
  homepage?: Partial<HomepageContent> | null;
  logsWebhookUrl?: string | null;
};

export const defaultBrandingSettings: BrandingSettings = {
  serverName: appConfig.serverName,
  siteName: appConfig.siteName,
  logoDataUrl: null,
  primaryColor: "#f59e0b",
  headerIcon: appConfig.headerIcon,
  whitelistNavLabel: appConfig.whitelistNavLabel,
  storeNavLabel: appConfig.storeNavLabel,
  discordLink: appConfig.discordInviteUrl,
  discordWidgetServerId: appConfig.discordWidgetServerId,
  fivemServerDetailId: "krkxj7",
  homepageSubtitle: appConfig.homepageSubtitle,
  storePageTitle: appConfig.storePageTitle,
  storePageDescription: appConfig.storePageDescription,
  topBannerEnabled: appConfig.topBannerEnabled,
  topBannerCtaLabel: appConfig.topBannerCtaLabel,
  topBannerCtaUrl: appConfig.topBannerCtaUrl,
  topBannerMessages: [...appConfig.topBannerMessages],
  footerBadgeLabel: appConfig.footerBadgeLabel,
  footerTagline: appConfig.footerTagline,
  footerText: appConfig.footerDescription,
  footerConnectButtonText: appConfig.footerConnectButtonText,
  footerConnectBlurb: appConfig.footerConnectBlurb,
  footerCopyrightNote: appConfig.footerCopyrightNote,
  footerBottomTaglineLeft: appConfig.footerBottomTaglineLeft,
  footerBottomTaglineRight: appConfig.footerBottomTaglineRight,
  footerNavHeading: appConfig.footerNavHeading,
  footerConnectHeading: appConfig.footerConnectHeading,
  footerDiscordCardTitle: appConfig.footerDiscordCardTitle,
  discordDmAuthorName: appConfig.discordDmAuthorName,
  dmTemplates: appConfig.dmTemplates as DmTemplateMap,
  homepage: defaultHomepageContent,
  logsWebhookUrl: null,
};

function normalizeText(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function normalizeTextAllowEmpty(
  value: string | null | undefined,
  fallback: string
): string {
  if (value === undefined || value === null) return fallback;
  return value.trim();
}

function normalizeStringArray(value: string[] | null | undefined, fallback: readonly string[]): string[] {
  const normalized = Array.isArray(value)
    ? value.map((entry) => entry.trim()).filter(Boolean)
    : [];

  return normalized.length > 0 ? normalized : [...fallback];
}

function normalizeDmStatusTemplate(
  value: Partial<DmStatusTemplate> | null | undefined,
  fallback: DmStatusTemplate
): DmStatusTemplate {
  return {
    reasonDefault: normalizeText(value?.reasonDefault, fallback.reasonDefault),
    nextSteps: normalizeStringArray(value?.nextSteps as string[] | undefined, fallback.nextSteps),
    footerNote: normalizeTextAllowEmpty(value?.footerNote, fallback.footerNote),
  };
}

function normalizeDmApplicationTemplate(
  value: Partial<DmApplicationTemplate> | null | undefined,
  fallback: DmApplicationTemplate
): DmApplicationTemplate {
  return {
    accepted: normalizeDmStatusTemplate(value?.accepted, fallback.accepted),
    rejected: normalizeDmStatusTemplate(value?.rejected, fallback.rejected),
    ...(fallback.deviceCheck
      ? {
          deviceCheck: normalizeDmStatusTemplate(
            value?.deviceCheck,
            fallback.deviceCheck
          ),
        }
      : {}),
  };
}

function normalizeDmTemplates(
  value: Partial<DmTemplateMap> | null | undefined,
  fallback: DmTemplateMap
): DmTemplateMap {
  return {
    whitelist: normalizeDmApplicationTemplate(value?.whitelist, fallback.whitelist),
    job: normalizeDmApplicationTemplate(value?.job, fallback.job),
    staff: normalizeDmApplicationTemplate(value?.staff, fallback.staff),
  };
}

export function normalizeHexColor(value: string | null | undefined): string {
  const input = (value ?? "").trim();
  const hex = input.startsWith("#") ? input.slice(1) : input;

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toLowerCase()}`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `#${hex.toLowerCase()}`;
  }

  return defaultBrandingSettings.primaryColor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function adjustHexColor(hex: string, amount: number): string {
  const normalized = normalizeHexColor(hex).slice(1);
  const channels = [0, 2, 4].map((offset) =>
    clamp(Number.parseInt(normalized.slice(offset, offset + 2), 16) + amount, 0, 255)
  );

  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgbString(hex: string): string {
  const normalized = normalizeHexColor(hex).slice(1);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  return channels.join(" ");
}

function getContrastTextColor(hex: string): string {
  const normalized = normalizeHexColor(hex).slice(1);
  const [r, g, b] = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#ffffff";
}

export function getBrandingCssVariables(settings: BrandingSettings): Record<string, string> {
  const primaryColor = normalizeHexColor(settings.primaryColor);

  return {
    "--accent": primaryColor,
    "--accent-hover": adjustHexColor(primaryColor, -18),
    "--accent-foreground": getContrastTextColor(primaryColor),
    "--accent-rgb": hexToRgbString(primaryColor),
  };
}

export function mergeBrandingSettings(
  overrides: BrandingSettingsInput | null | undefined
): BrandingSettings {
  return {
    serverName: normalizeText(overrides?.serverName, defaultBrandingSettings.serverName),
    siteName: normalizeText(overrides?.siteName, defaultBrandingSettings.siteName),
    logoDataUrl: overrides?.logoDataUrl?.trim() || null,
    primaryColor: normalizeHexColor(overrides?.primaryColor),
    headerIcon: normalizeTextAllowEmpty(overrides?.headerIcon, defaultBrandingSettings.headerIcon),
    whitelistNavLabel: normalizeText(
      overrides?.whitelistNavLabel,
      defaultBrandingSettings.whitelistNavLabel
    ),
    storeNavLabel: normalizeText(overrides?.storeNavLabel, defaultBrandingSettings.storeNavLabel),
    discordLink: normalizeText(overrides?.discordLink, defaultBrandingSettings.discordLink),
    discordWidgetServerId: normalizeTextAllowEmpty(
      overrides?.discordWidgetServerId,
      defaultBrandingSettings.discordWidgetServerId
    ),
    fivemServerDetailId: normalizeTextAllowEmpty(
      overrides?.fivemServerDetailId,
      defaultBrandingSettings.fivemServerDetailId
    ),
    homepageSubtitle: normalizeText(
      overrides?.homepageSubtitle,
      defaultBrandingSettings.homepageSubtitle
    ),
    storePageTitle: normalizeText(overrides?.storePageTitle, defaultBrandingSettings.storePageTitle),
    storePageDescription: normalizeText(
      overrides?.storePageDescription,
      defaultBrandingSettings.storePageDescription
    ),
    topBannerEnabled: overrides?.topBannerEnabled ?? defaultBrandingSettings.topBannerEnabled,
    topBannerCtaLabel: normalizeTextAllowEmpty(
      overrides?.topBannerCtaLabel,
      defaultBrandingSettings.topBannerCtaLabel
    ),
    topBannerCtaUrl: normalizeTextAllowEmpty(
      overrides?.topBannerCtaUrl,
      defaultBrandingSettings.topBannerCtaUrl
    ),
    topBannerMessages: normalizeStringArray(
      overrides?.topBannerMessages,
      defaultBrandingSettings.topBannerMessages
    ),
    footerBadgeLabel: normalizeText(
      overrides?.footerBadgeLabel,
      defaultBrandingSettings.footerBadgeLabel
    ),
    footerTagline: normalizeText(overrides?.footerTagline, defaultBrandingSettings.footerTagline),
    footerText: normalizeText(overrides?.footerText, defaultBrandingSettings.footerText),
    footerConnectButtonText: normalizeText(
      overrides?.footerConnectButtonText,
      defaultBrandingSettings.footerConnectButtonText
    ),
    footerConnectBlurb: normalizeText(
      overrides?.footerConnectBlurb,
      defaultBrandingSettings.footerConnectBlurb
    ),
    footerCopyrightNote: normalizeText(
      overrides?.footerCopyrightNote,
      defaultBrandingSettings.footerCopyrightNote
    ),
    footerBottomTaglineLeft: normalizeText(
      overrides?.footerBottomTaglineLeft,
      defaultBrandingSettings.footerBottomTaglineLeft
    ),
    footerBottomTaglineRight: normalizeText(
      overrides?.footerBottomTaglineRight,
      defaultBrandingSettings.footerBottomTaglineRight
    ),
    footerNavHeading: normalizeText(
      overrides?.footerNavHeading,
      defaultBrandingSettings.footerNavHeading
    ),
    footerConnectHeading: normalizeText(
      overrides?.footerConnectHeading,
      defaultBrandingSettings.footerConnectHeading
    ),
    footerDiscordCardTitle: normalizeText(
      overrides?.footerDiscordCardTitle,
      defaultBrandingSettings.footerDiscordCardTitle
    ),
    discordDmAuthorName: normalizeText(
      overrides?.discordDmAuthorName,
      defaultBrandingSettings.discordDmAuthorName
    ),
    dmTemplates: normalizeDmTemplates(
      overrides?.dmTemplates,
      defaultBrandingSettings.dmTemplates
    ),
    homepage: normalizeHomepageContent(overrides?.homepage),
    logsWebhookUrl: overrides?.logsWebhookUrl?.trim() || null,
  };
}
