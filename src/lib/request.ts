export function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const candidate = forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || "";

  if (!candidate) return null;
  return candidate.slice(0, 100);
}
