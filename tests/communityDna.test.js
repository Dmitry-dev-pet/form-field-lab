import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  COMMUNITY_AUTHORS,
  COMMUNITY_GENES,
  COMMUNITY_SCAN,
  PELAGION_LINEAGE
} from "../src/data/communityDna.js";
import {
  PELAGION_BUDGET_VARIANTS_BY_MODE,
  PELAGION_GENOME,
  PELAGION_GENOME_CHARACTERS,
  PELAGION_GENOME_LIMIT,
  PELAGION_LIVING_GENOME,
  PELAGION_LIVING_GENOME_CHARACTERS,
  PELAGION_RAW_VARIANTS
} from "../src/data/pelagionGenome.js";
import { selectRawBudgetVariant } from "../src/lib/codeBudget.js";

function executeGenomeFrames(code) {
  let points = [];
  let strokes = [];
  const sandbox = {
    PI: Math.PI,
    sin: Math.sin,
    cos: Math.cos,
    createCanvas() {},
    background() { points = []; strokes = []; },
    stroke(...channels) { strokes.push(channels); },
    point(...coordinates) { points.push(coordinates); }
  };
  vm.runInNewContext(code, sandbox);
  sandbox.draw();
  const first = points.map(point => [...point]);
  const firstStrokes = strokes.map(stroke => [...stroke]);
  sandbox.draw();
  return {
    first,
    second: points.map(point => [...point]),
    firstStrokes,
    secondStrokes: strokes.map(stroke => [...stroke])
  };
}

test("the community census is internally complete", () => {
  assert.equal(COMMUNITY_SCAN.sketches, 845);
  assert.equal(COMMUNITY_AUTHORS.length, COMMUNITY_SCAN.authors);
  assert.equal(new Set(COMMUNITY_AUTHORS.map(author => author.handle)).size, COMMUNITY_SCAN.authors);
  assert.equal(COMMUNITY_AUTHORS.reduce((total, author) => total + author.count, 0), COMMUNITY_SCAN.sketches);

  const covered = new Set(COMMUNITY_GENES.flatMap(gene => gene.authors));
  assert.deepEqual(
    [...covered].sort(),
    COMMUNITY_AUTHORS.map(author => author.handle).sort()
  );
});

test("Pelagion lineage keeps direct archive evidence", () => {
  assert.ok(PELAGION_LINEAGE.length >= 6);
  assert.ok(PELAGION_LINEAGE.every(item => /^https:\/\/tsubuyaki\.art\/sketch\.html\?id=\d+$/.test(item.url)));
});

test("the autonomous Pelagion genome stays inside the challenge limit", () => {
  assert.equal(PELAGION_GENOME_CHARACTERS, PELAGION_GENOME.length);
  assert.equal(PELAGION_GENOME_CHARACTERS, 279);
  assert.ok(PELAGION_GENOME_CHARACTERS <= PELAGION_GENOME_LIMIT);
  assert.doesNotMatch(PELAGION_GENOME, /WEBGL/);
  assert.match(PELAGION_GENOME, /q=i\/200\|0/);
  assert.match(PELAGION_GENOME, /h=q>29/);
  assert.match(PELAGION_GENOME, /x=h\?80\+5\*u:r\*cos\(v\)/);
  assert.match(PELAGION_GENOME, /y=h\?u\*sin\(v\):\.6\*r\*sin\(v\)/);
  assert.match(PELAGION_GENOME, /stroke\(160,u\*9,w\)/);
  assert.match(PELAGION_GENOME, /x\*cos\(a\)\+z\*sin\(a\)/);
  assert.doesNotThrow(() => new Function(PELAGION_GENOME));

  const frames = executeGenomeFrames(PELAGION_GENOME);
  assert.equal(frames.first.length, 10000);
  assert.ok(frames.first.flat().every(Number.isFinite));
  assert.notDeepEqual(frames.second, frames.first);
});

test("the living-stroke Pelagion is a second autonomous genome inside 280 characters", () => {
  assert.equal(PELAGION_LIVING_GENOME_CHARACTERS, PELAGION_LIVING_GENOME.length);
  assert.equal(PELAGION_LIVING_GENOME_CHARACTERS, 280);
  assert.ok(PELAGION_LIVING_GENOME_CHARACTERS <= PELAGION_GENOME_LIMIT);
  assert.deepEqual(PELAGION_RAW_VARIANTS.map(variant => variant.id), [
    "canonical",
    "living-stroke"
  ]);
  assert.doesNotMatch(PELAGION_LIVING_GENOME, /WEBGL/);
  assert.match(PELAGION_LIVING_GENOME, /s=sin\(4\*t-u\/9\)/);
  assert.match(PELAGION_LIVING_GENOME, /x=h\?80\+5\*u:r\*cos\(v\)/);
  assert.match(PELAGION_LIVING_GENOME, /y=h\?u\*sin\(v\):\.6\*r\*sin\(v\)/);
  assert.match(PELAGION_LIVING_GENOME, /z=h\?16\*s:18-u\/2\+9\*s\*sin\(v\)\*\*2/);
  assert.match(PELAGION_LIVING_GENOME, /stroke\(160,u\*9,w\)/);
  assert.match(PELAGION_LIVING_GENOME, /x\*cos\(a\)\+z\*sin\(a\)/);
  assert.doesNotThrow(() => new Function(PELAGION_LIVING_GENOME));

  const frames = executeGenomeFrames(PELAGION_LIVING_GENOME);
  assert.equal(frames.first.length, 10000);
  assert.equal(frames.second.length, frames.first.length);
  assert.ok(frames.first.flat().every(Number.isFinite));
  assert.ok(frames.second.flat().every(Number.isFinite));
  assert.notDeepEqual(frames.second, frames.first);
  assert.deepEqual(frames.secondStrokes, frames.firstStrokes);
  assert.notDeepEqual(frames.firstStrokes[0], frames.firstStrokes.at(-1));
});

test("Pelagion budgets select real anatomy in both motion modes", () => {
  const expectations = {
    canonical: [279, 408, 551],
    "living-stroke": [280, 409, 552]
  };
  for (const [mode, variants] of Object.entries(PELAGION_BUDGET_VARIANTS_BY_MODE)) {
    assert.deepEqual(variants.map(variant => variant.sketch.code.length), expectations[mode]);
    for (const [budget, rank] of [[280, 0], [512, 1], [768, 2]]) {
      const selected = selectRawBudgetVariant(variants, budget);
      assert.equal(selected.variant.rank, rank);
      assert.ok(selected.characters <= budget);
      assert.doesNotThrow(() => new Function(selected.variant.sketch.code));
    }
    assert.doesNotMatch(variants[0].sketch.code, /line\(/);
    assert.match(variants[1].sketch.code, /stroke\(w,110,70\)/);
    assert.match(variants[2].sketch.code, /line\(/);
  }
});
