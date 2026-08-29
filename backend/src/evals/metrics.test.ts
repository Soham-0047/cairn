import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { meanAbsoluteError, pairwiseAccuracy, passAgreement, spearman } from "./metrics.js";

describe("spearman", () => {
  test("is 1 for a perfectly ordered set", () => {
    const pairs = [0.1, 0.3, 0.5, 0.7, 0.9].map((v) => ({ predicted: v, reference: v }));
    assert.equal(spearman(pairs), 1);
  });

  test("is -1 for a reversed set", () => {
    const refs = [0.1, 0.3, 0.5, 0.7, 0.9];
    const pairs = refs.map((v, i) => ({ predicted: refs[refs.length - 1 - i]!, reference: v }));
    assert.equal(spearman(pairs), -1);
  });

  test("ignores a constant offset, since ordering is what it measures", () => {
    const refs = [0.2, 0.4, 0.6, 0.8];
    const pairs = refs.map((v) => ({ predicted: v + 0.2, reference: v }));
    assert.equal(spearman(pairs), 1);
  });

  test("returns 0 when a pipeline predicts the same value for everything", () => {
    const pairs = [0.1, 0.5, 0.9].map((v) => ({ predicted: 0.7, reference: v }));
    assert.equal(spearman(pairs), 0);
  });

  test("returns 0 rather than a spurious value below three pairs", () => {
    assert.equal(spearman([{ predicted: 1, reference: 0 }]), 0);
  });

  test("handles ties without producing NaN", () => {
    const pairs = [
      { predicted: 0.5, reference: 0.5 },
      { predicted: 0.5, reference: 0.6 },
      { predicted: 0.8, reference: 0.9 },
      { predicted: 0.2, reference: 0.3 },
    ];
    const r = spearman(pairs);
    assert.ok(Number.isFinite(r) && r >= -1 && r <= 1);
  });
});

describe("pairwiseAccuracy", () => {
  test("is 1 when every ordered pair is ranked correctly", () => {
    const pairs = [0.2, 0.5, 0.9].map((v) => ({ predicted: v, reference: v }));
    assert.equal(pairwiseAccuracy(pairs), 1);
  });

  test("skips pairs the reference does not order", () => {
    const pairs = [
      { predicted: 0.9, reference: 0.5 },
      { predicted: 0.1, reference: 0.5 },
    ];
    assert.equal(pairwiseAccuracy(pairs), 0);
  });
});

describe("passAgreement", () => {
  test("separates a false pass from a false fail", () => {
    const r = passAgreement(
      [
        { predicted: 0.9, reference: 0.4 }, // passed something that should fail
        { predicted: 0.3, reference: 0.8 }, // failed something that should pass
        { predicted: 0.7, reference: 0.7 },
      ],
      0.65,
    );
    assert.equal(r.falsePass, 1);
    assert.equal(r.falseFail, 1);
    // accuracy is rounded to three places, so compare against the rounded value
    assert.equal(r.accuracy, 0.333);
  });
});

describe("meanAbsoluteError", () => {
  test("averages the absolute gaps", () => {
    assert.equal(
      meanAbsoluteError([
        { predicted: 0.5, reference: 0.7 },
        { predicted: 0.9, reference: 0.5 },
      ]),
      0.3,
    );
  });

  test("is 0 on an empty set", () => {
    assert.equal(meanAbsoluteError([]), 0);
  });
});
