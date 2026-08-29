import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { orderChain } from "./routeSource.js";
import type { RouteCandidate } from "../services/admin-client.js";

/**
 * The ordering has to hold two properties at once that pull against each
 * other: spread load across the healthy head (or the free tier collapses), and
 * never actually pick something known to be broken. These pin both, plus the
 * invariant that matters most operationally — the chain the operator
 * configured never gets shorter.
 */

const chain = [
  { provider: "google", model: "a" },
  { provider: "google", model: "b" },
  { provider: "google", model: "c" },
  { provider: "openrouter", model: "d" },
  { provider: "groq", model: "e" },
];

const cand = (
  provider: string,
  model: string,
  health: number,
  id = `${provider}-${model}`,
): RouteCandidate => ({
  id,
  provider,
  model,
  apiKey: "k",
  health,
  priority: 100,
  metadata: {},
});

const names = (r: { chain: { provider: string; model: string }[] }) =>
  r.chain.map((e) => e.model);

describe("orderChain", () => {
  test("falls back to the configured order when there is no health data", () => {
    const r = orderChain(chain, []);
    assert.equal(r.source, "static");
    assert.deepEqual(names(r), ["a", "b", "c", "d", "e"]);
  });

  test("never drops a configured entry", () => {
    const all = chain.map((e) => cand(e.provider, e.model, 0.01));
    const r = orderChain(chain, all, () => 0);
    for (const e of chain) {
      assert.ok(
        r.chain.some((x) => x.provider === e.provider && x.model === e.model),
        `${e.model} was dropped`,
      );
    }
  });

  test("power-of-two picks the healthier of the two it sampled", () => {
    const candidates = [
      cand("google", "a", 0.1),
      cand("google", "b", 0.9),
      cand("google", "c", 0.5),
    ];
    // pick(3) → 0 selects "a"; pick(2) → 0 then shifts past i to select "b".
    const r = orderChain(chain, candidates, () => 0);
    assert.equal(names(r)[0], "b", "should have chosen the healthier sample");
  });

  test("a sampled pair of equal health keeps the configured leader", () => {
    const candidates = [cand("google", "a", 0.8), cand("google", "b", 0.8)];
    const r = orderChain(chain, candidates, () => 0);
    assert.equal(names(r)[0], "a");
  });

  test("spreads across the head over many draws rather than always picking one", () => {
    const candidates = [
      cand("google", "a", 0.8),
      cand("google", "b", 0.8),
      cand("google", "c", 0.8),
    ];
    const leaders = new Set<string>();
    for (let i = 0; i < 200; i++) leaders.add(names(orderChain(chain, candidates))[0]!);
    assert.ok(leaders.size > 1, `only ever picked ${[...leaders]} — no spreading`);
  });

  test("an unhealthy entry sinks behind healthy ones but stays in the chain", () => {
    const candidates = [
      cand("google", "a", 0.02),
      cand("google", "b", 0.9),
      cand("google", "c", 0.9),
    ];
    const r = orderChain(chain, candidates, () => 0);
    const order = names(r);
    assert.ok(order.indexOf("a") > order.indexOf("b"), "sick model should trail healthy ones");
    assert.ok(order.includes("a"), "sick model should still be reachable");
  });

  test("an unknown model keeps its configured position rather than being demoted", () => {
    // Only "b" is known, and it is unhealthy. "a" and "c" get the neutral score.
    const r = orderChain(chain, [cand("google", "b", 0.01)], () => 0);
    const order = names(r);
    assert.ok(order.indexOf("b") > order.indexOf("a"));
    assert.ok(order.indexOf("b") > order.indexOf("c"));
  });

  test("appends healthy models the chain never mentions, but only at the end", () => {
    const candidates = [cand("google", "a", 0.9), cand("cerebras", "zzz", 0.95)];
    const r = orderChain(chain, candidates, () => 0);
    const order = names(r);
    assert.equal(order[order.length - 1], "zzz");
    assert.equal(order.length, chain.length + 1);
  });

  test("does not append an unknown model that is not clearly healthy", () => {
    const r = orderChain(chain, [cand("cerebras", "zzz", 0.5)], () => 0);
    assert.ok(!names(r).includes("zzz"));
  });

  test("keeps the healthiest key when several exist for one model", () => {
    const candidates = [
      cand("google", "a", 0.2, "key-low"),
      cand("google", "a", 0.9, "key-high"),
    ];
    const r = orderChain(chain, candidates, () => 0);
    assert.equal(r.credentialIds.get("google::a"), "key-high");
  });

  test("a single-entry chain is returned unchanged", () => {
    const one = [{ provider: "google", model: "solo" }];
    const r = orderChain(one, [cand("google", "solo", 0.9)], () => 0);
    assert.deepEqual(names(r), ["solo"]);
  });
});
