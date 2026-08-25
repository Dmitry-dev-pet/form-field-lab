import test from "node:test";
import assert from "node:assert/strict";
import {
  SKETCH_36_LIMIT,
  compileSketch36Genome,
  isOriginalSketch36Genome,
  normalizeSketch36Genome,
  sketch36Colors,
  sketch36Defaults,
  sketch36Original,
  sketch36Signature,
  sketch36Stages
} from "../src/data/sketch36Genome.js";

test("sketch #36 default is the untouched archived source", () => {
  assert.equal(compileSketch36Genome(sketch36Defaults), sketch36Original.code);
  assert.equal(compileSketch36Genome(sketch36Defaults).length, 273);
  assert.equal(isOriginalSketch36Genome(sketch36Defaults), true);
});

test("all extreme stage and color mutations compile inside the tweet budget", () => {
  for (const stage of sketch36Stages) {
    for (const color of sketch36Colors) {
      for (const memory of [1, 5]) {
        const code = compileSketch36Genome({
          stage: stage.id,
          color: color.id,
          trail: 9,
          cell: 9,
          field: 9,
          step: 99,
          memory,
          birth: 99
        });
        assert.ok(code.length <= SKETCH_36_LIMIT, `${stage.id}/${color.id} has ${code.length} characters`);
        assert.doesNotThrow(() => new Function(code));
        assert.match(code, /#つぶやきProcessing/);
      }
    }
  }
});

test("the four stages expose progressively different mechanics", () => {
  const seed = compileSketch36Genome({ ...sketch36Defaults, stage: "seed" });
  const memory = compileSketch36Genome({ ...sketch36Defaults, stage: "memory" });
  const xor = compileSketch36Genome({ ...sketch36Defaults, stage: "xor" });
  const exchange = compileSketch36Genome({ ...sketch36Defaults, stage: "exchange", color: "cell" });

  assert.match(seed, /random3D/);
  assert.doesNotMatch(seed, /v\.add\(sin/);
  assert.match(memory, /\+2\.5\+v\.y\+2/);
  assert.doesNotMatch(memory, /\^v\.y/);
  assert.match(xor, /\^v\.y/);
  assert.doesNotMatch(xor, /slice/);
  assert.match(exchange, /slice\(-1980\)/);
  assert.match(exchange, /stroke\(r\*8,i\/3,i\/5\)/);
});

test("normalization clamps numeric mutations and makes stable signatures", () => {
  const normalized = normalizeSketch36Genome({
    stage: "unknown",
    color: "unknown",
    trail: 100,
    cell: -5,
    field: 100,
    step: 1,
    memory: 12,
    birth: 1
  });

  assert.deepEqual(normalized, {
    stage: "exchange",
    color: "age",
    trail: 9,
    cell: 1,
    field: 9,
    step: 30,
    memory: 5,
    birth: 10
  });
  assert.equal(sketch36Signature(normalized), "exchange-age-9-1-9-30-5-10");
});
