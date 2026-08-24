import test from "node:test";
import assert from "node:assert/strict";
import {
  compileMnemophoreBudget,
  MNEMOPHORE_RAW_VARIANTS
} from "../src/data/mnemophoreGenome.js";

test("Mnemophore exposes portable 280, 512 and 768 outcomes", () => {
  const expected = [
    [280, "memory-core", 271],
    [512, "memory-color", 406],
    [768, "memory-network", 545]
  ];
  for (const [budget, id, characters] of expected) {
    const result = compileMnemophoreBudget(budget);
    assert.equal(result.variant.id, id);
    assert.equal(result.characters, characters);
    assert.ok(result.characters <= budget);
    assert.equal(result.withinLimit, true);
  }
});

test("every Mnemophore genome keeps portable 2D canvas and external orbit model", () => {
  for (const variant of MNEMOPHORE_RAW_VARIANTS) {
    assert.match(variant.sketch.code, /createCanvas\(w=400,w\)/);
    assert.match(variant.sketch.code, /h=i%5/);
    assert.match(variant.sketch.code, /v\.lerp/);
    assert.doesNotMatch(variant.sketch.code, /WEBGL/);
    assert.equal(variant.sketch.viewModel, "point-cloud-orbit");
    assert.doesNotThrow(() => new Function(variant.sketch.code));
  }
});

test("budgets add anatomy without replacing the organism", () => {
  const [core, color, network] = MNEMOPHORE_RAW_VARIANTS.map(({ sketch }) => sketch.code);
  assert.match(core, /80\*sin\(PI\*q\/27\)\*\*\.7\+8\*sin\(t\/20-q\)/);
  assert.doesNotMatch(core, /line\(/);
  assert.match(color, /n=h==1/);
  assert.match(color, /colorMode\(HSB\)/);
  assert.match(network, /p\[i-50\]/);
  assert.match(network, /p\[i-1\]/);
  assert.match(network, /line\(/);
});
