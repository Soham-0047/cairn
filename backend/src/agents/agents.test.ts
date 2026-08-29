import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { extractJsonObject, parseAction } from "./runtime.js";
import { parseCitation } from "./repo-eval/verifier.js";
import { aggregate } from "./repo-eval/scoring.js";
import type { SpecialistResult } from "./repo-eval/specialists.js";
import type { Tool } from "./types.js";

/**
 * These cover the parts that decide whether a run survives a model that is
 * only approximately cooperative: a fenced reply, a brace inside a string
 * literal, a citation written with a #L anchor. The #L range case found a real
 * bug — the citation regex dropped the `L` in `#L42-L58` and collapsed the
 * range to one line, so the verifier checked the wrong excerpt.
 *
 * No network, no keys, no database: `npm test` has to work on a clean clone
 * or the reproduction guide is a lie.
 */

const dummyTool: Tool<unknown> = {
  name: "read_file",
  description: "",
  params: [{ name: "path", type: "string", required: true, description: "" }],
  async run() {
    return { content: "" };
  },
};
const tools = new Map<string, Tool<any>>([["read_file", dummyTool]]);

describe("extractJsonObject", () => {
  test("reads a bare object", () => {
    assert.deepEqual(extractJsonObject('{"a":1}'), { a: 1 });
  });

  test("reads through a markdown fence and trailing prose", () => {
    const text = 'Sure!\n```json\n{"thought":"x","tool":"read_file"}\n```\nHope that helps.';
    assert.deepEqual(extractJsonObject(text), { thought: "x", tool: "read_file" });
  });

  test("does not stop at a brace inside a string", () => {
    const text = '{"thought":"the regex /\\\\{\\\\d+\\\\}/ matched","tool":"read_file"}';
    const parsed = extractJsonObject(text);
    assert.equal(parsed?.tool, "read_file");
  });

  test("handles nested objects", () => {
    assert.deepEqual(extractJsonObject('prefix {"a":{"b":[1,{"c":2}]}} suffix'), {
      a: { b: [1, { c: 2 }] },
    });
  });

  test("returns null when there is no object", () => {
    assert.equal(extractJsonObject("I could not complete that."), null);
  });
});

describe("parseAction", () => {
  test("accepts an already-parsed tool action", () => {
    const a = parseAction({ thought: "t", tool: "read_file", args: { path: "a.ts" } }, "", tools);
    assert.deepEqual(a, { kind: "tool", tool: "read_file", args: { path: "a.ts" }, thought: "t" });
  });

  test("accepts a final action", () => {
    const a = parseAction({ thought: "done", final: { evidence: [] } }, "", tools);
    assert.equal(typeof a === "string" ? a : a.kind, "final");
  });

  test("falls back to the raw text when content is not an object", () => {
    const a = parseAction("```\n{\"tool\":\"read_file\",\"args\":{\"path\":\"a.ts\"}}\n```", "", tools);
    assert.equal(typeof a === "string" ? a : a.kind, "tool");
  });

  test("rejects an unknown tool by name, and says which exist", () => {
    const a = parseAction({ tool: "run_tests", args: {} }, "", tools);
    assert.equal(typeof a, "string");
    assert.match(a as string, /unknown tool "run_tests".*read_file/);
  });

  test("rejects a call missing a required argument", () => {
    const a = parseAction({ tool: "read_file", args: {} }, "", tools);
    assert.match(a as string, /missing required args: path/);
  });

  test("rejects an object that is neither a call nor a final answer", () => {
    assert.match(parseAction({ thought: "hmm" }, "", tools) as string, /neither/);
  });
});

describe("parseCitation", () => {
  const cases: Array<[string, { path: string; start: number; end: number } | null]> = [
    ["src/a.ts:42", { path: "src/a.ts", start: 42, end: 42 }],
    ["src/a.ts:42-58", { path: "src/a.ts", start: 42, end: 58 }],
    ["src/a.ts#L42", { path: "src/a.ts", start: 42, end: 42 }],
    ["src/a.ts#L42-L58", { path: "src/a.ts", start: 42, end: 58 }],
    ["./src/a.ts:7", { path: "src/a.ts", start: 7, end: 7 }],
    ["src/a.ts", { path: "src/a.ts", start: 0, end: 0 }],
    ["the whole project", null],
    ["", null],
  ];
  for (const [input, expected] of cases) {
    test(`parses ${JSON.stringify(input)}`, () => {
      assert.deepEqual(parseCitation(input), expected);
    });
  }

  test("normalises a reversed range rather than dropping it", () => {
    assert.deepEqual(parseCitation("a.ts:50-10"), { path: "a.ts", start: 50, end: 50 });
  });
});

describe("score aggregation", () => {
  const specialist = (
    name: SpecialistResult["name"],
    score: number,
    confidence: SpecialistResult["confidence"] = "high",
  ): SpecialistResult => ({ name, score, confidence, reasoning: "", claims: [], latencyMs: 0 });

  const all = (score: number, confidence: SpecialistResult["confidence"] = "high") => [
    specialist("originality", score, confidence),
    specialist("craft", score, confidence),
    specialist("skillMatch", score, confidence),
  ];

  test("weights sum to 1 across present components", () => {
    const r = aggregate({ structural: 0.8, specialists: all(0.8), visual: 0.8, groundedness: 1 });
    const total = r.components.reduce((s, c) => s + c.effectiveWeight, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `weights summed to ${total}`);
  });

  test("omitting screenshots does not raise the score", () => {
    const withVisual = aggregate({ structural: 0.7, specialists: all(0.7), visual: 0.7, groundedness: 1 });
    const without = aggregate({ structural: 0.7, specialists: all(0.7), visual: null, groundedness: 1 });
    // The old formula paid a flat +0.09 for supplying nothing.
    assert.ok(
      without.final <= withVisual.final + 1e-9,
      `no-evidence run scored ${without.final} vs ${withVisual.final}`,
    );
  });

  test("an absent component redistributes its weight rather than paying out", () => {
    const r = aggregate({ structural: 0.6, specialists: all(0.6), visual: null, groundedness: 1 });
    assert.equal(r.components.find((c) => c.key === "visual")!.effectiveWeight, 0);
    assert.ok(Math.abs(r.final - 0.6) < 0.01, `expected ~0.60, got ${r.final}`);
  });

  test("a low-confidence reviewer carries less weight than a confident one", () => {
    const high = aggregate({ structural: 0.5, specialists: all(0.9, "high"), visual: null, groundedness: 1 });
    const low = aggregate({ structural: 0.5, specialists: all(0.9, "low"), visual: null, groundedness: 1 });
    assert.ok(low.final < high.final, `low-confidence ${low.final} should trail ${high.final}`);
  });

  test("unverifiable claims pull the score toward the deterministic anchor", () => {
    const grounded = aggregate({ structural: 0.3, specialists: all(0.95), visual: null, groundedness: 1 });
    const ungrounded = aggregate({ structural: 0.3, specialists: all(0.95), visual: null, groundedness: 0 });
    assert.ok(
      ungrounded.final < grounded.final,
      `ungrounded ${ungrounded.final} should trail grounded ${grounded.final}`,
    );
    assert.ok(ungrounded.shrinkage > 0 && ungrounded.shrinkage <= 0.5);
  });

  test("normal verification loss causes no shrinkage", () => {
    const r = aggregate({ structural: 0.5, specialists: all(0.8), visual: null, groundedness: 0.75 });
    assert.equal(r.shrinkage, 0);
  });

  test("a high score with weak originality does not pass", () => {
    const r = aggregate({
      structural: 0.9,
      specialists: [
        specialist("originality", 0.3),
        specialist("craft", 0.95),
        specialist("skillMatch", 0.95),
      ],
      visual: null,
      groundedness: 1,
    });
    assert.equal(r.passed, false);
    assert.match(r.passReason, /[Oo]riginality/);
  });

  test("every score stays inside [0,1]", () => {
    for (const v of [0, 0.5, 1]) {
      const r = aggregate({ structural: v, specialists: all(v), visual: v, groundedness: v });
      assert.ok(r.final >= 0 && r.final <= 1, `final ${r.final} out of range`);
    }
  });
});
