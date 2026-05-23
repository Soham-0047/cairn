import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * HTTP client for the standalone admin-service. Hits /public/* endpoints with
 * the service token. Caches responses in-memory with a TTL so hot paths
 * (credential lookups during LLM calls) don't fan out to the network.
 *
 * Safe to import even when the admin-service is disabled — `isEnabled()`
 * returns false and consumers fall back to their existing local data sources.
 */

export type PublicCredential = {
  id: string;
  label: string;
  key: string;
  metadata: Record<string, unknown>;
  priority: number;
};

type CredsResponse = {
  services: Record<string, PublicCredential[]>;
  fetchedAt: string;
};

type CacheEntry<T> = { value: T; expiresAt: number };

const TTL_MS = () => env.ADMIN_SERVICE_TTL_SEC * 1000;

let credentialsCache: CacheEntry<CredsResponse["services"]> | null = null;
let configCache: CacheEntry<unknown> | null = null;
let inflightCredentials: Promise<CredsResponse["services"]> | null = null;

export function isEnabled(): boolean {
  return !!env.ADMIN_SERVICE_ENABLED && !!env.ADMIN_SERVICE_URL && !!env.ADMIN_SERVICE_TOKEN;
}

function url(path: string): string {
  return `${env.ADMIN_SERVICE_URL.replace(/\/$/, "")}${path}`;
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.ADMIN_SERVICE_TOKEN}`,
      ...(init.headers || {}),
    },
  });
}

export async function fetchCredentials(force = false): Promise<CredsResponse["services"]> {
  if (!isEnabled()) return {};
  if (!force && credentialsCache && credentialsCache.expiresAt > Date.now()) {
    return credentialsCache.value;
  }
  if (inflightCredentials) return inflightCredentials;

  inflightCredentials = (async () => {
    try {
      const r = await authedFetch("/public/credentials");
      if (!r.ok) {
        throw new Error(`admin-service /public/credentials → ${r.status}`);
      }
      const json = (await r.json()) as CredsResponse;
      credentialsCache = {
        value: json.services,
        expiresAt: Date.now() + TTL_MS(),
      };
      logger.info(
        { services: Object.keys(json.services).length },
        "admin-client: refreshed credentials",
      );
      return json.services;
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        "admin-client: credential refresh failed; serving stale cache if any",
      );
      // Keep the stale cache rather than wiping it — short outages shouldn't
      // brick consumer LLM calls.
      return credentialsCache?.value || {};
    } finally {
      inflightCredentials = null;
    }
  })();
  return inflightCredentials;
}

export async function fetchSiteConfig<T = unknown>(force = false): Promise<T | null> {
  if (!isEnabled()) return null;
  if (!force && configCache && configCache.expiresAt > Date.now()) {
    return configCache.value as T;
  }
  try {
    const r = await authedFetch(`/public/config?key=${encodeURIComponent(env.ADMIN_SERVICE_PRODUCT_KEY)}`);
    if (!r.ok) throw new Error(`/public/config → ${r.status}`);
    const json = await r.json();
    configCache = { value: json, expiresAt: Date.now() + TTL_MS() };
    return json as T;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "admin-client: site-config refresh failed");
    return (configCache?.value as T) ?? null;
  }
}

// Best-effort telemetry write — fires-and-forgets so it never blocks the
// caller's hot path.
export function reportCredentialResult(id: string, ok: boolean, reason = ""): void {
  if (!isEnabled()) return;
  authedFetch(`/public/credentials/${id}/report`, {
    method: "POST",
    body: JSON.stringify({ ok, reason }),
  }).catch(() => {});
}

/** Probe the admin-service is reachable at boot. */
export async function ping(): Promise<{ ok: boolean; detail?: string }> {
  if (!isEnabled()) return { ok: false, detail: "disabled" };
  try {
    const r = await authedFetch("/public/check");
    if (!r.ok) return { ok: false, detail: `status ${r.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}
