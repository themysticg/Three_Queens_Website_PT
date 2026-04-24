export type HomepageButtonTone = "discord" | "primary" | "secondary";
export type HomepageStatTone = "default" | "success";

export type HomepageButton = {
  label: string;
  href: string;
  tone: HomepageButtonTone;
  openInNewTab: boolean;
};

export type HomepageHero = {
  badge: string;
  title: string;
  subtitle: string;
  backgroundImageUrl: string;
  primaryButton: HomepageButton;
  secondaryButton: HomepageButton;
  snapshotEyebrow: string;
  snapshotTitle: string;
  snapshotDescription: string;
  snapshotTags: string[];
};

export type HomepageStatItem = {
  label: string;
  value: string;
  tone: HomepageStatTone;
};

export type HomepageSectionIntro = {
  eyebrow: string;
  title: string;
  description: string;
};

export type HomepageFeatureItem = {
  title: string;
  description: string;
};

export type HomepageGalleryItem = {
  title: string;
  description: string;
  imageUrl: string;
};

export type HomepageStepItem = {
  title: string;
  description: string;
};

export type HomepageDepartmentItem = {
  name: string;
  summary: string;
};

export type HomepageAnnouncementItem = {
  tag: string;
  title: string;
  body: string;
};

export type HomepageFaqItem = {
  question: string;
  answer: string;
};

export type HomepageFeatureSection = HomepageSectionIntro & {
  items: HomepageFeatureItem[];
};

export type HomepageGallerySection = HomepageSectionIntro & {
  items: HomepageGalleryItem[];
};

export type HomepageStepSection = HomepageSectionIntro & {
  items: HomepageStepItem[];
};

export type HomepageDepartmentSection = HomepageSectionIntro & {
  items: HomepageDepartmentItem[];
};

export type HomepageAnnouncementSection = HomepageSectionIntro & {
  items: HomepageAnnouncementItem[];
};

export type HomepageFaqSection = HomepageSectionIntro & {
  items: HomepageFaqItem[];
};

export type HomepageContent = {
  hero: HomepageHero;
  stats: HomepageStatItem[];
  features: HomepageFeatureSection;
  gallery: HomepageGallerySection;
  join: HomepageStepSection;
  departments: HomepageDepartmentSection;
  announcements: HomepageAnnouncementSection;
  faq: HomepageFaqSection;
};

export const defaultHomepageContent: HomepageContent = {
  hero: {
    badge: "Tunisian RP experience",
    title: "Join {serverName}",
    subtitle:
      "Serious roleplay, active staff, custom features, and a growing community built for long-term stories.",
    backgroundImageUrl: "",
    primaryButton: {
      label: "Join Discord",
      href: "{discordLink}",
      tone: "discord",
      openInNewTab: true,
    },
    secondaryButton: {
      label: "Start playing",
      href: "{applyUrl}",
      tone: "primary",
      openInNewTab: false,
    },
    snapshotEyebrow: "City snapshot",
    snapshotTitle: "Police scenes, civilian life, factions, and custom jobs",
    snapshotDescription:
      "Keep the landing area clean, but still show enough activity to make the server feel alive from the first screen.",
    snapshotTags: ["Police patrols", "EMS response", "Business RP", "Street stories"],
  },
  stats: [
    { label: "Status", value: "{serverStatus}", tone: "success" },
    { label: "Players", value: "{playersOnline}/{maxPlayers}", tone: "default" },
    { label: "Server", value: "{serverConnect}", tone: "default" },
  ],
  features: {
    eyebrow: "Why choose us",
    title: "A city built for roleplay that actually lasts",
    description:
      "Use a short section here to explain the main strengths of the server without overloading the homepage.",
    items: [
      {
        title: "Custom scripts",
        description: "Purpose-built systems for jobs, progression, economy, and daily city life.",
      },
      {
        title: "Active moderation",
        description: "A visible staff team that keeps scenes fair, organized, and enjoyable.",
      },
      {
        title: "Serious economy",
        description: "Meaningful progression, business opportunities, and long-term character growth.",
      },
      {
        title: "Beginner-friendly community",
        description: "Easy to join, easy to learn, and structured enough for serious RP players.",
      },
    ],
  },
  gallery: {
    eyebrow: "Gallery",
    title: "Scenes players can picture before they join",
    description:
      "Add a few strong gameplay images here. Keep the section compact and show only the best screenshots.",
    items: [
      {
        title: "City patrols",
        description: "Law enforcement scenes across the city.",
        imageUrl: "",
      },
      {
        title: "Emergency response",
        description: "EMS, hospital scenes, and critical incidents.",
        imageUrl: "",
      },
      {
        title: "Business and street life",
        description: "Civilian progression, businesses, and underground stories.",
        imageUrl: "",
      },
    ],
  },
  join: {
    eyebrow: "How to join",
    title: "Start your story in three simple steps",
    description: "Give new players a clear path from landing on the site to entering the server.",
    items: [
      {
        title: "Join Discord",
        description: "Enter the community hub for updates, support, and onboarding.",
      },
      {
        title: "Read the rules",
        description: "Check the server rules, setup info, and application instructions.",
      },
      {
        title: "Connect to the server",
        description: "Apply if needed, get approved, and begin building your character.",
      },
    ],
  },
  departments: {
    eyebrow: "Departments",
    title: "The city feels alive because every role matters",
    description: "Show the main factions and departments so visitors quickly understand the city.",
    items: [
      { name: "Police", summary: "Patrol, investigations, and city response." },
      { name: "EMS", summary: "Medical roleplay, rescue scenes, and hospital response." },
      { name: "Mechanics", summary: "Repairs, tuning, towing, and garage-based RP." },
      { name: "Businesses", summary: "Player-run services, shops, and management roles." },
      { name: "Gangs", summary: "Territory, alliances, and underground stories." },
      { name: "Staff team", summary: "Moderation, support, and scene quality control." },
    ],
  },
  announcements: {
    eyebrow: "Latest updates",
    title: "Keep the homepage feeling active",
    description: "A few current updates make the server look maintained and alive.",
    items: [
      {
        tag: "Recruitment",
        title: "Staff applications open",
        body: "We are currently looking for committed moderators and support staff.",
      },
      {
        tag: "Patch notes",
        title: "Economy and jobs updates",
        body: "Jobs, business opportunities, and progression systems continue to improve.",
      },
      {
        tag: "Events",
        title: "Weekend community events",
        body: "Expect public scenes, organized events, and more reasons to join in.",
      },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Questions new players ask first",
    description: "Keep answers short and practical so people can move to the next step quickly.",
    items: [
      {
        question: "Is whitelist required?",
        answer: "Check the current Discord onboarding and website application flow for the latest access process.",
      },
      {
        question: "How do I join?",
        answer: "Join Discord, read the rules, complete any required application, then connect.",
      },
      {
        question: "Do I need Discord?",
        answer: "Yes. Discord is used for applications, announcements, and support.",
      },
      {
        question: "Is the server beginner-friendly?",
        answer: "Yes. New players can settle in quickly and get support when needed.",
      },
      {
        question: "What jobs are available?",
        answer: "Browse the jobs page to see legal, faction, and custom role openings.",
      },
    ],
  },
};

function normalizeText(value: string | null | undefined, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  return value.trim();
}

function normalizeTextAllowFallback(value: string | null | undefined, fallback: string): string {
  return normalizeText(value, fallback) || fallback;
}

function normalizeStringArray(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function normalizeButton(value: Partial<HomepageButton> | null | undefined, fallback: HomepageButton): HomepageButton {
  const tone = value?.tone === "discord" || value?.tone === "primary" || value?.tone === "secondary"
    ? value.tone
    : fallback.tone;

  return {
    label: normalizeTextAllowFallback(value?.label, fallback.label),
    href: normalizeTextAllowFallback(value?.href, fallback.href),
    tone,
    openInNewTab: value?.openInNewTab ?? fallback.openInNewTab,
  };
}

function normalizeHero(value: Partial<HomepageHero> | null | undefined, fallback: HomepageHero): HomepageHero {
  return {
    badge: normalizeText(value?.badge, fallback.badge),
    title: normalizeTextAllowFallback(value?.title, fallback.title),
    subtitle: normalizeTextAllowFallback(value?.subtitle, fallback.subtitle),
    backgroundImageUrl: normalizeText(value?.backgroundImageUrl, fallback.backgroundImageUrl),
    primaryButton: normalizeButton(value?.primaryButton, fallback.primaryButton),
    secondaryButton: normalizeButton(value?.secondaryButton, fallback.secondaryButton),
    snapshotEyebrow: normalizeTextAllowFallback(value?.snapshotEyebrow, fallback.snapshotEyebrow),
    snapshotTitle: normalizeTextAllowFallback(value?.snapshotTitle, fallback.snapshotTitle),
    snapshotDescription: normalizeText(value?.snapshotDescription, fallback.snapshotDescription),
    snapshotTags: normalizeStringArray(value?.snapshotTags, fallback.snapshotTags),
  };
}

function normalizeStatItem(value: Partial<HomepageStatItem> | null | undefined): HomepageStatItem {
  const tone = value?.tone === "success" ? "success" : "default";
  return {
    label: normalizeTextAllowFallback(value?.label, "Label"),
    value: normalizeTextAllowFallback(value?.value, "Value"),
    tone,
  };
}

function normalizeFeatureItem(value: Partial<HomepageFeatureItem> | null | undefined): HomepageFeatureItem {
  return {
    title: normalizeTextAllowFallback(value?.title, "Feature"),
    description: normalizeText(value?.description, ""),
  };
}

function normalizeGalleryItem(value: Partial<HomepageGalleryItem> | null | undefined): HomepageGalleryItem {
  return {
    title: normalizeTextAllowFallback(value?.title, "Gallery item"),
    description: normalizeText(value?.description, ""),
    imageUrl: normalizeText(value?.imageUrl, ""),
  };
}

function normalizeStepItem(value: Partial<HomepageStepItem> | null | undefined): HomepageStepItem {
  return {
    title: normalizeTextAllowFallback(value?.title, "Step"),
    description: normalizeText(value?.description, ""),
  };
}

function normalizeDepartmentItem(
  value: Partial<HomepageDepartmentItem> | null | undefined
): HomepageDepartmentItem {
  return {
    name: normalizeTextAllowFallback(value?.name, "Department"),
    summary: normalizeText(value?.summary, ""),
  };
}

function normalizeAnnouncementItem(
  value: Partial<HomepageAnnouncementItem> | null | undefined
): HomepageAnnouncementItem {
  return {
    tag: normalizeText(value?.tag, ""),
    title: normalizeTextAllowFallback(value?.title, "Announcement"),
    body: normalizeText(value?.body, ""),
  };
}

function normalizeFaqItem(value: Partial<HomepageFaqItem> | null | undefined): HomepageFaqItem {
  return {
    question: normalizeTextAllowFallback(value?.question, "Question"),
    answer: normalizeText(value?.answer, ""),
  };
}

function normalizeSectionIntro<T extends HomepageSectionIntro>(
  value: Partial<T> | null | undefined,
  fallback: HomepageSectionIntro
): HomepageSectionIntro {
  return {
    eyebrow: normalizeText(value?.eyebrow, fallback.eyebrow),
    title: normalizeTextAllowFallback(value?.title, fallback.title),
    description: normalizeText(value?.description, fallback.description),
  };
}

function normalizeFeatureSection(
  value: Partial<HomepageFeatureSection> | null | undefined,
  fallback: HomepageFeatureSection
): HomepageFeatureSection {
  return {
    ...normalizeSectionIntro(value, fallback),
    items:
      value?.items && Array.isArray(value.items)
        ? value.items.map((item) => normalizeFeatureItem(item))
        : fallback.items.map((item) => normalizeFeatureItem(item)),
  };
}

function normalizeGallerySection(
  value: Partial<HomepageGallerySection> | null | undefined,
  fallback: HomepageGallerySection
): HomepageGallerySection {
  return {
    ...normalizeSectionIntro(value, fallback),
    items:
      value?.items && Array.isArray(value.items)
        ? value.items.map((item) => normalizeGalleryItem(item))
        : fallback.items.map((item) => normalizeGalleryItem(item)),
  };
}

function normalizeStepSection(
  value: Partial<HomepageStepSection> | null | undefined,
  fallback: HomepageStepSection
): HomepageStepSection {
  return {
    ...normalizeSectionIntro(value, fallback),
    items:
      value?.items && Array.isArray(value.items)
        ? value.items.map((item) => normalizeStepItem(item))
        : fallback.items.map((item) => normalizeStepItem(item)),
  };
}

function normalizeDepartmentSection(
  value: Partial<HomepageDepartmentSection> | null | undefined,
  fallback: HomepageDepartmentSection
): HomepageDepartmentSection {
  return {
    ...normalizeSectionIntro(value, fallback),
    items:
      value?.items && Array.isArray(value.items)
        ? value.items.map((item) => normalizeDepartmentItem(item))
        : fallback.items.map((item) => normalizeDepartmentItem(item)),
  };
}

function normalizeAnnouncementSection(
  value: Partial<HomepageAnnouncementSection> | null | undefined,
  fallback: HomepageAnnouncementSection
): HomepageAnnouncementSection {
  return {
    ...normalizeSectionIntro(value, fallback),
    items:
      value?.items && Array.isArray(value.items)
        ? value.items.map((item) => normalizeAnnouncementItem(item))
        : fallback.items.map((item) => normalizeAnnouncementItem(item)),
  };
}

function normalizeFaqSection(
  value: Partial<HomepageFaqSection> | null | undefined,
  fallback: HomepageFaqSection
): HomepageFaqSection {
  return {
    ...normalizeSectionIntro(value, fallback),
    items:
      value?.items && Array.isArray(value.items)
        ? value.items.map((item) => normalizeFaqItem(item))
        : fallback.items.map((item) => normalizeFaqItem(item)),
  };
}

export function normalizeHomepageContent(
  value: Partial<HomepageContent> | null | undefined
): HomepageContent {
  return {
    hero: normalizeHero(value?.hero, defaultHomepageContent.hero),
    stats:
      value?.stats && Array.isArray(value.stats)
        ? value.stats.map((item) => normalizeStatItem(item))
        : defaultHomepageContent.stats.map((item) => normalizeStatItem(item)),
    features: normalizeFeatureSection(value?.features, defaultHomepageContent.features),
    gallery: normalizeGallerySection(value?.gallery, defaultHomepageContent.gallery),
    join: normalizeStepSection(value?.join, defaultHomepageContent.join),
    departments: normalizeDepartmentSection(value?.departments, defaultHomepageContent.departments),
    announcements: normalizeAnnouncementSection(
      value?.announcements,
      defaultHomepageContent.announcements
    ),
    faq: normalizeFaqSection(value?.faq, defaultHomepageContent.faq),
  };
}
