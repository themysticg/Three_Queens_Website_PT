import Link from "next/link";

const redirectUri =
  typeof process.env.NEXTAUTH_URL === "string"
    ? `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/api/auth/callback/discord`
    : "http://localhost:3000/api/auth/callback/discord";

const errorMessages: Record<string, string> = {
  Configuration:
    "There is a problem with the server configuration. Check that your Discord Client ID and Secret are set in .env and that the redirect URI in the Discord Developer Portal matches exactly.",
  AccessDenied: "Access denied. You may have cancelled the login or don't have permission.",
  Verification:
    "The sign-in link is invalid or has expired. Please try signing in again.",
  OAuthCallback:
    "Discord sign-in failed. The most common fix is to add the exact redirect URI below in the Discord Developer Portal (OAuth2 → Redirects).",
  OAuthCreateAccount: "Could not create your account. Please try again.",
  OAuthAccountNotLinked:
    "This Discord account is already linked to another sign-in method.",
  Default: "An error occurred during sign-in. Please try again.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ?? "Default";
  const message = errorMessages[error] ?? errorMessages.Default;
  const showRedirectHelp =
    error === "Configuration" || error === "OAuthCallback";

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Sign-in error
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">{message}</p>
        {showRedirectHelp && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-left">
            <p className="mb-2 font-medium text-amber-700 dark:text-amber-400">
              Add this Redirect URI in Discord Developer Portal
            </p>
            <p className="break-all font-mono text-sm text-zinc-700 dark:text-zinc-300">
              {redirectUri}
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Go to{" "}
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 underline dark:text-amber-400"
              >
                discord.com/developers/applications
              </a>
              , select your app → OAuth2 → Redirects → Add the URL above.
            </p>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/api/auth/signin/discord"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#5865f2] px-5 py-2.5 font-semibold text-white transition hover:bg-[#4752c4]"
          >
            Try again
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-zinc-100 px-5 py-2.5 font-medium text-zinc-800 transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200 dark:hover:border-zinc-800"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
