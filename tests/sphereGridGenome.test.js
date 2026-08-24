import test from "node:test";
import assert from "node:assert/strict";
import {
  SPHERE_GRID_GENOME,
  SPHERE_GRID_GENOME_CHARACTERS,
  SPHERE_GRID_GENOME_LIMIT
} from "../src/data/sphereGridGenome.js";

test("the autonomous sphere grid keeps vertices, edges and projection inside 280 characters", () => {
  assert.equal(SPHERE_GRID_GENOME_CHARACTERS, SPHERE_GRID_GENOME.length);
  assert.equal(SPHERE_GRID_GENOME_CHARACTERS, 276);
  assert.ok(SPHERE_GRID_GENOME_CHARACTERS <= SPHERE_GRID_GENOME_LIMIT);
  assert.doesNotMatch(SPHERE_GRID_GENOME, /WEBGL/);
  assert.match(SPHERE_GRID_GENOME, /q=99\*sin\(v\)/);
  assert.match(SPHERE_GRID_GENOME, /line\(\.\.\.A,\.\.\.B\)/);
  assert.match(SPHERE_GRID_GENOME, /line\(\.\.\.A,\.\.\.C\)/);
  assert.doesNotThrow(() => new Function(SPHERE_GRID_GENOME));
});
