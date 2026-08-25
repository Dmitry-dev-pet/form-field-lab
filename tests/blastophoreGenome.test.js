import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  BLASTOPHORE_GENOME,
  BLASTOPHORE_GENOME_CHARACTERS,
  BLASTOPHORE_GENOME_LIMIT,
  BLASTOPHORE_RAW_VARIANTS,
  compileBlastophoreBudget
} from "../src/data/blastophoreGenome.js";

function executeGenome(code, phase) {
  let points = [];
  let lines = [];
  const sandbox = {
    PI: Math.PI,
    w: 400,
    sin: Math.sin,
    cos: Math.cos,
    exp: Math.exp,
    sq: value => value * value,
    createCanvas() {},
    background() { points = []; lines = []; },
    stroke() {},
    point(x, y) { points.push([x, y, sandbox.z]); },
    line(x1, y1, x2, y2) { lines.push([x1, y1, sandbox.z, x2, y2, sandbox.Z]); }
  };
  vm.runInNewContext(code, sandbox);
  sandbox.t = phase - 0.02;
  sandbox.draw();
  return { points, lines };
}

test("Blastophore fits an entire budding cycle into the 280-character root", () => {
  assert.equal(BLASTOPHORE_GENOME_CHARACTERS, BLASTOPHORE_GENOME.length);
  assert.equal(BLASTOPHORE_GENOME_CHARACTERS, 279);
  assert.equal(BLASTOPHORE_GENOME_LIMIT, 280);
  assert.match(BLASTOPHORE_GENOME, /b=sin\(t\/2\)\*\*2/);
  assert.match(BLASTOPHORE_GENOME, /g=exp\(-sq\(u-4\)\)/);
  assert.match(BLASTOPHORE_GENOME, /n=exp\(-9\*sq\(u-3\.2\)\)/);
  assert.doesNotMatch(BLASTOPHORE_GENOME, /WEBGL/);
  assert.doesNotThrow(() => new Function(BLASTOPHORE_GENOME));

  const embryo = executeGenome(BLASTOPHORE_GENOME, 0);
  const divided = executeGenome(BLASTOPHORE_GENOME, Math.PI);
  const rebuilt = executeGenome(BLASTOPHORE_GENOME, Math.PI * 2);
  assert.equal(embryo.points.length, 10000);
  assert.ok(embryo.points.flat().every(Number.isFinite));
  assert.notDeepEqual(divided.points, embryo.points);
  assert.deepEqual(rebuilt.points, embryo.points);
});

test("Blastophore budgets add nuclei, tissue and a morphogenetic signal", () => {
  assert.deepEqual(
    BLASTOPHORE_RAW_VARIANTS.map(variant => variant.sketch.code.length),
    [279, 393, 653, 838]
  );
  for (const [budget, rank] of [[280, 0], [512, 1], [768, 2], [900, 3]]) {
    const selected = compileBlastophoreBudget(budget);
    assert.equal(selected.variant.rank, rank);
    assert.ok(selected.characters <= budget);
    assert.doesNotThrow(() => new Function(selected.variant.sketch.code));
  }

  const [root, nuclei, tissue, signal] = BLASTOPHORE_RAW_VARIANTS.map(variant => executeGenome(variant.sketch.code, Math.PI));
  assert.equal(root.points.length, 10000);
  assert.equal(nuclei.points.length, 12500);
  assert.equal(tissue.points.length, 12500);
  assert.equal(signal.points.length, 15000);
  assert.equal(root.lines.length, 0);
  assert.equal(nuclei.lines.length, 0);
  assert.equal(tissue.lines.length, 3490);
  assert.equal(signal.lines.length, 3740);
  assert.ok(signal.points.flat().every(Number.isFinite));
  assert.ok(signal.lines.flat().every(Number.isFinite));
});

test("every Blastophore budget keeps its root and external spatial camera", () => {
  const rootLoop = BLASTOPHORE_GENOME.slice(0, BLASTOPHORE_GENOME.indexOf("}}//#"));
  for (const [index, variant] of BLASTOPHORE_RAW_VARIANTS.entries()) {
    assert.equal(variant.sketch.viewModel, "point-cloud-orbit");
    if (index) assert.ok(variant.sketch.code.startsWith(`${rootLoop};`));
  }
});
