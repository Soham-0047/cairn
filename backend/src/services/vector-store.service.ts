import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface SimilarPath {
  pathId: string;
  score: number;
  goal: string;
  skills: string[];
  level: string;
  weeklyOutcomes?: string;
  completedAt?: string;
}

const VECTOR_SIZE = 768; // text-embedding-004
const FINGERPRINTS_COLLECTION = "cairn_tutorial_fingerprints";
let client: QdrantClient | null = null;
let ensured = false;
let ensurePromise: Promise<void> | null = null;
let fingerprintsEnsured = false;
let fingerprintsEnsurePromise: Promise<void> | null = null;

function configured(): boolean {
  return !!(env.QDRANT_URL && env.QDRANT_API_KEY);
}

function getClient(): QdrantClient | null {
  if (!configured()) return null;
  if (!client) {
    client = new QdrantClient({
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY,
    });
  }
  return client;
}

async function ensureCollection(): Promise<void> {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  const c = getClient();
  if (!c) return;
  // Build the promise eagerly so concurrent callers see a non-null
  // `ensurePromise` and join the in-flight init instead of racing a second
  // createCollection request.
  const p = (async () => {
    try {
      await c.getCollection(env.QDRANT_COLLECTION);
      ensured = true;
    } catch {
      try {
        await c.createCollection(env.QDRANT_COLLECTION, {
          vectors: { size: VECTOR_SIZE, distance: "Cosine" },
        });
        logger.info(
          { collection: env.QDRANT_COLLECTION, size: VECTOR_SIZE },
          "Created Qdrant collection",
        );
        ensured = true;
      } catch (err) {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          "Could not create Qdrant collection — vector recall disabled this run",
        );
      }
    } finally {
      ensurePromise = null;
    }
  })();
  ensurePromise = p;
  return p;
}

/**
 * Convert a Mongo ObjectId hex string into a deterministic UUID Qdrant accepts.
 * Qdrant point IDs must be either an unsigned integer or a UUID; a 24-hex Mongo
 * id is neither, so we pad it to 32 hex chars and format with hyphens.
 */
function pathIdToPointId(pathId: string): string {
  const hex = pathId.replace(/-/g, "").toLowerCase().padEnd(32, "0").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function upsertPath(
  pathId: string,
  embedding: number[],
  metadata: Record<string, unknown>,
): Promise<void> {
  const c = getClient();
  if (!c) return;
  await ensureCollection();
  if (!ensured) return;
  try {
    await c.upsert(env.QDRANT_COLLECTION, {
      wait: false,
      points: [
        {
          id: pathIdToPointId(pathId),
          vector: embedding,
          payload: { pathId, ...metadata },
        },
      ],
    });
    logger.info({ pathId, collection: env.QDRANT_COLLECTION }, "Upserted path to Qdrant");
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), pathId },
      "Qdrant upsert failed",
    );
  }
}

async function ensureFingerprintsCollection(): Promise<void> {
  if (fingerprintsEnsured) return;
  if (fingerprintsEnsurePromise) return fingerprintsEnsurePromise;
  const c = getClient();
  if (!c) return;
  const p = (async () => {
    try {
      await c.getCollection(FINGERPRINTS_COLLECTION);
      fingerprintsEnsured = true;
    } catch {
      try {
        await c.createCollection(FINGERPRINTS_COLLECTION, {
          vectors: { size: VECTOR_SIZE, distance: "Cosine" },
        });
        logger.info(
          { collection: FINGERPRINTS_COLLECTION, size: VECTOR_SIZE },
          "Created Qdrant fingerprints collection",
        );
        fingerprintsEnsured = true;
      } catch (err) {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          "Could not create fingerprints collection — originality check degraded",
        );
      }
    } finally {
      fingerprintsEnsurePromise = null;
    }
  })();
  fingerprintsEnsurePromise = p;
  return p;
}

export interface FingerprintMatch {
  id: string;
  score: number;
  sourceUrl: string;
  label: string;
}

function fingerprintIdToPointId(id: string): string {
  // Same hex padding trick as path IDs — Qdrant insists on UUID or uint.
  const hex = id.replace(/-/g, "").toLowerCase().padEnd(32, "0").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function upsertFingerprint(
  id: string,
  embedding: number[],
  metadata: { sourceUrl: string; label: string },
): Promise<boolean> {
  const c = getClient();
  if (!c) return false;
  await ensureFingerprintsCollection();
  if (!fingerprintsEnsured) return false;
  try {
    await c.upsert(FINGERPRINTS_COLLECTION, {
      wait: false,
      points: [
        {
          id: fingerprintIdToPointId(id),
          vector: embedding,
          payload: { sourceUrl: metadata.sourceUrl, label: metadata.label },
        },
      ],
    });
    return true;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), id },
      "Fingerprint upsert failed",
    );
    return false;
  }
}

/** Search the fingerprints collection for code patterns similar to the embedding. */
export async function findSimilarFingerprints(
  embedding: number[],
  topK = 5,
): Promise<FingerprintMatch[]> {
  const c = getClient();
  if (!c) return [];
  await ensureFingerprintsCollection();
  if (!fingerprintsEnsured) return [];
  try {
    const res = await c.search(FINGERPRINTS_COLLECTION, {
      vector: embedding,
      limit: topK,
      with_payload: true,
    });
    return (res || []).map((hit) => {
      const payload = (hit.payload || {}) as Record<string, unknown>;
      return {
        id: String(hit.id),
        score: typeof hit.score === "number" ? hit.score : 0,
        sourceUrl: typeof payload.sourceUrl === "string" ? payload.sourceUrl : "",
        label: typeof payload.label === "string" ? payload.label : "",
      };
    });
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Fingerprint search failed",
    );
    return [];
  }
}

export async function findSimilarPaths(
  embedding: number[],
  topK = 3,
): Promise<SimilarPath[]> {
  const c = getClient();
  if (!c) return [];
  await ensureCollection();
  if (!ensured) return [];
  try {
    const res = await c.search(env.QDRANT_COLLECTION, {
      vector: embedding,
      limit: topK,
      with_payload: true,
    });
    return (res || []).map((hit) => {
      const payload = (hit.payload || {}) as Record<string, unknown>;
      return {
        pathId: typeof payload.pathId === "string" ? payload.pathId : String(hit.id),
        score: typeof hit.score === "number" ? hit.score : 0,
        goal: typeof payload.goal === "string" ? payload.goal : "",
        skills: Array.isArray(payload.skills) ? (payload.skills as string[]) : [],
        level: typeof payload.level === "string" ? payload.level : "",
        weeklyOutcomes:
          typeof payload.weeklyOutcomes === "string" ? payload.weeklyOutcomes : undefined,
        completedAt:
          typeof payload.completedAt === "string" ? payload.completedAt : undefined,
      };
    });
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Qdrant search failed — similar learners block omitted",
    );
    return [];
  }
}
