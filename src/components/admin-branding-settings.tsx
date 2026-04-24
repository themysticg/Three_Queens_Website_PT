"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useToast } from "@/components/toast";
import type { BrandingSettings } from "@/lib/branding";
import {
  defaultHomepageContent,
  normalizeHomepageContent,
  type HomepageAnnouncementItem,
  type HomepageButton,
  type HomepageDepartmentItem,
  type HomepageFaqItem,
  type HomepageFeatureItem,
  type HomepageGalleryItem,
  type HomepageSectionIntro,
  type HomepageStatItem,
  type HomepageStepItem,
} from "@/lib/homepage-content";

function stepsToText(value: readonly string[]): string {
  return value.join("\n");
}

function textToSteps(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const EMPTY_SETTINGS: BrandingSettings = {
  serverName: "",
  siteName: "",
  logoDataUrl: null,
  primaryColor: "#f59e0b",
  headerIcon: "",
  whitelistNavLabel: "",
  storeNavLabel: "",
  discordLink: "",
  discordWidgetServerId: "",
  fivemServerDetailId: "",
  fivemServerConnectLabel: "",
  homepageSubtitle: "",
  storePageTitle: "",
  storePageDescription: "",
  topBannerEnabled: true,
  topBannerCtaLabel: "",
  topBannerCtaUrl: "",
  topBannerMessages: [],
  footerBadgeLabel: "",
  footerTagline: "",
  footerText: "",
  footerConnectButtonText: "",
  footerConnectBlurb: "",
  footerCopyrightNote: "",
  footerBottomTaglineLeft: "",
  footerBottomTaglineRight: "",
  footerNavHeading: "",
  footerConnectHeading: "",
  footerDiscordCardTitle: "",
  discordDmAuthorName: "",
  dmTemplates: {
    whitelist: {
      accepted: { reasonDefault: "", nextSteps: [], footerNote: "" },
      rejected: { reasonDefault: "", nextSteps: [], footerNote: "" },
      deviceCheck: { reasonDefault: "", nextSteps: [], footerNote: "" },
    },
    job: {
      accepted: { reasonDefault: "", nextSteps: [], footerNote: "" },
      rejected: { reasonDefault: "", nextSteps: [], footerNote: "" },
    },
    staff: {
      accepted: { reasonDefault: "", nextSteps: [], footerNote: "" },
      rejected: { reasonDefault: "", nextSteps: [], footerNote: "" },
    },
  },
  homepage: normalizeHomepageContent(defaultHomepageContent),
  logsWebhookUrl: null,
};

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:border-[var(--accent)] focus:outline-none";
const actionButtonClass =
  "rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
        {description ? <p className="text-sm text-zinc-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ItemShell({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-zinc-200">{title}</h4>
        {onRemove ? (
          <button type="button" onClick={onRemove} className={actionButtonClass}>
            Remove
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function SectionIntroFields({
  intro,
  onChange,
}: {
  intro: HomepageSectionIntro;
  onChange: (field: keyof HomepageSectionIntro, value: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
        Eyebrow
        <input
          type="text"
          value={intro.eyebrow}
          onChange={(event) => onChange("eyebrow", event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
        Title
        <input
          type="text"
          value={intro.title}
          onChange={(event) => onChange("title", event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-3">
        Description
        <textarea
          rows={3}
          value={intro.description}
          onChange={(event) => onChange("description", event.target.value)}
          className={inputClass}
        />
      </label>
    </div>
  );
}

export function AdminBrandingSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState<BrandingSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      })
      .then((data) => setSettings(data))
      .catch(() => toast.addToast("Failed to load branding settings", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.addToast("Please upload an image file.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setSettings((current) => ({ ...current, logoDataUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.addToast(data.error || "Failed to save settings", "error");
        return;
      }

      setSettings(data);
      toast.addToast("Settings saved. Refresh public pages to see changes.", "success");
    } catch {
      toast.addToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  function updateHero(field: keyof BrandingSettings["homepage"]["hero"], value: string | string[]) {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        hero: {
          ...current.homepage.hero,
          [field]: value,
        },
      },
    }));
  }

  function updateHeroButton(
    key: "primaryButton" | "secondaryButton",
    field: keyof HomepageButton,
    value: string | boolean
  ) {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        hero: {
          ...current.homepage.hero,
          [key]: {
            ...current.homepage.hero[key],
            [field]: value,
          },
        },
      },
    }));
  }

  function updateSectionIntro<
    T extends "features" | "gallery" | "join" | "departments" | "announcements" | "faq",
  >(section: T, field: keyof HomepageSectionIntro, value: string) {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        [section]: {
          ...current.homepage[section],
          [field]: value,
        },
      },
    }));
  }

  function updateStats(items: HomepageStatItem[]) {
    setSettings((current) => ({
      ...current,
      homepage: { ...current.homepage, stats: items },
    }));
  }

  function updateFeatureItems(items: HomepageFeatureItem[]) {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        features: { ...current.homepage.features, items },
      },
    }));
  }

  function updateGalleryItems(items: HomepageGalleryItem[]) {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        gallery: { ...current.homepage.gallery, items },
      },
    }));
  }

  function updateJoinItems(items: HomepageStepItem[]) {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        join: { ...current.homepage.join, items },
      },
    }));
  }

  function updateDepartmentItems(items: HomepageDepartmentItem[]) {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        departments: { ...current.homepage.departments, items },
      },
    }));
  }

  function updateAnnouncementItems(items: HomepageAnnouncementItem[]) {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        announcements: { ...current.homepage.announcements, items },
      },
    }));
  }

  function updateFaqItems(items: HomepageFaqItem[]) {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        faq: { ...current.homepage.faq, items },
      },
    }));
  }

  if (loading) {
    return <p className="text-zinc-500">Loading branding settings...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section title="Core branding">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Server name
            <input
              type="text"
              value={settings.serverName}
              onChange={(event) =>
                setSettings((current) => ({ ...current, serverName: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Site name
            <input
              type="text"
              value={settings.siteName}
              onChange={(event) =>
                setSettings((current) => ({ ...current, siteName: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Header icon
            <input
              type="text"
              value={settings.headerIcon}
              onChange={(event) =>
                setSettings((current) => ({ ...current, headerIcon: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Discord link
            <input
              type="url"
              value={settings.discordLink}
              onChange={(event) =>
                setSettings((current) => ({ ...current, discordLink: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Whitelist nav label
            <input
              type="text"
              value={settings.whitelistNavLabel}
              onChange={(event) =>
                setSettings((current) => ({ ...current, whitelistNavLabel: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Store nav label
            <input
              type="text"
              value={settings.storeNavLabel}
              onChange={(event) =>
                setSettings((current) => ({ ...current, storeNavLabel: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Discord widget server ID
            <input
              type="text"
              value={settings.discordWidgetServerId}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  discordWidgetServerId: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            FiveM server detail ID
            <input
              type="text"
              value={settings.fivemServerDetailId}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  fivemServerDetailId: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="krkxj7"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Server connect label (optional)
            <input
              type="text"
              value={settings.fivemServerConnectLabel}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  fivemServerConnectLabel: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="play.yourdomain.com:30120"
            />
            <span className="text-xs font-normal text-zinc-500">
              Shown for {"{serverConnect}"} on the homepage. Use your DNS host:port if FiveM returns a raw IP.
            </span>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            DM author name
            <input
              type="text"
              value={settings.discordDmAuthorName}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  discordDmAuthorName: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Primary color
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, primaryColor: event.target.value }))
                }
                className="h-12 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-2 sm:w-20"
              />
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, primaryColor: event.target.value }))
                }
                className={inputClass}
              />
            </div>
          </label>
        </div>
      </Section>

      <Section
        title="Homepage hero"
        description="Keep the top of the homepage short and clean. Use tokens like {serverName}, {discordLink}, and {applyUrl}."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Hero badge
            <input
              type="text"
              value={settings.homepage.hero.badge}
              onChange={(event) => updateHero("badge", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Background image URL
            <input
              type="text"
              value={settings.homepage.hero.backgroundImageUrl}
              onChange={(event) => updateHero("backgroundImageUrl", event.target.value)}
              className={inputClass}
              placeholder="https://..."
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Hero headline
            <input
              type="text"
              value={settings.homepage.hero.title}
              onChange={(event) => updateHero("title", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Hero subheadline
            <textarea
              rows={3}
              value={settings.homepage.hero.subtitle}
              onChange={(event) => updateHero("subtitle", event.target.value)}
              className={inputClass}
            />
          </label>
          {(["primaryButton", "secondaryButton"] as const).map((buttonKey) => (
            <div key={buttonKey} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <h4 className="text-sm font-semibold capitalize text-zinc-200">
                {buttonKey === "primaryButton" ? "Primary button" : "Secondary button"}
              </h4>
              <div className="grid gap-4">
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Label
                  <input
                    type="text"
                    value={settings.homepage.hero[buttonKey].label}
                    onChange={(event) =>
                      updateHeroButton(buttonKey, "label", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  URL
                  <input
                    type="text"
                    value={settings.homepage.hero[buttonKey].href}
                    onChange={(event) =>
                      updateHeroButton(buttonKey, "href", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Tone
                  <select
                    value={settings.homepage.hero[buttonKey].tone}
                    onChange={(event) =>
                      updateHeroButton(
                        buttonKey,
                        "tone",
                        event.target.value as HomepageButton["tone"]
                      )
                    }
                    className={inputClass}
                  >
                    <option value="discord">Discord</option>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm font-medium text-zinc-300">
                  <input
                    type="checkbox"
                    checked={settings.homepage.hero[buttonKey].openInNewTab}
                    onChange={(event) =>
                      updateHeroButton(buttonKey, "openInNewTab", event.target.checked)
                    }
                  />
                  Open in new tab
                </label>
              </div>
            </div>
          ))}
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Snapshot eyebrow
            <input
              type="text"
              value={settings.homepage.hero.snapshotEyebrow}
              onChange={(event) => updateHero("snapshotEyebrow", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Snapshot title
            <input
              type="text"
              value={settings.homepage.hero.snapshotTitle}
              onChange={(event) => updateHero("snapshotTitle", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Snapshot description
            <textarea
              rows={3}
              value={settings.homepage.hero.snapshotDescription}
              onChange={(event) => updateHero("snapshotDescription", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Snapshot tags
            <textarea
              rows={4}
              value={stepsToText(settings.homepage.hero.snapshotTags)}
              onChange={(event) => updateHero("snapshotTags", textToSteps(event.target.value))}
              className={inputClass}
              placeholder="One tag per line"
            />
          </label>
        </div>
      </Section>

      <Section
        title="Homepage stats"
        description="Values can use tokens like {playersOnline}, {maxPlayers}, {serverConnect}, {members}, {staffCount}, {jobsCount}, {pendingApps}, and {serverStatus}."
      >
        <div className="space-y-4">
          {settings.homepage.stats.map((stat, index) => (
            <ItemShell
              key={`${stat.label}-${index}`}
              title={`Stat ${index + 1}`}
              onRemove={() => updateStats(settings.homepage.stats.filter((_, itemIndex) => itemIndex !== index))}
            >
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Label
                  <input
                    type="text"
                    value={stat.label}
                    onChange={(event) =>
                      updateStats(
                        settings.homepage.stats.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, label: event.target.value } : item
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Value
                  <input
                    type="text"
                    value={stat.value}
                    onChange={(event) =>
                      updateStats(
                        settings.homepage.stats.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Tone
                  <select
                    value={stat.tone}
                    onChange={(event) =>
                      updateStats(
                        settings.homepage.stats.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                tone: event.target.value as HomepageStatItem["tone"],
                              }
                            : item
                        )
                      )
                    }
                    className={inputClass}
                  >
                    <option value="default">Default</option>
                    <option value="success">Success</option>
                  </select>
                </label>
              </div>
            </ItemShell>
          ))}
          <button
            type="button"
            onClick={() =>
              updateStats([
                ...settings.homepage.stats,
                { label: "New stat", value: "Value", tone: "default" },
              ])
            }
            className={actionButtonClass}
          >
            Add stat
          </button>
        </div>
      </Section>

      <Section
        title="Homepage features"
        description="This should stay compact. Four to six cards is usually enough."
      >
        <div className="space-y-4">
          <SectionIntroFields
            intro={settings.homepage.features}
            onChange={(field, value) => updateSectionIntro("features", field, value)}
          />
          {settings.homepage.features.items.map((item, index) => (
            <ItemShell
              key={`${item.title}-${index}`}
              title={`Feature ${index + 1}`}
              onRemove={() =>
                updateFeatureItems(
                  settings.homepage.features.items.filter((_, itemIndex) => itemIndex !== index)
                )
              }
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Title
                  <input
                    type="text"
                    value={item.title}
                    onChange={(event) =>
                      updateFeatureItems(
                        settings.homepage.features.items.map((feature, itemIndex) =>
                          itemIndex === index
                            ? { ...feature, title: event.target.value }
                            : feature
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Description
                  <textarea
                    rows={3}
                    value={item.description}
                    onChange={(event) =>
                      updateFeatureItems(
                        settings.homepage.features.items.map((feature, itemIndex) =>
                          itemIndex === index
                            ? { ...feature, description: event.target.value }
                            : feature
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </ItemShell>
          ))}
          <button
            type="button"
            onClick={() =>
              updateFeatureItems([
                ...settings.homepage.features.items,
                { title: "New feature", description: "" },
              ])
            }
            className={actionButtonClass}
          >
            Add feature
          </button>
        </div>
      </Section>

      <Section title="Homepage gallery" description="Use a few strong screenshots and keep the gallery small.">
        <div className="space-y-4">
          <SectionIntroFields
            intro={settings.homepage.gallery}
            onChange={(field, value) => updateSectionIntro("gallery", field, value)}
          />
          {settings.homepage.gallery.items.map((item, index) => (
            <ItemShell
              key={`${item.title}-${index}`}
              title={`Gallery item ${index + 1}`}
              onRemove={() =>
                updateGalleryItems(
                  settings.homepage.gallery.items.filter((_, itemIndex) => itemIndex !== index)
                )
              }
            >
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Title
                  <input
                    type="text"
                    value={item.title}
                    onChange={(event) =>
                      updateGalleryItems(
                        settings.homepage.gallery.items.map((galleryItem, itemIndex) =>
                          itemIndex === index
                            ? { ...galleryItem, title: event.target.value }
                            : galleryItem
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Description
                  <input
                    type="text"
                    value={item.description}
                    onChange={(event) =>
                      updateGalleryItems(
                        settings.homepage.gallery.items.map((galleryItem, itemIndex) =>
                          itemIndex === index
                            ? { ...galleryItem, description: event.target.value }
                            : galleryItem
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Image URL
                  <input
                    type="text"
                    value={item.imageUrl}
                    onChange={(event) =>
                      updateGalleryItems(
                        settings.homepage.gallery.items.map((galleryItem, itemIndex) =>
                          itemIndex === index
                            ? { ...galleryItem, imageUrl: event.target.value }
                            : galleryItem
                        )
                      )
                    }
                    className={inputClass}
                    placeholder="https://... or data:image/..."
                  />
                </label>
              </div>
            </ItemShell>
          ))}
          <button
            type="button"
            onClick={() =>
              updateGalleryItems([
                ...settings.homepage.gallery.items,
                { title: "New screenshot", description: "", imageUrl: "" },
              ])
            }
            className={actionButtonClass}
          >
            Add gallery item
          </button>
        </div>
      </Section>

      <Section title="How to join" description="Three steps usually feels cleaner than a long onboarding list.">
        <div className="space-y-4">
          <SectionIntroFields
            intro={settings.homepage.join}
            onChange={(field, value) => updateSectionIntro("join", field, value)}
          />
          {settings.homepage.join.items.map((item, index) => (
            <ItemShell
              key={`${item.title}-${index}`}
              title={`Step ${index + 1}`}
              onRemove={() =>
                updateJoinItems(
                  settings.homepage.join.items.filter((_, itemIndex) => itemIndex !== index)
                )
              }
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Title
                  <input
                    type="text"
                    value={item.title}
                    onChange={(event) =>
                      updateJoinItems(
                        settings.homepage.join.items.map((step, itemIndex) =>
                          itemIndex === index ? { ...step, title: event.target.value } : step
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Description
                  <textarea
                    rows={3}
                    value={item.description}
                    onChange={(event) =>
                      updateJoinItems(
                        settings.homepage.join.items.map((step, itemIndex) =>
                          itemIndex === index
                            ? { ...step, description: event.target.value }
                            : step
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </ItemShell>
          ))}
          <button
            type="button"
            onClick={() =>
              updateJoinItems([
                ...settings.homepage.join.items,
                { title: "New step", description: "" },
              ])
            }
            className={actionButtonClass}
          >
            Add step
          </button>
        </div>
      </Section>

      <Section title="Departments" description="List the main roles or factions that make the city feel active.">
        <div className="space-y-4">
          <SectionIntroFields
            intro={settings.homepage.departments}
            onChange={(field, value) => updateSectionIntro("departments", field, value)}
          />
          {settings.homepage.departments.items.map((item, index) => (
            <ItemShell
              key={`${item.name}-${index}`}
              title={`Department ${index + 1}`}
              onRemove={() =>
                updateDepartmentItems(
                  settings.homepage.departments.items.filter(
                    (_, itemIndex) => itemIndex !== index
                  )
                )
              }
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Name
                  <input
                    type="text"
                    value={item.name}
                    onChange={(event) =>
                      updateDepartmentItems(
                        settings.homepage.departments.items.map((department, itemIndex) =>
                          itemIndex === index
                            ? { ...department, name: event.target.value }
                            : department
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Summary
                  <textarea
                    rows={3}
                    value={item.summary}
                    onChange={(event) =>
                      updateDepartmentItems(
                        settings.homepage.departments.items.map((department, itemIndex) =>
                          itemIndex === index
                            ? { ...department, summary: event.target.value }
                            : department
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </ItemShell>
          ))}
          <button
            type="button"
            onClick={() =>
              updateDepartmentItems([
                ...settings.homepage.departments.items,
                { name: "New department", summary: "" },
              ])
            }
            className={actionButtonClass}
          >
            Add department
          </button>
        </div>
      </Section>

      <Section title="Announcements" description="Use this for patch notes, events, or recruitment updates.">
        <div className="space-y-4">
          <SectionIntroFields
            intro={settings.homepage.announcements}
            onChange={(field, value) => updateSectionIntro("announcements", field, value)}
          />
          {settings.homepage.announcements.items.map((item, index) => (
            <ItemShell
              key={`${item.title}-${index}`}
              title={`Announcement ${index + 1}`}
              onRemove={() =>
                updateAnnouncementItems(
                  settings.homepage.announcements.items.filter(
                    (_, itemIndex) => itemIndex !== index
                  )
                )
              }
            >
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Tag
                  <input
                    type="text"
                    value={item.tag}
                    onChange={(event) =>
                      updateAnnouncementItems(
                        settings.homepage.announcements.items.map((announcement, itemIndex) =>
                          itemIndex === index
                            ? { ...announcement, tag: event.target.value }
                            : announcement
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
                  Title
                  <input
                    type="text"
                    value={item.title}
                    onChange={(event) =>
                      updateAnnouncementItems(
                        settings.homepage.announcements.items.map((announcement, itemIndex) =>
                          itemIndex === index
                            ? { ...announcement, title: event.target.value }
                            : announcement
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-3">
                  Body
                  <textarea
                    rows={3}
                    value={item.body}
                    onChange={(event) =>
                      updateAnnouncementItems(
                        settings.homepage.announcements.items.map((announcement, itemIndex) =>
                          itemIndex === index
                            ? { ...announcement, body: event.target.value }
                            : announcement
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </ItemShell>
          ))}
          <button
            type="button"
            onClick={() =>
              updateAnnouncementItems([
                ...settings.homepage.announcements.items,
                { tag: "", title: "New announcement", body: "" },
              ])
            }
            className={actionButtonClass}
          >
            Add announcement
          </button>
        </div>
      </Section>

      <Section title="FAQ" description="Keep answers short. This section should remove confusion, not create more.">
        <div className="space-y-4">
          <SectionIntroFields
            intro={settings.homepage.faq}
            onChange={(field, value) => updateSectionIntro("faq", field, value)}
          />
          {settings.homepage.faq.items.map((item, index) => (
            <ItemShell
              key={`${item.question}-${index}`}
              title={`FAQ ${index + 1}`}
              onRemove={() =>
                updateFaqItems(
                  settings.homepage.faq.items.filter((_, itemIndex) => itemIndex !== index)
                )
              }
            >
              <div className="grid gap-4">
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Question
                  <input
                    type="text"
                    value={item.question}
                    onChange={(event) =>
                      updateFaqItems(
                        settings.homepage.faq.items.map((faq, itemIndex) =>
                          itemIndex === index ? { ...faq, question: event.target.value } : faq
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                  Answer
                  <textarea
                    rows={3}
                    value={item.answer}
                    onChange={(event) =>
                      updateFaqItems(
                        settings.homepage.faq.items.map((faq, itemIndex) =>
                          itemIndex === index ? { ...faq, answer: event.target.value } : faq
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </ItemShell>
          ))}
          <button
            type="button"
            onClick={() =>
              updateFaqItems([
                ...settings.homepage.faq.items,
                { question: "New question", answer: "" },
              ])
            }
            className={actionButtonClass}
          >
            Add FAQ
          </button>
        </div>
      </Section>

      <Section title="Store page">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Store page title
            <input
              type="text"
              value={settings.storePageTitle}
              onChange={(event) =>
                setSettings((current) => ({ ...current, storePageTitle: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Store page description
            <textarea
              rows={4}
              value={settings.storePageDescription}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  storePageDescription: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
        </div>
      </Section>

      <Section title="Top banner">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-300 lg:col-span-2">
            <input
              type="checkbox"
              checked={settings.topBannerEnabled}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  topBannerEnabled: event.target.checked,
                }))
              }
            />
            Show top banner
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Banner CTA label
            <input
              type="text"
              value={settings.topBannerCtaLabel}
              onChange={(event) =>
                setSettings((current) => ({ ...current, topBannerCtaLabel: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Banner CTA URL
            <input
              type="url"
              value={settings.topBannerCtaUrl}
              onChange={(event) =>
                setSettings((current) => ({ ...current, topBannerCtaUrl: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Banner messages
            <textarea
              rows={6}
              value={stepsToText(settings.topBannerMessages)}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  topBannerMessages: textToSteps(event.target.value),
                }))
              }
              className={inputClass}
              placeholder="One banner message per line"
            />
          </label>
        </div>
      </Section>

      <Section title="Footer content">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Footer badge label
            <input
              type="text"
              value={settings.footerBadgeLabel}
              onChange={(event) =>
                setSettings((current) => ({ ...current, footerBadgeLabel: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Footer tagline
            <input
              type="text"
              value={settings.footerTagline}
              onChange={(event) =>
                setSettings((current) => ({ ...current, footerTagline: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Footer description
            <textarea
              rows={4}
              value={settings.footerText}
              onChange={(event) =>
                setSettings((current) => ({ ...current, footerText: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Footer nav heading
            <input
              type="text"
              value={settings.footerNavHeading}
              onChange={(event) =>
                setSettings((current) => ({ ...current, footerNavHeading: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Footer connect heading
            <input
              type="text"
              value={settings.footerConnectHeading}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  footerConnectHeading: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Discord card title
            <input
              type="text"
              value={settings.footerDiscordCardTitle}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  footerDiscordCardTitle: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Discord button text
            <input
              type="text"
              value={settings.footerConnectButtonText}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  footerConnectButtonText: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Discord blurb
            <textarea
              rows={3}
              value={settings.footerConnectBlurb}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  footerConnectBlurb: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Footer copyright note
            <input
              type="text"
              value={settings.footerCopyrightNote}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  footerCopyrightNote: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Bottom tagline left
            <input
              type="text"
              value={settings.footerBottomTaglineLeft}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  footerBottomTaglineLeft: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Bottom tagline right
            <input
              type="text"
              value={settings.footerBottomTaglineRight}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  footerBottomTaglineRight: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
        </div>
      </Section>

      <Section title="System">
        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
          Logs webhook URL (optional)
          <input
            type="url"
            value={settings.logsWebhookUrl ?? ""}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                logsWebhookUrl: event.target.value || null,
              }))
            }
            className={inputClass}
          />
        </label>
      </Section>

      <Section title="Discord DM templates">
        <div className="space-y-6">
          {(["whitelist", "job", "staff"] as const).map((applicationType) => (
            <div key={applicationType} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <h4 className="text-base font-semibold capitalize text-zinc-200">{applicationType}</h4>
              {(["accepted", "rejected"] as const).map((status) => (
                <div key={`${applicationType}-${status}`} className="grid gap-4 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <h5 className="text-sm font-semibold capitalize text-zinc-300">{status}</h5>
                  </div>
                  <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                    Default reason
                    <textarea
                      rows={4}
                      value={settings.dmTemplates[applicationType][status].reasonDefault}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          dmTemplates: {
                            ...current.dmTemplates,
                            [applicationType]: {
                              ...current.dmTemplates[applicationType],
                              [status]: {
                                ...current.dmTemplates[applicationType][status],
                                reasonDefault: event.target.value,
                              },
                            },
                          },
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                    Footer note
                    <textarea
                      rows={4}
                      value={settings.dmTemplates[applicationType][status].footerNote}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          dmTemplates: {
                            ...current.dmTemplates,
                            [applicationType]: {
                              ...current.dmTemplates[applicationType],
                              [status]: {
                                ...current.dmTemplates[applicationType][status],
                                footerNote: event.target.value,
                              },
                            },
                          },
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
                    Next steps
                    <textarea
                      rows={4}
                      value={stepsToText(settings.dmTemplates[applicationType][status].nextSteps)}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          dmTemplates: {
                            ...current.dmTemplates,
                            [applicationType]: {
                              ...current.dmTemplates[applicationType],
                              [status]: {
                                ...current.dmTemplates[applicationType][status],
                                nextSteps: textToSteps(event.target.value),
                              },
                            },
                          },
                        }))
                      }
                      className={inputClass}
                      placeholder="One next step per line"
                    />
                  </label>
                </div>
              ))}
              {applicationType === "whitelist" && settings.dmTemplates.whitelist.deviceCheck ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <h5 className="text-sm font-semibold text-zinc-300">Device check</h5>
                  </div>
                  <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                    Default reason
                    <textarea
                      rows={4}
                      value={settings.dmTemplates.whitelist.deviceCheck.reasonDefault}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          dmTemplates: {
                            ...current.dmTemplates,
                            whitelist: {
                              ...current.dmTemplates.whitelist,
                              deviceCheck: {
                                ...current.dmTemplates.whitelist.deviceCheck!,
                                reasonDefault: event.target.value,
                              },
                            },
                          },
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                    Footer note
                    <textarea
                      rows={4}
                      value={settings.dmTemplates.whitelist.deviceCheck.footerNote}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          dmTemplates: {
                            ...current.dmTemplates,
                            whitelist: {
                              ...current.dmTemplates.whitelist,
                              deviceCheck: {
                                ...current.dmTemplates.whitelist.deviceCheck!,
                                footerNote: event.target.value,
                              },
                            },
                          },
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
                    Next steps
                    <textarea
                      rows={4}
                      value={stepsToText(settings.dmTemplates.whitelist.deviceCheck.nextSteps)}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          dmTemplates: {
                            ...current.dmTemplates,
                            whitelist: {
                              ...current.dmTemplates.whitelist,
                              deviceCheck: {
                                ...current.dmTemplates.whitelist.deviceCheck!,
                                nextSteps: textToSteps(event.target.value),
                              },
                            },
                          },
                        }))
                      }
                      className={inputClass}
                      placeholder="One next step per line"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Logo upload" description="Stored directly in the database for simplicity.">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex w-full flex-col gap-3 lg:max-w-sm">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-3 file:text-sm file:font-medium file:text-zinc-100 hover:file:bg-zinc-700"
            />
            {settings.logoDataUrl ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                <img
                  src={settings.logoDataUrl}
                  alt="Logo preview"
                  className="mx-auto h-20 w-20 rounded-xl object-cover"
                  width={80}
                  height={80}
                />
                <button
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, logoDataUrl: null }))}
                  className="mt-3 w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                >
                  Remove logo
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/50 px-4 py-6 text-center text-sm text-zinc-500">
                No custom logo uploaded yet.
              </div>
            )}
          </div>
        </div>
      </Section>

      <button
        type="submit"
        disabled={saving}
        className="brand-bg w-full rounded-lg px-4 py-3 text-sm font-semibold transition brand-bg-hover disabled:opacity-50 sm:w-auto"
      >
        {saving ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
