// Route prefixes that bypass session authentication in authMiddleware.
// /api/mobile/health and /api/billing/pricing are intentionally public so Android
// can check backend reachability and show plan prices before/during sign-in.
export const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/api/mobile-auth/",
  "/api/mobile/health",
  "/api/healthz",
  "/api/billing/webhook",
  "/api/billing/pricing",
  "/api/v1/",
  "/api/public/",
  "/api/contact",
  "/api/account/deletion-request",
  "/api/extension/",
];

export function isPublicRoute(path: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}