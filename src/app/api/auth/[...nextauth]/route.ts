import { Auth, skipCSRFCheck } from "@auth/core";
import { authOptions } from "@/auth";
import { handlers } from "@/auth";
import { NextRequest } from "next/server";

const basePath = (() => {
  try {
    const url = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
    if (!url) return "/api/auth";
    const pathname = new URL(url).pathname;
    return pathname === "/" ? "/api/auth" : pathname;
  } catch {
    return "/api/auth";
  }
})();

/** GET /api/auth/signin/:provider triggers "Unsupported action" in Auth.js default pages; forward as POST to perform OAuth redirect */
async function handleGetSignInWithProvider(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const match = pathname.match(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/signin/([^/]+)$`));
  if (!match) return null;
  const postRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
  });
  const config = {
    ...authOptions,
    basePath,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    skipCSRFCheck,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Auth() config with skipCSRFCheck
  const response = await Auth(postRequest, config as any);
  return response as Response;
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const signInRedirect = await handleGetSignInWithProvider(request);
  if (signInRedirect) return signInRedirect;
  return handlers.GET(request) as Promise<Response>;
}

export const { POST } = handlers;
