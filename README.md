# free website fivem server and Whitelist applications
https://tshentro.tebex.io/


https://www.youtube.com/watch?v=PC0Mrz61Mys

Professional FiveM roleplay community website with Discord authentication, whitelist/staff/job applications, admin review tools, and customizable branding.

## What This Project Includes

- Discord OAuth login (`NextAuth`)
- Public whitelist application form
- Staff application form
- Job application system
- Admin dashboard for reviewing applications
- Rules pages and editable content sections
- Store/categories pages
- Discord webhook and DM workflow support
- Optional role assignment and device-check flow

## Tech Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Prisma`
- `PostgreSQL` (Neon/Supabase/Vercel Postgres compatible)
- `Tailwind CSS`

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
copy .env.example .env
```

3. Fill required values in `.env` (database + Discord + NextAuth).

4. Start development:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Required Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
NEXTAUTH_SECRET=your_random_long_secret
NEXTAUTH_URL=http://localhost:3000
ADMIN_DISCORD_IDS=123456789012345678
```

## Optional Environment Variables

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_discord_server_id
DISCORD_WHITELIST_ROLE_ID=role_id
DISCORD_DEVICE_CHECK_ROLE_ID=role_id
DISCORD_STAFF_ROLE_ID=role_id
TEAM_ADMIN_DISCORD_IDS=id1,id2
JOBS_ADMIN_DISCORD_IDS=id1,id2
```

## Scripts

- `npm run dev` - run local dev server
- `npm run build` - build production app
- `npm run start` - run production server
- `npm run db:migrate:deploy` - apply Prisma migrations
- `npm run db:seed` - run database seed
- `npm run deploy` - deploy with Vercel CLI

## Project Setup Notes

- Full setup guide: `INSTALLATION.md`
- Deployment guide: `DEPLOY.md`
- Site text/branding config: `src/config/config-site.ts`

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Add all required environment variables in Vercel.
4. Deploy.

If your production database already has tables, you may need to baseline migrations before running `prisma migrate deploy`.
