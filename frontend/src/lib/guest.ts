"use client";

/**
 * Guest session helpers. Lives entirely in the browser; the proxy route
 * forwards the guest JWT to the backend as Authorization: Bearer <token>.
 *
 * Two auth paths coexist:
 *   - Real user: NextAuth session, backend JWT in session.backendToken
 *   - Guest:     no NextAuth session, token stored here in localStorage
 *
 * The unified `getAuthHeaders` in proxy chooses based on what's available.
 */

const TOKEN_KEY = "cairn_guest_token";
const META_KEY = "cairn_guest_meta";

export type GuestMeta = {
  id: string;
  handle: string;
  name: string;
  expiresAt: string;
  limits: {
    maxPathsPerGuest: number;
    maxEvalsPerGuest: number;
    allowScreenshots: boolean;
    sessionHours: number;
  };
};

export function getGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t) return null;
  const meta = getGuestMeta();
  if (meta && new Date(meta.expiresAt) < new Date()) {
    clearGuest();
    return null;
  }
  return t;
}

export function getGuestMeta(): GuestMeta | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestMeta;
  } catch {
    return null;
  }
}

export function setGuest(token: string, meta: GuestMeta): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

export function clearGuest(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(META_KEY);
}

export async function startGuestSession(): Promise<GuestMeta> {
  const res = await fetch("/api/guest-start", { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Could not start guest session");
  }
  const data = await res.json();
  const meta: GuestMeta = {
    id: data.user.id,
    handle: data.user.handle,
    name: data.user.name,
    expiresAt: data.user.guestExpiresAt,
    limits: data.limits,
  };
  setGuest(data.token, meta);
  return meta;
}
