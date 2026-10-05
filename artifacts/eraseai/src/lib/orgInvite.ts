// Organization invite links look like <base>/org/join?token=…. The token is
// kept in sessionStorage so it survives signing up or a Google/Apple sign-in
// round trip, then cleared once the invite is accepted or dismissed.

const KEY = "eraseai.pendingOrgInvite";

export function capturePendingInvite(): string | null {
  if (typeof window === "undefined") return null;
  const { pathname, search } = window.location;
  if (/\/org\/join\/?$/.test(pathname)) {
    const token = new URLSearchParams(search).get("token");
    if (token) {
      try {
        sessionStorage.setItem(KEY, token);
      } catch {}
      // Drop the token from the address bar so it isn't left in history.
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      window.history.replaceState({}, "", `${base}/`);
      return token;
    }
  }
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

export function inviteUrl(invitePath: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}${invitePath}`;
}

export const ORG_PLAN_NAMES: Record<string, string> = {
  business: "Team",
  enterprise: "Enterprise",
};

export const ORG_ROLE_NAMES: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export async function orgApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}
