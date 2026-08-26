import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  compileTorophoreGenome,
  TOROPHORE_COLOR_LAWS,
  TOROPHORE_COLOR_PALETTES,
  TOROPHORE_DEFAULTS,
  TOROPHORE_GENOME,
  TOROPHORE_GENOME_CHARACTERS,
  TOROPHORE_GENOME_LIMIT,
  TOROPHORE_SOURCE
} from "../src/data/torophoreGenome.js";

function executeFrames(code) {
  let organs = [];
  let current = {};
  const sandbox = {
    TAU: Math.PI * 2,
    WEBGL: "WEBGL",
    sin: Math.sin,
    cos: Math.cos,
    noise(value) {
      const x = Math.abs(value);
      const cell = Math.floor(x);
      const phase = x - cell;
      const blend = phase * phase * (3 - 2 * phase);
      const sample = point => {
        const signal = Math.sin(point * 12.9898) * 43758.5453;
        return signal - Math.floor(signal);
      };
      return sample(cell) * (1 - blend) + sample(cell + 1) * blend;
    },
    createCanvas() {},
    noStroke() {},
    clear() { organs = []; },
    fill(...color) { current.color = color; },
    push() { current = { color: current.color }; },
    translate(x, y, z) { current.position = [x, y, z]; },
    rotateX(angle) { current.rotation = angle; },
    torus(radius, detailX, detailY) {
      organs.push({
        index: sandbox.i,
        phase: sandbox.d,
        depthPhase: sandbox.q,
        color: current.color,
        position: current.position,
        rotation: current.rotation,
        radius,
        detailX,
        detailY
      });
    },
    pop() {}
  };
  vm.runInNewContext(code, sandbox);
  sandbox.setup();
  sandbox.draw();
  const first = organs.map(organ => structuredClone(organ));
  sandbox.draw();
  return { first, second: organs.map(organ => structuredClone(organ)) };
}

test("Torophore fits stateless transport, true depth, orientation and color inside 280", () => {
  assert.equal(TOROPHORE_GENOME_CHARACTERS, TOROPHORE_GENOME.length);
  assert.equal(TOROPHORE_GENOME_CHARACTERS, 251);
  assert.equal(TOROPHORE_GENOME_LIMIT, 280);
  assert.match(TOROPHORE_SOURCE, /noise\(i-C\)/);
  assert.match(TOROPHORE_SOURCE, /torus\(W\/6\)/);
  assert.match(TOROPHORE_GENOME, /noise\(i-t\)\*TAU\*2/);
  assert.match(TOROPHORE_GENOME, /z=80\*sin\(q\)/);
  assert.match(TOROPHORE_GENOME, /translate\(cos\(d\)\*i,sin\(d\)\*i,z\)/);
  assert.match(TOROPHORE_GENOME, /rotateX\(d\)/);
  assert.match(TOROPHORE_GENOME, /fill\(n,255-n,255\)/);
  assert.doesNotThrow(() => new Function(TOROPHORE_GENOME));

  const frames = executeFrames(TOROPHORE_GENOME);
  assert.equal(frames.first.length, 180);
  assert.ok(frames.first.flatMap(organ => organ.position).every(Number.isFinite));
  assert.ok(Math.max(...frames.first.map(organ => organ.position[2]))
    - Math.min(...frames.first.map(organ => organ.position[2])) > 150);
  assert.ok(new Set(frames.first.map(organ => organ.color.join(","))).size > 100);
  assert.ok(frames.first.every(organ => Math.abs(organ.rotation - organ.phase) < 1e-12));

  const firstPhase = frames.first.find(organ => organ.index === 100).phase;
  const advectedPhase = frames.second.find(organ => organ.index === 102).phase;
  assert.ok(Math.abs(firstPhase - advectedPhase) < 1e-12);
});

test("every Torophore control endpoint remains an autonomous finite WEBGL RAW", () => {
  const endpoints = [
    compileTorophoreGenome({
      ...TOROPHORE_DEFAULTS,
      genomeSpeed: 1,
      organCount: 120,
      turns: 1,
      depth: 40,
      depthWave: 10,
      depthSpeed: 1,
      organRadius: 30,
      detailX: 4,
      detailY: 3
    }),
    compileTorophoreGenome({
      ...TOROPHORE_DEFAULTS,
      genomeSpeed: 5,
      organCount: 480,
      turns: 4,
      depth: 99,
      depthWave: 40,
      depthSpeed: 9,
      organRadius: 120,
      detailX: 9,
      detailY: 8
    })
  ];

  for (const compiled of endpoints) {
    assert.ok(compiled.withinLimit, `${compiled.characters} characters`);
    assert.ok(compiled.characters <= TOROPHORE_GENOME_LIMIT);
    assert.match(compiled.code, /#つぶやきProcessing$/);
    assert.doesNotThrow(() => new Function(compiled.code));
    const frame = executeFrames(compiled.code).first;
    assert.equal(frame.length, compiled.parameters.organCount);
    assert.ok(frame.flatMap(organ => organ.position).every(Number.isFinite));
  }
});

test("all Torophore palettes and phase laws compile inside the same post", () => {
  const codes = [];
  for (const law of TOROPHORE_COLOR_LAWS) {
    for (const palette of TOROPHORE_COLOR_PALETTES) {
      const compiled = compileTorophoreGenome({
        ...TOROPHORE_DEFAULTS,
        colorLaw: law.id,
        colorPalette: palette.id
      });
      codes.push(compiled.code);
      assert.ok(compiled.withinLimit, `${law.id}/${palette.id}: ${compiled.characters}`);
      assert.doesNotThrow(() => new Function(compiled.code));
    }
  }
  assert.equal(new Set(codes).size, TOROPHORE_COLOR_LAWS.length * TOROPHORE_COLOR_PALETTES.length);
});

test("the saved camera stays external to the Torophore genome", () => {
  const original = compileTorophoreGenome(TOROPHORE_DEFAULTS);
  const cameraOnly = compileTorophoreGenome({
    ...TOROPHORE_DEFAULTS,
    yaw: 1.2,
    pitch: -0.5,
    orientation: { x: 1, y: 0, z: 0, w: 0 }
  });

  assert.equal(cameraOnly.code, original.code);
  assert.equal(cameraOnly.id, original.id);
  assert.equal(original.sketch.viewModel, "webgl-orbit");
});
