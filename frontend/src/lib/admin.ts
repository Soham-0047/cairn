/**
 * Admin client helpers. Stores the admin token in localStorage and attaches
 * it to all /api/admin-proxy/* calls.
 */

const TOKEN_KEY = "cairn_admin_token";

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export async function adminFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error("Not signed in to admin");
  const res = await fetch(`/api/admin-proxy${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const err = new Error(`Admin ${path} failed: ${res.status}`);
    (err as Error & { body?: unknown }).body = body;
    throw err;
  }
  return res.json() as Promise<T>;
}
