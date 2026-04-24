# Installation Guide

This document explains how to install, configure, and deploy the `fivem-whitelist-app` website from start to finish.

## What This Project Is

This is a `Next.js` website for FiveM communities. It includes:

- Discord login
- Whitelist applications
- Job applications
- Staff applications
- Admin review panel
- Optional Discord webhooks, DMs, and role sync
- Store/category pages

The app uses:

- `Next.js 16`
- `React 19`
- `Prisma`
- `PostgreSQL`
- `NextAuth` with Discord OAuth

## Before You Start

You need these items ready before installation:

1. `Node.js 20+`
2. `npm`
3. A `PostgreSQL` database
4. A `Discord Developer Application`
5. A domain or Vercel project for production deployment

## 1. Install Dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

What this does:

- installs Next.js and the app dependencies
- installs Prisma packages
- runs `prisma generate` automatically after install

## 2. Create Your Environment File

Copy `.env.example` to `.env`.

Example:

```bash
copy .env.example .env
```

If `copy` does not work in your shell, create `.env` manually and paste the contents from `.env.example`.

## 3. Create a PostgreSQL Database

This project does **not** use SQLite. It requires PostgreSQL.

Good options:

- Vercel Postgres
- Neon
- Supabase
- local PostgreSQL

Your connection string must look like this:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

Important:

- `DATABASE_URL` must start with `postgresql://` or `postgres://`
- do not use `file:./dev.db`
- the app will fail if the database URL is missing or invalid

## 4. Create a Discord Application

Go to [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.

### OAuth setup

Inside your Discord application:

1. Open `OAuth2`
2. Copy the `Client ID`
3. Open `OAuth2 -> General`
4. Copy or generate the `Client Secret`
5. Add redirect URLs

For local development, add:

```text
http://localhost:3000/api/auth/callback/discord
```

For production, add your live domain:

```text
https://your-domain.com/api/auth/callback/discord
```

Why this matters:

- the website uses Discord to sign users in
- if the redirect URL in Discord does not exactly match your site URL, login will fail

## 5. Fill in `.env`

Below is what each important environment variable does.

### Required

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=http://localhost:3000
ADMIN_DISCORD_IDS=your_discord_id
```

Explanation:

- `DATABASE_URL`: connects the app to PostgreSQL
- `DISCORD_CLIENT_ID`: Discord OAuth application client ID
- `DISCORD_CLIENT_SECRET`: Discord OAuth application secret
- `NEXTAUTH_SECRET`: secret used by NextAuth to sign sessions
- `NEXTAUTH_URL`: the exact URL where the website is running
- `ADMIN_DISCORD_IDS`: Discord IDs allowed full admin access on first login

### Optional

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_discord_server_id
DISCORD_WHITELIST_ROLE_ID=your_whitelist_role_id
DISCORD_DEVICE_CHECK_ROLE_ID=your_device_check_role_id
DISCORD_STAFF_ROLE_ID=your_staff_role_id
TEAM_ADMIN_DISCORD_IDS=comma,separated,ids
JOBS_ADMIN_DISCORD_IDS=comma,separated,ids
```

Explanation:

- `DISCORD_WEBHOOK_URL`: sends notifications to a Discord channel
- `DISCORD_BOT_TOKEN`: needed for Discord DMs and role assignment
- `DISCORD_GUILD_ID`: your Discord server ID
- `DISCORD_WHITELIST_ROLE_ID`: role granted after whitelist approval
- `DISCORD_DEVICE_CHECK_ROLE_ID`: role granted when moved to device check
- `DISCORD_STAFF_ROLE_ID`: role granted after staff approval
- `TEAM_ADMIN_DISCORD_IDS`: team admins for whitelist/staff management
- `JOBS_ADMIN_DISCORD_IDS`: job admins for job application management

## 6. Generate a Secure `NEXTAUTH_SECRET`

Use a long random string. Example PowerShell command:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Paste the result into:

```env
NEXTAUTH_SECRET=your_generated_secret
```

## 7. Run Database Migrations

After `.env` is ready, run:

```bash
npm run db:migrate:deploy
```

What this does:

- creates the database tables
- applies all Prisma migrations in `prisma/migrations`
- prepares the app for login and application storage

## 8. Seed the Jobs Data

This step is optional but recommended:

```bash
npm run db:seed
```

What this does:

- reads the jobs/business list from `src/config/config-site.ts`
- inserts or updates the jobs shown on the website

If you skip this step, your jobs page may be empty until data is added another way.

## 9. Start the Website Locally

Run:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

What should happen:

- the homepage loads
- Discord sign-in works
- users can submit forms
- your admin account can open `/admin`

## 10. First Admin Login

Your first admin must be set through `.env`.

Use your own Discord ID in one of these:

- `ADMIN_DISCORD_IDS` for full admin
- `TEAM_ADMIN_DISCORD_IDS` for whitelist/staff admin
- `JOBS_ADMIN_DISCORD_IDS` for jobs admin

After editing `.env`:

1. restart the app
2. sign out if you are already logged in
3. sign back in with Discord

Once a full admin can access `/admin`, more members can be added from the admin panel without editing `.env`.

## 11. Customize the Website

There are two main customization layers.

### File-based configuration

Edit `src/config/config-site.ts` for default content such as:

- server name
- site name
- footer text
- Discord invite
- whitelist questions
- staff questions
- default jobs/businesses
- default DM templates

### Admin panel configuration

After logging in as an admin, use `/admin` to manage:

- applications
- store catalog
- members
- branding
- logs
- form questions

This means you do not need to hard-code everything after the site is running.

## 12. Optional Discord Bot Setup

You only need this if you want:

- approval/rejection DMs
- automatic role assignment
- device-check role changes

Inside the same Discord application:

1. open `Bot`
2. create a bot
3. copy the bot token
4. invite the bot to your server

Recommended bot permissions:

- `Manage Roles`
- `Send Messages`
- `View Channels`

Important:

- the bot must be in the same server as the users
- the bot role must be above the roles it needs to assign
- if role order is wrong, approval may work but role assignment will fail

## 13. Deploy to Production

The easiest production setup for this app is `Vercel`.

### Vercel deployment

1. Push the project to GitHub
2. Import the repo into Vercel
3. Add all environment variables from `.env`
4. Deploy the project

After deployment:

1. set `NEXTAUTH_URL` to your real domain
2. add the same production callback URL in Discord
3. redeploy if needed

Example production values:

```env
NEXTAUTH_URL=https://your-domain.com
DATABASE_URL=postgresql://...
```

## 14. Run Production Migrations

This project avoids running Prisma migrations automatically during Vercel builds in many cases.

So after a production deploy, run:

```bash
npm run db:migrate:deploy
```

Use the production `DATABASE_URL` when running that command.

Why this matters:

- the site can deploy successfully
- but new tables or columns will not exist until migrations are applied

## 15. Post-Install Checklist

Confirm these items before going live:

- homepage loads
- Discord login works
- redirect URI matches exactly
- database connection works
- `/admin` opens for your admin account
- whitelist form submits correctly
- jobs exist on the jobs page
- optional Discord webhook sends messages
- optional Discord bot can send DMs and assign roles

## Common Problems

### Login fails

Usually caused by:

- wrong `DISCORD_CLIENT_ID`
- wrong `DISCORD_CLIENT_SECRET`
- bad Discord redirect URI
- incorrect `NEXTAUTH_URL`

### You are logged in but not an admin

Usually caused by:

- your Discord ID is not in `ADMIN_DISCORD_IDS`, `TEAM_ADMIN_DISCORD_IDS`, or `JOBS_ADMIN_DISCORD_IDS`
- the app was not restarted after changing `.env`
- you need to sign out and sign back in

### Database errors

Usually caused by:

- invalid `DATABASE_URL`
- using SQLite instead of PostgreSQL
- migrations were not run

### Roles are not assigned

Usually caused by:

- missing `DISCORD_BOT_TOKEN`
- missing `DISCORD_GUILD_ID`
- missing role ID variables
- bot role is below the target role

## Recommended Install Order

If you want the smoothest setup, do it in this order:

1. install dependencies
2. create PostgreSQL database
3. create Discord application
4. fill in `.env`
5. run migrations
6. seed jobs
7. start the site locally
8. confirm admin access
9. customize branding and forms
10. deploy to Vercel
11. update production redirect URI and `NEXTAUTH_URL`

## Quick Start Commands

```bash
npm install
copy .env.example .env
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

## Final Notes

- local development uses `http://localhost:3000`
- production must use the real domain in both Discord and `NEXTAUTH_URL`
- PostgreSQL is required
- your first full admin should always be added through `.env`
- the admin panel can manage much of the content after first setup
