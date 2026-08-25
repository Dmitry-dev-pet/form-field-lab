import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  CHIRALOPHORE_COLOR_LAWS,
  CHIRALOPHORE_COLOR_PALETTES,
  CHIRALOPHORE_DEFAULTS,
  CHIRALOPHORE_GENOME,
  CHIRALOPHORE_GENOME_CHARACTERS,
  CHIRALOPHORE_GENOME_LIMIT,
  compileChiralophoreGenome
} from "../src/data/chiralophoreGenome.js";

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

test("Chiralophore keeps two tissues, a signed pulse, nested rotation and orbit inside 280", () => {
  assert.equal(CHIRALOPHORE_GENOME_CHARACTERS, CHIRALOPHORE_GENOME.length);
  assert.equal(CHIRALOPHORE_GENOME_CHARACTERS, 278);
  assert.equal(CHIRALOPHORE_GENOME_LIMIT, 280);
  assert.match(CHIRALOPHORE_GENOME, /i%2\*3/);
  assert.match(CHIRALOPHORE_GENOME, /\*\*5/);
  assert.match(CHIRALOPHORE_GENOME, /q=v\+sin\(2\*v\+3\*u\)\/4/);
  assert.match(CHIRALOPHORE_GENOME, /point\(x\*cos\(t\)\+z\*sin\(t\)\+200/);
  assert.doesNotMatch(CHIRALOPHORE_GENOME, /WEBGL/);
  assert.doesNotThrow(() => new Function(CHIRALOPHORE_GENOME));

  const frames = executeFrames(CHIRALOPHORE_GENOME);
  assert.equal(frames.first.length, 10000);
  assert.ok(frames.first.flat().every(Number.isFinite));
  assert.ok(Math.max(...frames.first.map(point => point[0]))
    - Math.min(...frames.first.map(point => point[0])) > 190);
  assert.ok(Math.max(...frames.first.map(point => point[2]))
    - Math.min(...frames.first.map(point => point[2])) > 90);
  assert.ok(new Set(frames.firstStrokes.map(stroke => stroke.join(","))).size > 50);
  assert.notDeepEqual(frames.second, frames.first);
});

test("every Chiralophore control endpoint recompiles to a finite autonomous RAW", () => {
  const minimum = compileChiralophoreGenome({
    ...CHIRALOPHORE_DEFAULTS,
    genomeSpeed: 1,
    length: 40,
    radius: 50,
    depth: 0.5,
    pulse: 10,
    pulseSpeed: 5,
    axialWaves: 2,
    twist: 1,
    fold: 2,
    chirality: -1
  });
  const maximum = compileChiralophoreGenome({
    ...CHIRALOPHORE_DEFAULTS,
    genomeSpeed: 5,
    length: 70,
    radius: 80,
    depth: 1.5,
    pulse: 20,
    pulseSpeed: 9,
    axialWaves: 6,
    twist: 5,
    fold: 6,
    chirality: 1
  });

  for (const compiled of [minimum, maximum]) {
    assert.ok(compiled.withinLimit, `${compiled.characters} characters`);
    assert.ok(compiled.characters <= CHIRALOPHORE_GENOME_LIMIT);
    assert.match(compiled.code, /#つぶやきProcessing$/);
    assert.doesNotThrow(() => new Function(compiled.code));
    const frame = executeFrames(compiled.code).first;
    assert.equal(frame.length, 10000);
    assert.ok(frame.flat().every(Number.isFinite));
  }
});

test("all Chiralophore palettes and color laws stay inside the single-post genome", () => {
  const codes = [];
  for (const law of CHIRALOPHORE_COLOR_LAWS) {
    for (const palette of CHIRALOPHORE_COLOR_PALETTES) {
      const compiled = compileChiralophoreGenome({
        ...CHIRALOPHORE_DEFAULTS,
        colorLaw: law.id,
        colorPalette: palette.id
      });
      codes.push(compiled.code);
      assert.ok(compiled.withinLimit, `${law.id}/${palette.id}: ${compiled.characters}`);
      assert.ok(compiled.characters <= CHIRALOPHORE_GENOME_LIMIT);
      assert.doesNotThrow(() => new Function(compiled.code));
    }
  }
  assert.equal(new Set(codes).size, CHIRALOPHORE_COLOR_LAWS.length * CHIRALOPHORE_COLOR_PALETTES.length);
  assert.deepEqual(
    CHIRALOPHORE_COLOR_LAWS.map(law => compileChiralophoreGenome({
      ...CHIRALOPHORE_DEFAULTS,
      colorLaw: law.id
    }).characters),
    [278, 280, 278]
  );
});

test("manual camera state never enters the Chiralophore genome", () => {
  const original = compileChiralophoreGenome(CHIRALOPHORE_DEFAULTS);
  const leftHanded = compileChiralophoreGenome({
    ...CHIRALOPHORE_DEFAULTS,
    chirality: -1
  });
  const cameraOnly = compileChiralophoreGenome({
    ...CHIRALOPHORE_DEFAULTS,
    yaw: 1.2,
    pitch: -0.5,
    orientation: { x: 1, y: 0, z: 0, w: 0 }
  });

  assert.notEqual(leftHanded.code, original.code);
  assert.notEqual(leftHanded.id, original.id);
  assert.equal(cameraOnly.code, original.code);
  assert.equal(cameraOnly.id, original.id);
  assert.equal(original.sketch.viewModel, "point-cloud-auto-y-orbit");
});
