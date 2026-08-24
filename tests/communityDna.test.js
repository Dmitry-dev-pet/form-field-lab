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
  PELAGION_GENOME,
  PELAGION_GENOME_CHARACTERS,
  PELAGION_GENOME_LIMIT,
  PELAGION_LIVING_GENOME,
  PELAGION_LIVING_GENOME_CHARACTERS,
  PELAGION_RAW_VARIANTS
} from "../src/data/pelagionGenome.js";

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
  assert.ok(PELAGION_GENOME_CHARACTERS <= PELAGION_GENOME_LIMIT);
  assert.doesNotMatch(PELAGION_GENOME, /WEBGL/);
  assert.match(PELAGION_GENOME, /z=r\*sin\(v\)/);
  assert.match(PELAGION_GENOME, /x\*cos\(a\)\+z\*sin\(a\)/);
  assert.doesNotThrow(() => new Function(PELAGION_GENOME));
});

test("the living-stroke Pelagion is a second autonomous genome inside 280 characters", () => {
  assert.equal(PELAGION_LIVING_GENOME_CHARACTERS, PELAGION_LIVING_GENOME.length);
  assert.equal(PELAGION_LIVING_GENOME_CHARACTERS, 274);
  assert.ok(PELAGION_LIVING_GENOME_CHARACTERS <= PELAGION_GENOME_LIMIT);
  assert.deepEqual(PELAGION_RAW_VARIANTS.map(variant => variant.id), [
    "canonical",
    "living-stroke"
  ]);
  assert.doesNotMatch(PELAGION_LIVING_GENOME, /WEBGL/);
  assert.match(PELAGION_LIVING_GENOME, /s=sin\(t\*4-u\)\*\*3/);
  assert.match(PELAGION_LIVING_GENOME, /r=60.*\(1\+s\/9\)/);
  assert.match(PELAGION_LIVING_GENOME, /z=r\*sin\(v\)\*\(1\+s\/4\)/);
  assert.match(PELAGION_LIVING_GENOME, /x=\(u-2\.5\)\*\(60-5\*s\)/);
  assert.match(PELAGION_LIVING_GENOME, /stroke\(180\+70\*s/);
  assert.match(PELAGION_LIVING_GENOME, /4\*u\*u\*s\+200/);
  assert.match(PELAGION_LIVING_GENOME, /x\*cos\(a\)\+z\*sin\(a\)/);
  assert.doesNotThrow(() => new Function(PELAGION_LIVING_GENOME));

  const frames = executeGenomeFrames(PELAGION_LIVING_GENOME);
  assert.equal(frames.first.length, 10000);
  assert.equal(frames.second.length, frames.first.length);
  assert.ok(frames.first.flat().every(Number.isFinite));
  assert.ok(frames.second.flat().every(Number.isFinite));
  assert.notDeepEqual(frames.second, frames.first);
  assert.notDeepEqual(frames.secondStrokes, frames.firstStrokes);
});
