import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  compileKryloforGenome,
  KRYLOFOR_DEFAULTS,
  KRYLOFOR_GENOME,
  KRYLOFOR_GENOME_CHARACTERS,
  KRYLOFOR_GENOME_LIMIT
} from "../src/data/kryloforGenome.js";

function executeFrames(code) {
  let points = [];
  let strokes = [];
  const sandbox = {
    PI: Math.PI,
    sin: Math.sin,
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

test("Krylofor keeps its membrane, depth, tail and signal inside 280 characters", () => {
  assert.equal(KRYLOFOR_GENOME_CHARACTERS, KRYLOFOR_GENOME.length);
  assert.equal(KRYLOFOR_GENOME_CHARACTERS, 278);
  assert.equal(KRYLOFOR_GENOME_LIMIT, 280);
  assert.match(KRYLOFOR_GENOME, /v=\(i%99\/49-1\)\*\*3/);
  assert.match(KRYLOFOR_GENOME, /s=sin\(4\*t-u\*2\)/);
  assert.match(KRYLOFOR_GENOME, /sin\(7\*t-u\*3\)\*\*12/);
  assert.doesNotMatch(KRYLOFOR_GENOME, /WEBGL/);
  assert.doesNotThrow(() => new Function(KRYLOFOR_GENOME));

  const frames = executeFrames(KRYLOFOR_GENOME);
  assert.equal(frames.first.length, 10000);
  assert.ok(frames.first.flat().every(Number.isFinite));
  assert.ok(Math.max(...frames.first.map(point => point[1]))
    - Math.min(...frames.first.map(point => point[1])) > 180);
  assert.ok(Math.max(...frames.first.map(point => point[2]))
    - Math.min(...frames.first.map(point => point[2])) > 20);
  assert.ok(new Set(frames.firstStrokes.map(stroke => stroke[0])).size > 20);
  assert.notDeepEqual(frames.second, frames.first);
  assert.notDeepEqual(frames.secondStrokes, frames.firstStrokes);
});

test("every Krylofor control endpoint recompiles to a valid autonomous RAW", () => {
  const minimum = compileKryloforGenome({
    ...KRYLOFOR_DEFAULTS,
    genomeSpeed: 1,
    length: 35,
    bodyWidth: 18,
    wingWidth: 55,
    depth: 0.5,
    fold: 8,
    pulseDivisor: 6,
    waveSpeed: 2,
    waveCount: 1,
    signalSpeed: 3,
    signalCount: 1,
    pointCount: 5000,
    alpha: 30
  });
  const maximum = compileKryloforGenome({
    ...KRYLOFOR_DEFAULTS,
    genomeSpeed: 5,
    length: 65,
    bodyWidth: 45,
    wingWidth: 95,
    depth: 1.6,
    fold: 32,
    pulseDivisor: 14,
    waveSpeed: 8,
    waveCount: 5,
    signalSpeed: 9,
    signalCount: 6,
    pointCount: 20000,
    alpha: 99
  });

  for (const compiled of [minimum, maximum]) {
    assert.equal(compiled.code.length, compiled.characters);
    assert.ok(compiled.withinLimit, `${compiled.characters} characters`);
    assert.ok(compiled.characters <= KRYLOFOR_GENOME_LIMIT);
    assert.match(compiled.code, /#つぶやきProcessing$/);
    assert.doesNotThrow(() => new Function(compiled.code));
    const frames = executeFrames(compiled.code);
    assert.equal(frames.first.length, compiled.parameters.pointCount);
    assert.ok(frames.first.flat().every(Number.isFinite));
  }
});

test("Krylofor sliders change the executed genome while camera state stays external", () => {
  const original = compileKryloforGenome(KRYLOFOR_DEFAULTS);
  const changed = compileKryloforGenome({ ...KRYLOFOR_DEFAULTS, wingWidth: 91 });
  const cameraOnly = compileKryloforGenome({
    ...KRYLOFOR_DEFAULTS,
    yaw: 1.4,
    pitch: -0.7,
    orientation: { x: 1, y: 0, z: 0, w: 0 }
  });

  assert.notEqual(changed.code, original.code);
  assert.notEqual(changed.id, original.id);
  assert.equal(cameraOnly.code, original.code);
  assert.equal(cameraOnly.id, original.id);
  assert.equal(original.sketch.viewModel, "point-cloud-orbit");
});
