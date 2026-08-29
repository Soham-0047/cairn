import { fetchRouteCandidates, isEnabled as adminEnabled, type RouteCandidate } from "../services/admin-client.js";
import { logger } from "../utils/logger.js";
import type { ChainEntry } from "./router.js";

/**
 * Turns a static task chain into the order this particular call should try,
 * using live health from the admin-service.
 *
 * The two inputs answer different questions and neither replaces the other:
 *
 *   - The static chain (llm/router.ts) encodes **task fitness** — which models
 *     are actually good at this job, hand-ordered. That knowledge is not
 *     something a health endpoint can supply.
 *   - The admin-service supplies **current health** — which keys and models are
 *     rate-limited, erroring or exhausted right now, aggregated across every
 *     project drawing on the same free-tier pool.
 *
 * So fitness sets the candidate set, and health reorders within it.
 *
 * ## Why Power-of-Two-Choices rather than "best first"
 *
 * Strict best-first routing is the reason free tiers collapse: every instance
 * computes the same ranking, sends everything to the same model, exhausts it,
 * then moves as one to the next. The pool is used serially even though the
 * quota is parallel.
 *
 * P2C samples two candidates from the comparable head and takes the healthier.
 * Load spreads across the head without ever picking something bad — a
 * well-known result from load balancing, and it fits here because the head of
 * a chain is by construction a set of models that are close enough in quality
 * that either is an acceptable answer.
 *
 * Failure is unchanged: whatever P2C picks first, the rest of the chain still
 * follows in fitness order, so a wrong guess costs one hop.
 */

/** How many leading chain entries count as "comparable" for sampling. */
const HEAD_SIZE = 3;
/** Below this health score a candidate is moved behind healthier ones. */
const UNHEALTHY = 0.35;

export type ResolvedChain = {
  chain: ChainEntry[];
  /** (provider, model) → credential id, for reporting the outcome back. */
  credentialIds: Map<string, string>;
  source: "admin-service" | "static";
};

function keyOf(provider: string, model: string): string {
  return `${provider}::${model}`;
}

export async function resolveChain(staticChain: ChainEntry[]): Promise<ResolvedChain> {
  if (!adminEnabled() || staticChain.length === 0) {
    return { chain: [...staticChain], credentialIds: new Map(), source: "static" };
  }

  let candidates: RouteCandidate[] = [];
  try {
    candidates = await fetchRouteCandidates("llm");
  } catch {
    candidates = [];
  }
  return orderChain(staticChain, candidates);
}

/**
 * The ordering itself, separated from fetching so it can be tested without a
 * network. `pick` is the sampler: injectable so a test can make the
 * Power-of-Two-Choices draw deterministic.
 */
export function orderChain(
  staticChain: ChainEntry[],
  candidates: RouteCandidate[],
  pick: (n: number) => number = (n) => Math.floor(Math.random() * n),
): ResolvedChain {
  if (candidates.length === 0 || staticChain.length === 0) {
    return { chain: [...staticChain], credentialIds: new Map(), source: "static" };
  }

  // Best candidate per (provider, model) — the service may return several keys
  // for the same model, and the healthiest one is the one worth trying.
  const best = new Map<string, RouteCandidate>();
  for (const c of candidates) {
    const k = keyOf(c.provider, c.model);
    const cur = best.get(k);
    if (!cur || c.health > cur.health || (c.health === cur.health && c.priority < cur.priority)) {
      best.set(k, c);
    }
  }

  const credentialIds = new Map<string, string>();
  for (const [k, c] of best) credentialIds.set(k, c.id);

  const healthOf = (e: ChainEntry): number => {
    const c = best.get(keyOf(e.provider, e.model));
    // An entry the service does not know about is neither promoted nor
    // demoted — it keeps its hand-ordered position via a neutral score.
    return c ? c.health : 0.7;
  };

  const head = staticChain.slice(0, HEAD_SIZE);
  const tail = staticChain.slice(HEAD_SIZE);

  // Power-of-two-choices over the head.
  let ordered: ChainEntry[];
  if (head.length <= 1) {
    ordered = [...head];
  } else {
    const i = pick(head.length);
    let j = pick(head.length - 1);
    if (j >= i) j++;
    const a = head[i]!;
    const b = head[j]!;
    const winner = healthOf(a) >= healthOf(b) ? a : b;
    ordered = [winner, ...head.filter((e) => e !== winner)];
  }

  // Anything the service reports as clearly unhealthy sinks to the back of its
  // own segment rather than being dropped. Dropping it would leave the chain
  // shorter than the operator configured, and a stale health signal would then
  // remove a working model outright.
  const demote = (arr: ChainEntry[]) => {
    const healthy = arr.filter((e) => healthOf(e) >= UNHEALTHY);
    const sick = arr.filter((e) => healthOf(e) < UNHEALTHY);
    return [...healthy, ...sick];
  };

  const chain = [...demote(ordered), ...demote(tail)];

  // Healthy models the service knows about that this task's chain never
  // mentions, appended last. A model added in the admin panel is reachable as
  // a last resort without a code change, but never displaces a hand-picked one.
  const inChain = new Set(chain.map((e) => keyOf(e.provider, e.model)));
  const extras = [...best.values()]
    .filter((c) => !inChain.has(keyOf(c.provider, c.model)) && c.health >= 0.8)
    .sort((a, b) => b.health - a.health || a.priority - b.priority)
    .slice(0, 3)
    .map((c) => ({ provider: c.provider, model: c.model }));

  logger.debug(
    { head: chain.slice(0, 3).map((e) => `${e.provider}/${e.model}`), extras: extras.length },
    "routeSource: chain resolved from live health",
  );

  return { chain: [...chain, ...extras], credentialIds, source: "admin-service" };
}
