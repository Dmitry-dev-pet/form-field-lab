import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  compileMoirephoreGenome,
  MOIREPHORE_COLOR_LAWS,
  MOIREPHORE_COLOR_PALETTES,
  MOIREPHORE_DEFAULTS,
  MOIREPHORE_GENOME,
  MOIREPHORE_GENOME_CHARACTERS,
  MOIREPHORE_GENOME_LIMIT
} from "../src/data/moirephoreGenome.js";

function executeFrames(code) {
  let points = [];
  let strokes = [];
  const sandbox = {
    sin: Math.sin,
    cos: Math.cos,
    createCanvas() {},
    background() {
      points = [];
      strokes = [];
    },
    stroke(...channels) { strokes.push(channels); },
    point(x, y) { points.push([x, y, sandbox.z]); }
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

test("Moiréphore fits two phase waves, hidden depth, formula color and orbit inside 280", () => {
  assert.equal(MOIREPHORE_GENOME_CHARACTERS, MOIREPHORE_GENOME.length);
  assert.equal(MOIREPHORE_GENOME_CHARACTERS, 279);
  assert.equal(MOIREPHORE_GENOME_LIMIT, 280);
  assert.match(MOIREPHORE_GENOME, /a=3\*u-t,b=5\*u\+t/);
  assert.match(MOIREPHORE_GENOME, /sin\(a\)\*cos\(b\)/);
  assert.match(MOIREPHORE_GENOME, /q=v\+sin\(a-b\)\/4/);
  assert.match(MOIREPHORE_GENOME, /z=1\*r\*sin\(q\)/);
  assert.match(MOIREPHORE_GENOME, /n=128\+99\*sin\(a-b\)/);
  assert.match(MOIREPHORE_GENOME, /point\(x\*cos\(t\)\+z\*sin\(t\)\+200/);
  assert.doesNotThrow(() => new Function(MOIREPHORE_GENOME));

  const frames = executeFrames(MOIREPHORE_GENOME);
  assert.equal(frames.first.length, 10000);
  assert.ok(frames.first.flat().every(Number.isFinite));
  assert.ok(Math.max(...frames.first.map(point => point[0]))
    - Math.min(...frames.first.map(point => point[0])) > 190);
  assert.ok(Math.max(...frames.first.map(point => point[2]))
    - Math.min(...frames.first.map(point => point[2])) > 100);
  assert.ok(new Set(frames.firstStrokes.map(stroke => stroke.join(","))).size > 100);
  assert.notDeepEqual(frames.second, frames.first);
});

test("every Moiréphore control endpoint remains a finite autonomous RAW", () => {
  const endpoints = [
    compileMoirephoreGenome({
      ...MOIREPHORE_DEFAULTS,
      genomeSpeed: 1,
      length: 40,
      radius: 50,
      depth: 1,
      interference: 8,
      waveA: 2,
      waveB: 3,
      twist: 2,
      pointCount: 5000
    }),
    compileMoirephoreGenome({
      ...MOIREPHORE_DEFAULTS,
      genomeSpeed: 5,
      length: 70,
      radius: 80,
      depth: 3,
      interference: 18,
      waveA: 6,
      waveB: 9,
      twist: 6,
      pointCount: 20000
    })
  ];

  for (const compiled of endpoints) {
    assert.ok(compiled.withinLimit, `${compiled.characters} characters`);
    assert.ok(compiled.characters <= MOIREPHORE_GENOME_LIMIT);
    assert.match(compiled.code, /#つぶやきProcessing$/);
    assert.doesNotThrow(() => new Function(compiled.code));
    const frame = executeFrames(compiled.code).first;
    assert.equal(frame.length, compiled.parameters.pointCount);
    assert.ok(frame.flat().every(Number.isFinite));
  }
});

test("all Moiréphore palettes and phase color laws compile inside the same post", () => {
  const codes = [];
  for (const law of MOIREPHORE_COLOR_LAWS) {
    for (const palette of MOIREPHORE_COLOR_PALETTES) {
      const compiled = compileMoirephoreGenome({
        ...MOIREPHORE_DEFAULTS,
        colorLaw: law.id,
        colorPalette: palette.id,
        pointCount: 15000
      });
      codes.push(compiled.code);
      assert.ok(compiled.withinLimit, `${law.id}/${palette.id}: ${compiled.characters}`);
      assert.ok(compiled.characters <= MOIREPHORE_GENOME_LIMIT);
      assert.doesNotThrow(() => new Function(compiled.code));
    }
  }
  assert.equal(new Set(codes).size, MOIREPHORE_COLOR_LAWS.length * MOIREPHORE_COLOR_PALETTES.length);
});

test("manual camera values never mutate the Moiréphore genome", () => {
  const original = compileMoirephoreGenome(MOIREPHORE_DEFAULTS);
  const deeper = compileMoirephoreGenome({ ...MOIREPHORE_DEFAULTS, depth: 3 });
  const cameraOnly = compileMoirephoreGenome({
    ...MOIREPHORE_DEFAULTS,
    yaw: 1.2,
    pitch: -0.5,
    orientation: { x: 1, y: 0, z: 0, w: 0 }
  });

  assert.notEqual(deeper.code, original.code);
  assert.notEqual(deeper.id, original.id);
  assert.equal(cameraOnly.code, original.code);
  assert.equal(cameraOnly.id, original.id);
  assert.equal(original.sketch.viewModel, "point-cloud-auto-y-orbit");
});
