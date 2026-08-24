import test from "node:test";
import assert from "node:assert/strict";
import {
  CHRONOPHORE_GENOME,
  CHRONOPHORE_GENOME_CHARACTERS,
  CHRONOPHORE_GENOME_LIMIT
} from "../src/data/chronophoreGenome.js";

test("the autonomous Chronophore genome carries a portable 2:3 spatial knot", () => {
  assert.equal(CHRONOPHORE_GENOME_CHARACTERS, CHRONOPHORE_GENOME.length);
  assert.equal(CHRONOPHORE_GENOME_CHARACTERS, 273);
  assert.ok(CHRONOPHORE_GENOME_CHARACTERS <= CHRONOPHORE_GENOME_LIMIT);
  assert.doesNotMatch(CHRONOPHORE_GENOME, /WEBGL/);
  assert.match(CHRONOPHORE_GENOME, /a=2\*u/);
  assert.match(CHRONOPHORE_GENOME, /v=3\*u\+t/);
  assert.match(CHRONOPHORE_GENOME, /z=q\*sin\(v\)/);
  assert.match(CHRONOPHORE_GENOME, /x\*cos\(t\/4\)\+z\*sin\(t\/4\)/);
  assert.doesNotThrow(() => new Function(CHRONOPHORE_GENOME));
});
