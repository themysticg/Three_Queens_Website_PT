# CONFIG SITE – Single file for all changeable text

All site-specific, changeable text and options live in **`config-site.ts`** in this folder. Edit that file only; the rest of the app reads from it (via `app.config` re-export).

---

## What you can edit in `config-site.ts`

### Site & branding
- **`serverName`** – Display name of the server (DMs, footer, branding).
- **`siteName`** – Name shown in the header.
- **`headerIcon`** – Icon or short label next to the site name.
- **`whitelistNavLabel`** – Text for the whitelist link (e.g. "Get Whitelisted").
- **`discordInviteUrl`** – Public Discord invite (footer button and links).
- **`discordWidgetServerId`** – Discord server ID for the footer widget iframe (e.g. `1151980580624400434`). Leave empty `""` to hide the widget.
- **`homepageSubtitle`** – Subtitle under the main title on the homepage. Use `{serverName}` to insert the server name.

### Footer
- **`footerBadgeLabel`** – Small badge above the tagline (e.g. "TCHENTRO.TECH").
- **`footerTagline`** – Uppercase tagline under the badge.
- **`footerDescription`** – Short description paragraph.
- **`footerConnectButtonText`** – Discord button text (e.g. "Connect to Discord").
- **`footerConnectBlurb`** – Line above the button; use `{serverName}` to insert the server name.
- **`footerCopyrightNote`** – e.g. "Not affiliated with Rockstar Games or Take-Two Interactive."
- **`footerBottomTaglineLeft`** / **`footerBottomTaglineRight`** – Bottom bar taglines.
- **`footerNavHeading`** / **`footerConnectHeading`** / **`footerDiscordCardTitle`** – Section headings.

### Discord DMs
- **`discordDmAuthorName`** – Author name on DM embeds (optional; falls back to `serverName`).
- **`dmTemplates`** – For each of **whitelist**, **job**, and **staff**:
  - **`accepted`** – `reasonDefault`, `nextSteps[]`, `footerNote`.
  - **`rejected`** – same fields.

Use Discord-style markdown in DM text: **bold**, *italic*.

### Whitelist application questions
- **`whitelistApplicationQuestions`** – Array of `{ id, label, type, required, placeholder? }`.
  - `id` must match field names: `inGameName`, `age`, `timezone`, `experience`, `motivation`, `characterStory`, `additionalInfo`.

### City businesses (jobs list)
- **`businesses`** – Array of `{ id, name, category, description }`. This is the only source for the Jobs page.

### Staff application questions
- **`staffApplicationQuestions`** – Array of `{ id, label, type, required, options? }`. For `type: "select"`, set **`options`** to an array of choices.

---

## File layout

- **`config-site.ts`** – Single source of truth; edit this file.
- **`app.config.ts`** – Re-exports from `config-site.ts` so existing imports (`@/config/app.config`) keep working.

You can keep importing `appConfig` from `@/config/app.config`; it points to the same config.
