import { ApiCredential, ApiCredentialDoc } from "../models/ApiCredential.js";
import { decryptSecret, encryptSecret } from "../utils/crypto.js";
import { logger } from "../utils/logger.js";

/**
 * In-memory pool of API credentials, fronted by the ApiCredential collection.
 *
 * Responsibilities:
 *  - Cache decrypted keys per service for fast invocation paths
 *  - Track per-credential throttles independently from provider-level throttles
 *  - Pick the highest-priority, non-throttled key when a provider asks
 *  - Persist success/failure counters so admins can see which keys are flaky
 *
 * The router still tracks provider-level throttles (in router.ts); this store
 * adds a finer-grained, per-key layer underneath. When ALL keys for a service
 * are throttled, the provider gives up and the router moves to the next link
 * in the chain.
 */

type Candidate = {
  id: string;
  service: string;
  label: string;
  key: string;
  metadata: Record<string, unknown>;
  priority: number;
};

type Throttle = { until: number; reason: string };

class CredentialStore {
  private byService = new Map<string, Candidate[]>();
  private throttleByCredId = new Map<string, Throttle>();
  private loaded = false;
  private loading: Promise<void> | null = null;

  /** Load (or reload) the cache from Mongo. Idempotent. */
  async reload(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const docs = await ApiCredential.find({ enabled: true })
          .sort({ priority: 1, createdAt: 1 })
          .lean();
        const next = new Map<string, Candidate[]>();
        for (const d of docs) {
          let key: string;
          try {
            key = decryptSecret(d.secret as { ciphertext: string; iv: string; authTag: string });
          } catch (err) {
            logger.warn(
              { credId: String(d._id), service: d.service, err: (err as Error).message },
              "Failed to decrypt credential — skipping (likely encrypted under a different JWT_SECRET)",
            );
            continue;
          }
          const c: Candidate = {
            id: String(d._id),
            service: d.service,
            label: d.label,
            key,
            metadata: (d.metadata as Record<string, unknown>) || {},
            priority: d.priority ?? 100,
          };
          const arr = next.get(d.service) || [];
          arr.push(c);
          next.set(d.service, arr);
        }
        this.byService = next;
        this.loaded = true;
        logger.info(
          {
            services: Object.fromEntries(
              Array.from(this.byService.entries()).map(([k, v]) => [k, v.length]),
            ),
          },
          "CredentialStore loaded",
        );
      } catch (err) {
        logger.error({ err }, "CredentialStore reload failed");
        // Don't poison the cache on error.
      } finally {
        this.loading = null;
      }
    })();
    return this.loading;
  }

  /** Synchronous read: has this service got at least one currently-usable key? */
  hasUsable(service: string): boolean {
    const arr = this.byService.get(service.toLowerCase());
    if (!arr || arr.length === 0) return false;
    return arr.some((c) => !this.isThrottled(c.id));
  }

  /** Ordered list of usable candidates for a service. Empty if none. */
  candidatesFor(service: string): Candidate[] {
    const arr = this.byService.get(service.toLowerCase()) || [];
    return arr.filter((c) => !this.isThrottled(c.id));
  }

  isThrottled(credId: string): boolean {
    const t = this.throttleByCredId.get(credId);
    if (!t) return false;
    if (Date.now() > t.until) {
      this.throttleByCredId.delete(credId);
      return false;
    }
    return true;
  }

  throttle(credId: string, retryAfterSec: number, reason: string): void {
    this.throttleByCredId.set(credId, {
      until: Date.now() + retryAfterSec * 1000,
      reason,
    });
  }

  /**
   * Clear credential-level throttles. Pass a service name to clear only that
   * service's credentials, or omit to clear everything. Returns the count of
   * throttles cleared. Used by the admin "reset throttles" action so a
   * misfiring key doesn't sit locked out for the full hour.
   */
  clearThrottles(service?: string): number {
    if (!service) {
      const n = this.throttleByCredId.size;
      this.throttleByCredId.clear();
      return n;
    }
    const ids = new Set(
      (this.byService.get(service.toLowerCase()) || []).map((c) => c.id),
    );
    let n = 0;
    for (const id of ids) {
      if (this.throttleByCredId.delete(id)) n++;
    }
    return n;
  }

  async markSuccess(credId: string): Promise<void> {
    try {
      await ApiCredential.updateOne(
        { _id: credId },
        { $inc: { successCount: 1 }, $set: { lastUsedAt: new Date() } },
      );
    } catch {
      // Telemetry write — non-fatal.
    }
  }

  async markFailure(credId: string, reason: string): Promise<void> {
    try {
      await ApiCredential.updateOne(
        { _id: credId },
        {
          $inc: { failureCount: 1 },
          $set: { lastFailureAt: new Date(), lastFailureReason: reason.slice(0, 300) },
        },
      );
    } catch {
      // Telemetry write — non-fatal.
    }
  }

  /** Admin-side snapshot — never includes plaintext keys. */
  snapshot(): Array<{ service: string; count: number; throttled: number }> {
    const out: Array<{ service: string; count: number; throttled: number }> = [];
    for (const [service, arr] of this.byService.entries()) {
      out.push({
        service,
        count: arr.length,
        throttled: arr.filter((c) => this.isThrottled(c.id)).length,
      });
    }
    return out;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Idempotently seed a credential. Used at boot to import env-keyed entries
   * into the vault so the system works on a fresh database.
   */
  async seedFromEnv(params: {
    service: string;
    kind: ApiCredentialDoc["kind"];
    label: string;
    apiKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!params.apiKey) return;
    const existing = await ApiCredential.findOne({
      service: params.service.toLowerCase(),
      source: "env",
    });
    const enc = encryptSecret(params.apiKey);
    if (existing) {
      // Refresh the encrypted blob in case the env key changed.
      existing.secret = enc;
      existing.label = params.label;
      existing.kind = params.kind;
      existing.metadata = params.metadata || existing.metadata;
      existing.keyHint = params.apiKey.slice(-4);
      await existing.save();
      return;
    }
    await ApiCredential.create({
      service: params.service.toLowerCase(),
      kind: params.kind,
      label: params.label,
      secret: enc,
      keyHint: params.apiKey.slice(-4),
      metadata: params.metadata || {},
      priority: 1000, // env-seeded keys sit below admin-added keys by default
      source: "env",
    });
  }
}

let _store: CredentialStore | null = null;

export function getCredentialStore(): CredentialStore {
  if (!_store) _store = new CredentialStore();
  return _store;
}
