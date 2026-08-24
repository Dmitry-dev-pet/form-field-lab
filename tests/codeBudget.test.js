import test from "node:test";
import assert from "node:assert/strict";
import {
  RAW_CODE_BUDGET_MAX,
  readRawCodeBudget,
  selectRawBudgetVariant
} from "../src/lib/codeBudget.js";

const variants = [
  { rank: 0, features: ["core"], sketch: { code: "a".repeat(270) } },
  { rank: 1, features: ["core", "color"], sketch: { code: "a".repeat(320) } },
  { rank: 2, features: ["core", "color", "edges"], sketch: { code: "a".repeat(520) } }
];

test("code budget is clamped to the supported portable range", () => {
  assert.equal(readRawCodeBudget(12), 280);
  assert.equal(readRawCodeBudget(512.4), 512);
  assert.equal(readRawCodeBudget(5000), RAW_CODE_BUDGET_MAX);
});

test("budget selects the richest fitting genome and reports omissions", () => {
  const core = selectRawBudgetVariant(variants, 280);
  assert.equal(core.characters, 270);
  assert.deepEqual(core.omittedFeatures, ["color", "edges"]);

  const color = selectRawBudgetVariant(variants, 512);
  assert.equal(color.characters, 320);
  assert.deepEqual(color.activeFeatures, ["core", "color"]);

  const edges = selectRawBudgetVariant(variants, 768);
  assert.equal(edges.characters, 520);
  assert.equal(edges.withinLimit, true);
});
