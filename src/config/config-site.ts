/**
 * CONFIG SITE – Single file for all changeable site text and options.
 *
 * Edit this file to customize:
 * - Site name, server name, header, nav labels
 * - Footer (badge, tagline, description, Discord card, copyright, bottom taglines)
 * - Discord DMs (author name, accepted/rejected templates for whitelist, job, staff)
 * - Whitelist application questions
 * - City businesses (jobs list)
 * - Staff application questions
 */

/** Template for one application status in a Discord DM. */
export type DmStatusTemplate = {
  reasonDefault: string;
  nextSteps: readonly string[];
  footerNote: string;
};

/** DM template for one application type (whitelist, job, staff). */
export type DmApplicationTemplate = {
  accepted: DmStatusTemplate;
  rejected: DmStatusTemplate;
  deviceCheck?: DmStatusTemplate;
};

const CONFIG_SITE = {
  // ─── Site & branding ─────────────────────────────────────────────────────
  /** Display name of the server (DMs, footer, branding) */
  serverName: " t̴s̴h̶e̷n̶t̵r̵o̴.̴t̵e̷c̵h",

  /** Site name shown in the header */
  siteName: "t̴s̴h̶e̷n̶t̵r̵o̴.̴t̵e̷c̵h" ,

  /** Icon or short label next to site name in header */
  headerIcon: "RP",

  /** Nav label for the whitelist link (e.g. "Get Whitelisted") */
  whitelistNavLabel: "Get Whitelisted",

  /** Nav label for the public store page */
  storeNavLabel: "Store",

  /** Public Discord invite URL (footer "Connect" button and links) */
  discordInviteUrl: "https://discord.gg/DWdM4h7xbj",

  /** Discord server ID for the footer widget iframe (leave empty "" to hide the widget) */
  discordWidgetServerId: "1251722749819359272",

  /** Homepage subtitle under the title (use {serverName} to insert the server name) */
  homepageSubtitle:
    "Welcome to the first roleplay server in Tunisia created with no restrictions and no access privileges.We are proud to be the Tunisian RP server without a whitelist, open to everyone.Everyone can play. Everyone is welcome. Come and experience RP the easy way — welcome to our server! {serverName}.",

  /** Store page title */
  storePageTitle: "Server Store",

  /** Store page description */
  storePageDescription:
    "Browse all items available for sale on the server. Admins can manage categories, prices, product titles, and images from the admin panel.",

  // ─── Top banner / ad bar ────────────────────────────────────────────────────
  /** Show the promotional banner at the very top of the site */
  topBannerEnabled: true,
  /** Label for the banner button (set empty string "" to hide the button) */
  topBannerCtaLabel: "Server Store",
  /** URL opened when clicking the banner button (falls back to discordInviteUrl if empty) */
  topBannerCtaUrl: "https://tshentro.tebex.io",
  /** Optional: cycle through multiple banner messages */
  topBannerMessages: [
    "Tunisia High-life RP is live now — join the city and start your story today.",
    "Welcome to Tunisia High-life RP — where your story begins. The city is now live.",
    "Your new life starts here. Tunisia High-life RP is now live — enter the city today.",
    "High-life RP Tunisia is LIVE — are you ready?",
    "A new city. A new life. Tunisia High-life RP is now live — your story begins now.",
    "Step into Tunisia High-life RP — an exclusive roleplay experience now live.",
  ],

  // ─── Footer ───────────────────────────────────────────────────────────────
  /** Small badge text above tagline (e.g.  or your brand) */
  footerBadgeLabel: "t̴s̴h̶e̷n̶t̵r̵o̴.̴t̵e̷c̵h",

  /** Uppercase tagline under the badge */
  footerTagline: "FROM THE STREETS TO THE GENERATIONS",

  /** Short description paragraph in the footer */
  footerDescription:
    "Experience immersive GTA V roleplay with custom systems, serious RP, and a tight-knit community.",

  /** Discord connect card: button text */
  footerConnectButtonText: "Connect to Discord",

  /** Discord connect card: short line above button (use {serverName} for server name) */
  footerConnectBlurb:
    "Join {serverName} on Discord to get whitelisted, ask questions, and stay updated.",

  /** Copyright line: "Not affiliated with …" */
  footerCopyrightNote: "Not affiliated with Rockstar Games or Take-Two Interactive.",

  /** Bottom bar left tagline (e.g. "RESPECT THE STREETS") */
  footerBottomTaglineLeft: "RESPECT THE STREETS",

  /** Bottom bar right tagline (e.g. "ROLEPLAY • COMMUNITY • STORIES") */
  footerBottomTaglineRight: "ROLEPLAY • COMMUNITY • STORIES",

  /** Section heading for footer nav column */
  footerNavHeading: "NAVIGATION",

  /** Section heading for footer Discord card */
  footerConnectHeading: "CONNECT",

  /** Discord card inner title (e.g. "DISCORD") */
  footerDiscordCardTitle: "DISCORD",

  // ─── Discord DM (author & templates) ──────────────────────────────────────
  /** Author name on Discord DM embeds (optional; falls back to serverName) */
  discordDmAuthorName: "𝑹𝑷",

  /** Discord DM templates for accepted/rejected messages (whitelist, job, staff) */
  dmTemplates: {
    whitelist: {
      accepted: {
        reasonDefault:
          "Your answers showed a solid grasp of roleplay and fit what we're looking for. Looking forward to seeing you in-game.",
        nextSteps: [
          "Hop into our Discord if you're not in yet",
          "Check #server-rules and get familiar with the guidelines",
          "Connect with your whitelisted account when you're ready",
        ],
        footerNote: "Read the rules before you jump in. Need help? Ask any staff member.",
      },
      rejected: {
        reasonDefault:
          "We couldn't approve it right now. Give our rules and guidelines another look; you're welcome to reapply when you're ready.",
        nextSteps: [
          "Review our server rules and community guidelines",
          "Apply again when you feel ready",
          "Questions? Message our staff on Discord",
        ],
        footerNote: "Thanks for your interest. We hope to see you apply again.",
      },
      deviceCheck: {
        reasonDefault:
          "Hello, we're waiting for you. We'll check your device before you enter the server. This is a daily routine and a security protocol specific to the server.",
        nextSteps: [
          "Wait for a staff member to contact you",
          "Make sure you are available on Discord for the device check",
          "Once the check is done, we will continue your access process",
        ],
        footerNote: "This device check is part of our normal daily server security routine.",
      },
    },
    job: {
      accepted: {
        reasonDefault:
          "Your application was a good fit for the role. Get in touch with your supervisor for the next steps.",
        nextSteps: [
          "Join our Discord if you aren't already in",
          "Check #city-jobs or staff channels for details",
          "Connect in-game and report to your supervisor as directed",
        ],
        footerNote: "Questions about the role? Staff can point you in the right direction.",
      },
      rejected: {
        reasonDefault:
          "We're not moving forward with this one right now. You can try other openings or reapply later.",
        nextSteps: [
          "Look at other jobs on the site",
          "Reapply when new positions open up",
          "Reach out to staff on Discord if you have questions",
        ],
        footerNote: "Thanks for applying. Best of luck.",
      },
    },
    staff: {
      accepted: {
        reasonDefault:
          "What you brought to the table fits what we need. A team lead will get you set up.",
        nextSteps: [
          "Get in our Discord if you're not already",
          "Read staff guidelines and rules in the right channels",
          "A team lead will contact you with your role and onboarding",
        ],
        footerNote:
          "Stuck on something? Your team lead or senior staff can help. See you on the team.",
      },
      rejected: {
        reasonDefault:
          "We're not approving it right now. You can reapply later if things change.",
        nextSteps: [
          "Have another look at our server and staff guidelines",
          "You can submit a new staff application when you're ready",
          "Questions? Hit up our staff on Discord",
        ],
        footerNote: "Thanks for wanting to help out. We appreciate it.",
      },
    },
  } as const satisfies Record<string, DmApplicationTemplate>,

  // ─── Whitelist application form questions ─────────────────────────────────
  whitelistApplicationQuestions: [
    { id: "inGameName", label: "Your in-game name", type: "text" as const, required: true, placeholder: "Your character name" },
    { id: "age", label: "Your age", type: "number" as const, required: true, placeholder: "18" },
    { id: "timezone", label: "Discord ID", type: "text" as const, required: true, placeholder: "Discord ID" },
    { id: "experience", label: "Why do you want to play on Highlife?", type: "textarea" as const, required: true, placeholder: "Explain why you want to play on Highlife" },
    { id: "motivation", label: "Who told you about Highlife?", type: "textarea" as const, required: true, placeholder: "Example: I heard about Highlife because it's one of the best servers in Tunisia" },
    { id: "characterStory", label: "How long have you been playing RP?", type: "textarea" as const, required: true, placeholder: "How long have you been playing RP, and what made you start?" },
    { id: "additionalInfo", label: "Did you read and memorize the rules?", type: "textarea" as const, required: false, placeholder: "Example: Yes, I memorized them / No, not yet" },
  ] as const,

  // ─── City businesses (jobs list) ───────────────────────────────────────────
  businesses: [
    { id: "hospital", name: "Pillbox Medical Center", category: "MEDICAL", description: "Hospital and EMS" },
    { id: "lspd", name: "LSPD", category: "EMERGENCY SERVICES", description: "Law enforcement" },
  ] as const,

  // ─── Staff application form questions ──────────────────────────────────────
  staffApplicationQuestions: [
    { id: "role", label: "What made you want to join the Highlife staff team?", type: "select" as const, required: true, options: ["Support", "Development", "PARTNERSHIP"] },
    { id: "age", label: "Age", type: "text" as const, required: true, placeholder: "e.g. 18" },
    { id: "experience", label: "Do you have previous staff experience?", type: "textarea" as const, required: false },
    { id: "availability", label: "How many hours can you be active as staff per day?", type: "text" as const, required: true },
    { id: "why", label: "If you have previous staff experience, tell us where exactly", type: "textarea" as const, required: true },
    { id: "additional", label: "If you become staff with us, what would your goal be?", type: "textarea" as const, required: false },
  ] as const,
} as const;

// Re-export as appConfig so existing imports keep working
export const appConfig = CONFIG_SITE;

export type StaffQuestion = (typeof appConfig.staffApplicationQuestions)[number];
export type WhitelistQuestion = (typeof appConfig.whitelistApplicationQuestions)[number];
export type Business = (typeof appConfig.businesses)[number];
