// Route prefixes that bypass session authentication in authMiddleware.
// /api/mobile/health and /api/billing/pricing are intentionally public so Android
// can check backend reachability and show plan prices before/during sign-in.
// /api/org/invite-preview lets the join page name the organization before the
// invited person signs in (it needs the invite token). /api/org/enroll is
// called by managed browsers with their organization's enrollment token.
export const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/api/mobile-auth/",
  "/api/mobile/health",
  "/api/mobile/play/products",
  "/api/healthz",
  "/api/billing/webhook",
  "/api/billing/pricing",
  "/api/v1/",
  "/api/public/",
  "/api/contact",
  "/api/account/deletion-request",
  "/api/extension/",
  "/api/org/invite-preview",
  "/api/org/enroll",
];

export function isPublicRoute(path: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}