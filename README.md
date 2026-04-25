# Three Queens — FiveM community website (whitelist & applications)

Professional FiveM roleplay community website with Discord authentication, whitelist/staff/job applications, admin review tools, and customizable branding.

**Reference docs:** step-by-step install and Discord/Postgres details are in [`INSTALLATION.md`](INSTALLATION.md). Free cloud deploy (Vercel) is in [`DEPLOY.md`](DEPLOY.md). Editable copy and defaults live in [`src/config/config-site.ts`](src/config/config-site.ts) (see [`src/config/README.md`](src/config/README.md)).

---

## What this project includes

- Discord OAuth login (NextAuth)
- Public whitelist application form
- Staff application form
- Job application system
- Admin dashboard for reviewing applications
- Rules pages and editable content sections
- Store/categories pages
- Discord webhook and DM workflow support
- Optional role assignment and device-check flow

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Prisma
- PostgreSQL (Neon, Supabase, Vercel Postgres, or self-hosted)
- Tailwind CSS

---

## How hosting fits with XAMPP (multiple sites)

This app is **not** a plain PHP/static site: it is a **Node.js** application. Your other XAMPP projects can keep using `DocumentRoot` under `C:/xampp/htdocs/...` as they do today.

For **this** repo you run:

1. **Node** — `npm run build` then `npm run start` (default listens on **port 3000** on the same machine).
2. **Apache (XAMPP)** — add **one more** `<VirtualHost>` that **reverse-proxies** HTTP(S) traffic for your hostname to `http://127.0.0.1:3000/`. Existing vhosts (for example `prodigiorp.threequeens.net`, `media.threequeens.net`, `docs.threequeens.net`) stay unchanged; you only append a new block.

That way several websites keep running on XAMPP, and this Next.js site is just another hostname on the same Apache instance.

### DNS (production)

Point your subdomain **A record** to the public IPv4 of the machine where XAMPP listens (example from your setup: hostname `3qrp.threequeens.net` → IP `185.113.141.19`). TTL (for example 1 hour) is fine.

Use **your real subdomain** everywhere below if it differs.

### Local testing without changing public DNS

On the **same PC** that runs XAMPP, you can map the hostname to loopback so the browser hits your local Apache:

1. Open **Notepad as Administrator**.
2. Edit `C:\Windows\System32\drivers\etc\hosts`.
3. Add a line (replace with your hostname):

   `127.0.0.1   3qrp.threequeens.net`

4. Save. Remove or comment the line when you want the hostname to resolve to the real server again.

### Enable Apache proxy modules (one-time)

In `C:\xampp\apache\conf\httpd.conf`, ensure these lines are **uncommented** (no `#` at the start):

```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
```

Restart Apache from the XAMPP Control Panel after saving.

### Add a virtual host (alongside your existing sites)

Edit `C:\xampp\apache\conf\extra\httpd-vhosts.conf`. **Do not remove** your existing `<VirtualHost>` blocks. Add a **new** block for this project, for example HTTP on port 80:

```apache
<VirtualHost *:80>
    ServerName 3qrp.threequeens.net

    ProxyPreserveHost On
    ProxyPass        / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # Optional: help apps behind TLS terminators (uncomment if you terminate SSL elsewhere)
    # RequestHeader set X-Forwarded-Proto "http"
</VirtualHost>
```

If you already use **HTTPS** for other subdomains, add a matching `*:443` block (same pattern as your other SSL vhosts): `SSLEngine on`, certificate paths, and the same `ProxyPass` / `ProxyPassReverse` to `http://127.0.0.1:3000/`. For HTTPS you should set `RequestHeader set X-Forwarded-Proto "https"` so NextAuth and redirects behave correctly behind the proxy.

Confirm `httpd.conf` still includes virtual hosts, for example:

```apache
Include conf/extra/httpd-vhosts.conf
```

Restart Apache.

### Keep the Next.js server running

Apache only forwards traffic; **Node must stay running** in the background (after `npm run build`):

- **Development:** `npm run dev` (port 3000 by default).
- **Production:** `npm run start` (also port 3000 unless you set `PORT`).

On Windows, common options are a second terminal left open, **PM2** (`pm2 start npm --name three-queens-site -- start`), or a scheduled task / service wrapper. If nothing is listening on 3000, Apache will return a **502 Bad Gateway**.

### Firewall

Allow **80** and **443** to the machine for Apache. You do **not** need to expose port **3000** publicly if all traffic goes through Apache on 80/443.

---

## Application setup (clone → env → database → run)

### Prerequisites

- **Node.js 20+** and npm
- **PostgreSQL** (local or hosted; connection string in `DATABASE_URL`)
- A **Discord application** for OAuth (see [`INSTALLATION.md`](INSTALLATION.md))

### 1. Clone and install

Clone the repo to any folder (for example `C:\xampp\htdocs\Three_Queens_Website_PT` or a dedicated `C:\sites\...` path). Then:

```bash
cd path\to\Three_Queens_Website_PT
npm install
```

### 2. Environment file

Create a file named `.env` in the project root. Minimum variables:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
NEXTAUTH_SECRET=your_random_long_secret
NEXTAUTH_URL=http://localhost:3000
ADMIN_DISCORD_IDS=123456789012345678
```

**Important for your real hostname**

- When users reach the site at `https://3qrp.threequeens.net` (or your subdomain), set:

  `NEXTAUTH_URL=https://3qrp.threequeens.net`

  (scheme and host must match what the browser shows; no trailing slash.)

- In the [Discord Developer Portal](https://discord.com/developers/applications) → OAuth2 → Redirects, add **exactly**:

  `https://3qrp.threequeens.net/api/auth/callback/discord`

  For local dev on port 3000, also keep:

  `http://localhost:3000/api/auth/callback/discord`

Optional variables (webhooks, bot, roles, extra admins) are listed in [`INSTALLATION.md`](INSTALLATION.md).

Generate a strong `NEXTAUTH_SECRET` (PowerShell example):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3. Database migrations and seed

```bash
npm run db:migrate:deploy
npm run db:seed
```

`db:seed` is optional but recommended so the jobs list is populated from config.

### 4. Development (no Apache required)

```bash
npm run dev
```

Open `http://localhost:3000`.

### 5. Production build (behind XAMPP)

```bash
npm run build
npm run start
```

Then browse to your vhost URL (for example `http://3qrp.threequeens.net` or HTTPS if configured).

### First admin

Put your Discord user ID in `ADMIN_DISCORD_IDS` (or the team/jobs admin variables documented in [`INSTALLATION.md`](INSTALLATION.md)), restart the app, sign in with Discord, then open `/admin`. Further admins can be managed from the panel.

---

## Optional environment variables

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

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run start` | Production server (after `build`) |
| `npm run db:migrate:deploy` | Apply Prisma migrations |
| `npm run db:seed` | Seed jobs from `config-site.ts` |
| `npm run deploy` | Deploy with Vercel CLI |
| `npm run discord:presence` | Optional long-running bot presence (see [`DEPLOY.md`](DEPLOY.md)) |

---

## Project layout pointers

| Path | Purpose |
|------|---------|
| `INSTALLATION.md` | Full install, Discord, Postgres, troubleshooting |
| `DEPLOY.md` | Vercel / migrations / Discord presence notes |
| `src/config/config-site.ts` | Default copy, questions, jobs, footer text |
| `prisma/` | Schema and migrations |

---

## Deploy without self-hosting

If you prefer not to run Node on your XAMPP machine, use **Vercel** (or another Node host): see [`DEPLOY.md`](DEPLOY.md). You still use your **DNS** (A/AAAA or CNAME as required by the host) pointing to that provider instead of reverse-proxying through Apache.

---

## Credits / links

- [Tebex / related resource](https://tshentro.tebex.io/)
- [YouTube — related walkthrough](https://www.youtube.com/watch?v=PC0Mrz61Mys)

---

## Common issues (XAMPP + this stack)

| Symptom | Likely cause |
|---------|----------------|
| 502 from Apache | `npm run start` (or `dev`) not running, or wrong port in `ProxyPass` |
| Discord login fails | `NEXTAUTH_URL` or redirect URI mismatch with the URL in the browser |
| Not admin | Discord ID not in `ADMIN_DISCORD_IDS` (etc.); restart app after `.env` changes |
| Database errors | Wrong `DATABASE_URL` or migrations not applied |

For deeper troubleshooting, see [`INSTALLATION.md`](INSTALLATION.md).
