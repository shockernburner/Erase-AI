// Route prefixes that bypass session authentication in authMiddleware.
// /api/mobile/health is intentionally public so Android can check backend reachability before sign-in.
export const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/api/mobile-auth/",
  "/api/mobile/health",
  "/api/healthz",
  "/api/billing/webhook",
  "/api/v1/",
  "/api/public/",
  "/api/contact",
  "/api/extension/",
];

export function isPublicRoute(path: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}