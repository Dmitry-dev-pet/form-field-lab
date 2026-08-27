import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  compileTorophoreGenome,
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
    map(value, fromLow, fromHigh, toLow, toHigh) {
      return toLow + (toHigh - toLow) * (value - fromLow) / (fromHigh - fromLow);
    },
    createCanvas() {},
    noStroke() {},
    clear() { organs = []; },
    fill(value) { current.color = value; },
    push() { current = { color: current.color }; },
    translate(x, y, z) { current.position = [x, y, z]; },
    torus(radius, tubeRadius = 50) {
      organs.push({
        index: sandbox.i,
        phase: sandbox.d,
        color: current.color,
        position: current.position,
        radius,
        tubeRadius
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

test("the torus-flow canon is the exact provided 200-character source", () => {
  assert.equal(TOROPHORE_GENOME, TOROPHORE_SOURCE);
  assert.equal(TOROPHORE_GENOME_CHARACTERS, TOROPHORE_SOURCE.length);
  assert.equal(TOROPHORE_GENOME_CHARACTERS, 200);
  assert.equal(TOROPHORE_GENOME_LIMIT, 280);
  assert.match(TOROPHORE_GENOME, /noise\(i-C\)\*TAU\*2/);
  assert.match(TOROPHORE_GENOME, /translate\(cos\(d\)\*i,sin\(d\)\*i,0\)/);
  assert.match(TOROPHORE_GENOME, /fill\(map\(sin\(d\),-1,1,255,0\)\)/);
  assert.match(TOROPHORE_GENOME, /torus\(W\/6\)/);
  assert.doesNotMatch(TOROPHORE_GENOME, /rotate[XYZ]?\(/);
  assert.doesNotThrow(() => new Function(TOROPHORE_GENOME));

  const frames = executeFrames(TOROPHORE_GENOME);
  assert.equal(frames.first.length, 480);
  assert.ok(frames.first.flatMap(organ => organ.position).every(Number.isFinite));
  assert.ok(frames.first.every(organ => organ.position[2] === 0));
  assert.ok(frames.first.every(organ => organ.radius === 120));
  assert.ok(frames.first.every(organ => organ.tubeRadius === 50));
  assert.ok(new Set(frames.first.map(organ => organ.color)).size > 100);

  const firstPhase = frames.first.find(organ => organ.index === 100).phase;
  const advectedPhase = frames.second.find(organ => organ.index === 102).phase;
  assert.ok(Math.abs(firstPhase - advectedPhase) < 1e-12);
});

test("each source control changes only a compact constant and stays below 280", () => {
  const endpoints = [
    compileTorophoreGenome({
      ...TOROPHORE_DEFAULTS,
      genomeSpeed: 1,
      organCount: 120,
      turns: 1,
      noiseScale: 1,
      organRadius: 60,
      breath: 0
    }),
    compileTorophoreGenome({
      ...TOROPHORE_DEFAULTS,
      genomeSpeed: 5,
      organCount: 720,
      turns: 5,
      noiseScale: 9,
      organRadius: 180,
      breath: 0.9
    })
  ];

  for (const compiled of endpoints) {
    assert.ok(compiled.withinLimit, `${compiled.characters} characters`);
    assert.ok(compiled.characters <= TOROPHORE_GENOME_LIMIT);
    assert.doesNotThrow(() => new Function(compiled.code));
    const frame = executeFrames(compiled.code).first;
    assert.equal(frame.length, compiled.parameters.organCount);
    assert.ok(frame.flatMap(organ => organ.position).every(Number.isFinite));
  }

  assert.match(endpoints[0].code, /C\+=1/);
  assert.match(endpoints[0].code, /for\(i=120/);
  assert.match(endpoints[1].code, /noise\(\(i-C\)\/9\)/);
  assert.match(endpoints[1].code, /torus\(180,50\*\(1\+\.9\*sin\(d\+C\/30\)\)\)/);
});

test("breathing modulates only the torus tube radius through the source phase", () => {
  const compiled = compileTorophoreGenome({ ...TOROPHORE_DEFAULTS, breath: 0.6 });
  const frame = executeFrames(compiled.code).first;
  const tubeRadii = frame.map(organ => organ.tubeRadius);

  assert.equal(compiled.parameters.breath, 0.6);
  assert.match(compiled.code, /torus\(W\/6,50\*\(1\+\.6\*sin\(d\+C\/30\)\)\)/);
  assert.ok(compiled.withinLimit, `${compiled.characters} characters`);
  assert.ok(Math.min(...tubeRadii) >= 20);
  assert.ok(Math.max(...tubeRadii) <= 80);
  assert.ok(new Set(tubeRadii.map(value => value.toFixed(3))).size > 100);
  assert.ok(frame.every(organ => organ.radius === 120));
  assert.ok(frame.every(organ => organ.position[2] === 0));
});

test("resetting source controls reconstructs the literal source", () => {
  const original = compileTorophoreGenome(TOROPHORE_DEFAULTS);
  const changed = compileTorophoreGenome({ ...TOROPHORE_DEFAULTS, breath: 0.6 });
  const cameraOnly = compileTorophoreGenome({
    ...TOROPHORE_DEFAULTS,
    yaw: 1.2,
    pitch: -0.5,
    orientation: { x: 1, y: 0, z: 0, w: 0 }
  });

  assert.equal(original.code, TOROPHORE_SOURCE);
  assert.notEqual(changed.code, original.code);
  assert.equal(cameraOnly.code, original.code);
  assert.equal(cameraOnly.id, original.id);
  assert.equal(original.sketch.viewModel, "webgl-orbit");
});
