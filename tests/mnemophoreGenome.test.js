import test from "node:test";
import assert from "node:assert/strict";
import {
  compileMnemophoreBudget,
  MNEMOPHORE_RAW_VARIANTS
} from "../src/data/mnemophoreGenome.js";

test("Mnemophore exposes portable 280, 512 and 768 outcomes", () => {
  const expected = [
    [280, "memory-core"],
    [512, "memory-color"],
    [768, "memory-network"]
  ];
  for (const [budget, id] of expected) {
    const result = compileMnemophoreBudget(budget);
    assert.equal(result.variant.id, id);
    assert.ok(result.characters <= budget);
    assert.equal(result.withinLimit, true);
  }
});

test("every Mnemophore genome keeps portable 2D canvas and external orbit model", () => {
  for (const variant of MNEMOPHORE_RAW_VARIANTS) {
    assert.match(variant.sketch.code, /createCanvas\(w=400,w\)/);
    assert.doesNotMatch(variant.sketch.code, /WEBGL/);
    assert.equal(variant.sketch.viewModel, "point-cloud-orbit");
  }
});
