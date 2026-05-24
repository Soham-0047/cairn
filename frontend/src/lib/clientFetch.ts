"use client";
import { getGuestToken } from "./guest";

/**
 * Browser-side wrapper for /api/proxy/* calls. Auto-attaches the guest
 * token when the user is in guest mode. NextAuth session, when present,
 * is read server-side in the proxy route handler.
 */
export async function proxyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const guestToken = getGuestToken();
  const headers = new Headers(init.headers);
  // For FormData bodies, let the browser set the multipart Content-Type itself
  // so the boundary is correct. Only default to JSON for other body shapes.
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  if (guestToken) headers.set("X-Guest-Token", guestToken);
  return fetch(`/api/proxy${path}`, { ...init, headers });
}
