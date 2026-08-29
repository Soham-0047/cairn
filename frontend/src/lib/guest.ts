"use client";
import { useSyncExternalStore } from "react";

/**
 * Guest session state.
 *
 * Lives in localStorage, but is exposed as a subscribable store rather than as
 * bare reads. The reason: starting a session has to re-render whatever is on
 * screen. Reading localStorage once in a mount effect cannot do that — if the
 * component that starts the session is the same one gated on it (the guest
 * button inside the onboarding gate), `router.push` to the current route never
 * remounts, so the gate stays up and the button spins forever.
 *
 * Two auth paths coexist:
 *   - Real user: NextAuth session, backend JWT in session.backendToken
 *   - Guest:     no NextAuth session, token stored here
 *
 * The proxy route picks whichever is present.
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

export type GuestState = {
  token: string | null;
  meta: GuestMeta | null;
};

const EMPTY: GuestState = { token: null, meta: null };

/**
 * Cached so `getSnapshot` returns a stable reference between changes —
 * useSyncExternalStore re-renders in a loop otherwise.
 */
let snapshot: GuestState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): GuestState {
  if (typeof window === "undefined") return EMPTY;
  let token: string | null = null;
  let meta: GuestMeta | null = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(META_KEY);
    if (raw) meta = JSON.parse(raw) as GuestMeta;
  } catch {
    // Private mode, disabled storage, or a corrupt value. Treat as no session
    // rather than throwing on every read.
    return EMPTY;
  }
  if (!token) return EMPTY;
  // An expired session is the same as none, and is cleaned up on sight so the
  // stale token is never attached to a request.
  if (meta && new Date(meta.expiresAt).getTime() < Date.now()) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(META_KEY);
    } catch {
      /* nothing to do */
    }
    return EMPTY;
  }
  return { token, meta };
}

function emit(): void {
  const next = readStorage();
  const changed = next.token !== snapshot.token || next.meta?.expiresAt !== snapshot.meta?.expiresAt;
  if (changed) snapshot = next;
  hydrated = true;
  for (const l of listeners) l();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!hydrated) emit();
  // Keeps tabs in sync: signing out of guest mode in one tab drops the others.
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY || e.key === META_KEY || e.key === null) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Reactive guest state. `pending` is true only during the first client render,
 * before storage has been read — render a neutral state then, or a signed-out
 * flash appears for anyone who is actually a guest.
 */
export function useGuest(): GuestState & { isGuest: boolean; pending: boolean } {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
  return { ...state, isGuest: !!state.token, pending: !hydrated };
}

/* ----------------------- imperative reads and writes ----------------------- */

export function getGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  // Always re-reads: proxyFetch calls this outside React, where the cached
  // snapshot may predate a session started moments ago.
  return readStorage().token;
}

export function getGuestMeta(): GuestMeta | null {
  if (typeof window === "undefined") return null;
  return readStorage().meta;
}

export function setGuest(token: string, meta: GuestMeta): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Storage unavailable — the caller still gets its meta back and the
    // session works until reload, which beats failing outright.
  }
  emit();
}

export function clearGuest(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(META_KEY);
  } catch {
    /* nothing to do */
  }
  emit();
}

export async function startGuestSession(): Promise<GuestMeta> {
  const res = await fetch("/api/guest-start", { method: "POST" });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    throw new Error(
      (typeof data.error === "string" && data.error) ||
        (typeof data.message === "string" && data.message) ||
        `Could not start guest session (${res.status})`,
    );
  }
  if (!data?.token || !data?.user) {
    throw new Error("The server did not return a guest session.");
  }
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
