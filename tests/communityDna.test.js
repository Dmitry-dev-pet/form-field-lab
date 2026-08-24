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
  PELAGION_EVOLUTION_VARIANTS,
  PELAGION_GENOME,
  PELAGION_GENOME_CHARACTERS,
  PELAGION_GENOME_LIMIT,
  PELAGION_LIVING_GENOME,
  PELAGION_LIVING_CORE_GENOME,
  PELAGION_LIVING_GENOME_CHARACTERS,
  PELAGION_LIVING_STRUCTURE_GENOME,
  PELAGION_RAW_VARIANTS
} from "../src/data/pelagionGenome.js";
import { selectRawBudgetVariant } from "../src/lib/codeBudget.js";

function executeGenomeFrames(code) {
  let points = [];
  let lines = [];
  let strokes = [];
  const sandbox = {
    PI: Math.PI,
    sin: Math.sin,
    cos: Math.cos,
    createCanvas() {},
    background() { points = []; lines = []; strokes = []; },
    stroke(...channels) { strokes.push(channels); },
    point(...coordinates) { points.push(coordinates); },
    line(...coordinates) { lines.push(coordinates); }
  };
  vm.runInNewContext(code, sandbox);
  sandbox.draw();
  const first = points.map(point => [...point]);
  const firstLines = lines.map(line => [...line]);
  const firstStrokes = strokes.map(stroke => [...stroke]);
  sandbox.draw();
  return {
    first,
    firstLines,
    second: points.map(point => [...point]),
    secondLines: lines.map(line => [...line]),
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
  assert.equal(PELAGION_GENOME_CHARACTERS, 276);
  assert.ok(PELAGION_GENOME_CHARACTERS <= PELAGION_GENOME_LIMIT);
  assert.doesNotMatch(PELAGION_GENOME, /WEBGL/);
  assert.match(PELAGION_GENOME, /u=i\/2e3/);
  assert.match(PELAGION_GENOME, /v=i%40\/6/);
  assert.match(PELAGION_GENOME, /r=70\*sin\(PI\*u\/5\)\*\*\.6\*\(1-u\/6\)/);
  assert.match(PELAGION_GENOME, /x=\(u-2\.5\)\*60/);
  assert.match(PELAGION_GENOME, /stroke\(155\+99\*sin\(v\+t\),200,255\)/);
  assert.match(PELAGION_GENOME, /x\*cos\(a\)\+z\*sin\(a\)/);
  assert.doesNotThrow(() => new Function(PELAGION_GENOME));

  const frames = executeGenomeFrames(PELAGION_GENOME);
  assert.equal(frames.first.length, 10000);
  assert.ok(frames.first.flat().every(Number.isFinite));
  assert.notDeepEqual(frames.second, frames.first);
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
  assert.equal(PELAGION_LIVING_GENOME, `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){u=i/2e3;v=i%40/6;s=sin(t*4-u)**3;r=60*sin(PI*u/5)**.6*(1+s/9);z=r*sin(v)*(1+s/4);x=(u-2.5)*(60-5*s);a=t/3;stroke(180+70*s,220,255);point(x*cos(a)+z*sin(a)+200,r*cos(v)+4*u*u*s+200)}}//#つぶやきProcessing`);
  assert.match(PELAGION_LIVING_GENOME, /s=sin\(t\*4-u\)\*\*3/);
  assert.match(PELAGION_LIVING_GENOME, /r=60\*sin\(PI\*u\/5\)\*\*\.6\*\(1\+s\/9\)/);
  assert.match(PELAGION_LIVING_GENOME, /z=r\*sin\(v\)\*\(1\+s\/4\)/);
  assert.match(PELAGION_LIVING_GENOME, /x=\(u-2\.5\)\*\(60-5\*s\)/);
  assert.match(PELAGION_LIVING_GENOME, /stroke\(180\+70\*s,220,255\)/);
  assert.match(PELAGION_LIVING_GENOME, /x\*cos\(a\)\+z\*sin\(a\)/);
  assert.doesNotThrow(() => new Function(PELAGION_LIVING_GENOME));

  const frames = executeGenomeFrames(PELAGION_LIVING_GENOME);
  assert.equal(frames.first.length, 10000);
  assert.equal(frames.second.length, frames.first.length);
  assert.ok(frames.first.flat().every(Number.isFinite));
  assert.ok(frames.second.flat().every(Number.isFinite));
  assert.notDeepEqual(frames.second, frames.first);
  assert.notDeepEqual(frames.secondStrokes, frames.firstStrokes);
  assert.notDeepEqual(frames.firstStrokes[0], frames.firstStrokes.at(-1));
});

test("Pelagion budgets preserve one exact organism and only append anatomy", () => {
  assert.deepEqual(
    PELAGION_EVOLUTION_VARIANTS.map(variant => variant.sketch.code.length),
    [274, 461, 746]
  );
  for (const [budget, rank] of [[280, 0], [512, 1], [768, 2]]) {
    const selected = selectRawBudgetVariant(PELAGION_EVOLUTION_VARIANTS, budget);
    assert.equal(selected.variant.rank, rank);
    assert.ok(selected.characters <= budget);
    assert.doesNotThrow(() => new Function(selected.variant.sketch.code));
  }

  const unchangedLoop = PELAGION_LIVING_GENOME.slice(0, PELAGION_LIVING_GENOME.indexOf("}}//#"));
  assert.ok(PELAGION_LIVING_CORE_GENOME.startsWith(`${unchangedLoop};`));
  assert.ok(PELAGION_LIVING_STRUCTURE_GENOME.startsWith(`${unchangedLoop};`));
  assert.match(PELAGION_LIVING_CORE_GENOME, /stroke\(180\+70\*s,220,255\);point/);
  assert.match(PELAGION_LIVING_STRUCTURE_GENOME, /stroke\(180\+70\*s,220,255\);point/);
  assert.match(PELAGION_LIVING_CORE_GENOME, /stroke\(255,55,170,210\)/);
  assert.match(PELAGION_LIVING_STRUCTURE_GENOME, /i%200<40/);
  assert.match(PELAGION_LIVING_STRUCTURE_GENOME, /i%10\|\|/);
  assert.doesNotMatch(PELAGION_LIVING_CORE_GENOME, /line\(/);
  assert.match(PELAGION_LIVING_STRUCTURE_GENOME, /line\(/);

  const baseFrame = executeGenomeFrames(PELAGION_LIVING_GENOME);
  const coreFrame = executeGenomeFrames(PELAGION_LIVING_CORE_GENOME);
  const structureFrame = executeGenomeFrames(PELAGION_LIVING_STRUCTURE_GENOME);
  assert.equal(baseFrame.first.length, 10000);
  assert.equal(coreFrame.first.length, 12750);
  assert.equal(structureFrame.first.length, coreFrame.first.length);
  assert.equal(baseFrame.firstLines.length, 0);
  assert.equal(coreFrame.firstLines.length, 0);
  assert.equal(structureFrame.firstLines.length, 3000);
});
