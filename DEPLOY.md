# Deploy for free (no pay-as-you-go)

This app is set up for **free deployment** only.

## Deploy with Vercel (recommended, free)

[Vercel](https://vercel.com) offers a free tier that includes Next.js, API routes, and serverless functions—no credit card or Blaze plan required.

### One-time setup

1. Push your code to **GitHub** (if you haven't already).
2. Sign in at [vercel.com](https://vercel.com) with GitHub.
3. Click **Add New** → **Project** and import this repo.
4. Add your environment variables (same as `.env`: `DATABASE_URL`, NextAuth secrets, Discord IDs, etc.). For **staff application approval → Discord role**, set `DISCORD_STAFF_ROLE_ID` (and ensure `DISCORD_GUILD_ID` and `DISCORD_BOT_TOKEN` are set); the bot must have **Manage Roles** and the role must be below the bot’s highest role.
5. Click **Deploy**.

### Deploy from your machine

```bash
npm i -g vercel   # one-time: install Vercel CLI
vercel             # first time: link project
vercel --prod      # deploy to production
```

Or use the script:

```bash
npm run deploy
```

### Database on Vercel (required)

The app uses **PostgreSQL** (see `prisma/schema.prisma`). `DATABASE_URL` must start with `postgresql://` or `postgres://` (not `file:./dev.db`).

**If you see "Unable to open the database file" or "Error code 14" on Vercel:** Your project has no Postgres URL set. In Vercel go to **Project → Settings → Environment Variables**, add `DATABASE_URL` with your Neon (or other) Postgres connection string, select **Production** and **Preview**, save, then **redeploy**.

1. **Vercel:** In your project go to **Storage** → **Create Database** → **Postgres**. Copy the connection string.
2. In **Settings** → **Environment Variables**, add `DATABASE_URL` with that value (for Production and Preview).
3. Redeploy.

### Prisma migrations on Vercel

This project now **skips `prisma migrate deploy` during Vercel builds by default** to avoid Prisma advisory-lock timeouts (`P1002`) that can fail otherwise healthy deployments.

When you add a schema change, run the migration separately against production:

```bash
npm run db:migrate:deploy
```

Use the production `DATABASE_URL` when you run that command locally, or run it from a Vercel shell. If you truly want migrations to run during the build, set:

```bash
PRISMA_RUN_MIGRATE_DURING_BUILD=1
```

**Other options:** Neon, Supabase, or any Postgres host. Use the `postgresql://...` connection string they provide.

**Local dev:** Use the same Postgres URL (e.g. from Neon free tier) or a local Postgres. Run `npx prisma migrate deploy` then `npm run dev`. The Jobs page syncs jobs from config on first load.

### Discord bot shows offline (grey) but DMs work

The website talks to Discord over **HTTP** only. That does **not** open the live connection Discord uses for the green “online” dot. To show **online**, run the small presence helper (same `DISCORD_BOT_TOKEN` as `.env`):

```bash
npm run discord:presence
```

Keep that process running (second terminal locally, or **PM2** / **Railway** / **Fly.io** / a tiny VPS — **not** Vercel serverless, which cannot hold a long-lived WebSocket). DMs and admin “message all members” still use the Next.js app; this script only sets presence.

If Discord still looks “offline” in a **DM** tab, open your **server** and check the **member list** (right sidebar): many clients show bot presence there more reliably than on the DM header. The script also sets an explicit “Watching …” status so the dot should update after a refresh.

**Admin → “Online on Discord” DMs:** With `DISCORD_GUILD_ID` and the same `DATABASE_URL` as the site, the presence script also writes who looks **online / idle / DND** on Discord into Postgres. Enable **Server Members Intent** and **Presence Intent** on the bot (Developer Portal → Bot). Run `npm run db:migrate:deploy` after pulling so the `DiscordOnlineSnapshot` table exists.

**Large Discord broadcasts on Vercel:** The admin panel **auto-chains** small batches (each under the time limit) so you can reach the full audience in one click. If a batch still times out, you’ll see a **partial** summary; re-running may duplicate some users in the interrupted batch.
