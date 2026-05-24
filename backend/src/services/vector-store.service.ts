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
let client: QdrantClient | null = null;
let ensured = false;
let ensurePromise: Promise<void> | null = null;

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
