import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";

const fullAdminIds = (process.env.ADMIN_DISCORD_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const teamAdminIds = (process.env.TEAM_ADMIN_DISCORD_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const jobsAdminIds = (process.env.JOBS_ADMIN_DISCORD_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const rulesAdminIds = (process.env.RULES_ADMIN_DISCORD_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

/** Sync check from .env only (used when prisma not needed). */
function getAdminTypeFromEnv(discordId: string): "team" | "jobs" | "full" | "rules" | null {
  if (fullAdminIds.includes(discordId)) return "full";
  if (teamAdminIds.includes(discordId)) return "team";
  if (jobsAdminIds.includes(discordId)) return "jobs";
  if (rulesAdminIds.includes(discordId)) return "rules";
  return null;
}

/** Full check: .env first, then site-added members in DB. */
export async function getAdminType(discordId: string): Promise<"team" | "jobs" | "full" | "rules" | null> {
  const fromEnv = getAdminTypeFromEnv(discordId);
  if (fromEnv) return fromEnv;
  try {
    const siteMember = await prisma.siteMember.findUnique({
      where: { discordId: discordId.trim() },
    });
    if (
      siteMember &&
      (siteMember.adminType === "full" ||
        siteMember.adminType === "team" ||
        siteMember.adminType === "jobs" ||
        siteMember.adminType === "rules")
    ) {
      return siteMember.adminType as "full" | "team" | "jobs" | "rules";
    }
  } catch (e) {
    console.error("[auth] getAdminType DB lookup error:", e);
  }
  return null;
}

/** Auth config exported for use in route handler (GET signin with provider redirect) */
export const authOptions = {
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: { scope: "identify email" },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: { user: any; account: any; profile: any }) {
      if (!account?.providerAccountId) return true;
      const discordId = account.providerAccountId;
      try {
        const existing = await prisma.user.findUnique({
          where: { discordId },
        });
        const adminType = await getAdminType(discordId);
        const isAdmin = adminType !== null;
        if (existing) {
          await prisma.user.update({
            where: { discordId },
            data: {
              username: (profile as { username?: string })?.username ?? user.name ?? "",
              avatar: user.image ?? null,
              email: user.email ?? null,
              isAdmin,
              adminType,
            },
          });
        } else {
          await prisma.user.create({
            data: {
              discordId,
              username: (profile as { username?: string })?.username ?? user.name ?? "Unknown",
              avatar: user.image ?? null,
              email: user.email ?? null,
              isAdmin,
              adminType,
            },
          });
        }
      } catch (e) {
        console.error("[auth] signIn callback error (user still allowed in):", e);
        // Don't block login if DB fails — allow sign-in and session will have minimal data
      }
      return true;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (!session?.user || !token?.sub) return session;
      const discordId = String(token.sub).trim();
      // Always set discordId so API can resolve user if id is missing (e.g. after DB was briefly unavailable)
      (session.user as { discordId: string }).discordId = discordId;
      try {
        let u = await prisma.user.findUnique({
          where: { discordId },
        });
        // If user missing (e.g. signIn DB failed or race), create so session.user.id is set
        if (!u) {
          const adminType = await getAdminType(discordId);
          try {
            u = await prisma.user.create({
              data: {
                discordId,
                username: (session.user as { name?: string }).name ?? "User",
                avatar: (session.user as { image?: string | null }).image ?? null,
                email: (session.user as { email?: string | null }).email ?? null,
                isAdmin: adminType !== null,
                adminType,
              },
            });
          } catch (createErr: unknown) {
            // Race: another request may have created the user
            const existing = await prisma.user.findUnique({ where: { discordId } });
            if (existing) u = existing;
            else throw createErr;
          }
        }
        if (!u) return session;
        (session.user as { id: string }).id = u.id;
        (session.user as { discordId: string }).discordId = u.discordId;
        // Admin status is re-read from .env + site members so it updates without re-sign-in
        const adminTypeFromEnv = await getAdminType(discordId);
        (session.user as { isAdmin: boolean }).isAdmin = adminTypeFromEnv !== null;
        (session.user as { adminType: string | null }).adminType = adminTypeFromEnv;
        (session.user as { image?: string | null }).image = u.avatar ?? (session.user as { image?: string }).image;
      } catch (e) {
        console.error("[auth] session callback error:", e);
      }
      return session;
    },
    async jwt({ token, account }: { token: any; account: any; profile?: any }) {
      if (account?.providerAccountId) token.sub = account.providerAccountId;
      return token;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  trustHost: true,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions as NextAuthConfig);

/** Result of resolving the current user from session. */
export type ResolveUserIdResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "no_session" }
  | { ok: false; reason: "database" };

/** For API routes: get current user id from session, or find/create by discordId if id was missing. */
export async function resolveSessionUserId(session: { user?: { id?: string; discordId?: string; name?: string | null; image?: string | null; email?: string | null } } | null): Promise<ResolveUserIdResult> {
  if (!session?.user) return { ok: false, reason: "no_session" };
  if (session.user.id) return { ok: true, userId: session.user.id };
  const discordId = (session.user as { discordId?: string }).discordId;
  if (!discordId) return { ok: false, reason: "no_session" };
  try {
    let u = await prisma.user.findUnique({ where: { discordId } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          discordId,
          username: session.user.name ?? "User",
          avatar: session.user.image ?? null,
          email: session.user.email ?? null,
          isAdmin: false,
          adminType: null,
        },
      });
    }
    return { ok: true, userId: u.id };
  } catch {
    return { ok: false, reason: "database" };
  }
}

/** Helper: return 401 or 503 JSON response from resolveSessionUserId result. Use in API routes. Call only when !result.ok. */
export function unauthorizedOrDatabaseError(result: ResolveUserIdResult): Response {
  if (result.ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (result.reason === "database") {
    return Response.json(
      {
        error:
          "Database unavailable. Set DATABASE_URL to a PostgreSQL connection string (e.g. Vercel Postgres) in your environment variables.",
      },
      { status: 503 }
    );
  }
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
