import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  compileTopologyGenome,
  TOPOLOGY_GENOME_LIMIT,
  TOPOLOGY_GENOME_PRESETS,
  topologyGenomeDefaults
} from "../src/data/topologyGenomes.js";

function executeFrames(code) {
  let lines = [];
  const renderer = { stroke() { return renderer; } };
  const sandbox = {
    PI: Math.PI,
    sin: Math.sin,
    cos: Math.cos,
    createCanvas() {},
    background() {
      lines = [];
      return renderer;
    },
    line(...coordinates) {
      lines.push(coordinates);
    }
  };
  vm.runInNewContext(code, sandbox);
  sandbox.draw();
  const first = lines.map(line => [...line]);
  sandbox.draw();
  const second = lines.map(line => [...line]);
  return { first, second };
}

function executeFrameAt(code, time) {
  let lines = [];
  const renderer = { stroke() { return renderer; } };
  const sandbox = {
    PI: Math.PI,
    sin: Math.sin,
    cos: Math.cos,
    createCanvas() {},
    background() {
      lines = [];
      return renderer;
    },
    line(...coordinates) {
      lines.push(coordinates);
    }
  };
  vm.runInNewContext(code, sandbox);
  sandbox.draw();
  sandbox.t = time - 1;
  sandbox.draw();
  return lines;
}

function endpointSettings(preset, endpoint) {
  const settings = topologyGenomeDefaults(preset.id);
  for (const control of preset.controls) settings[control.key] = control[endpoint];
  return settings;
}

test("every topology choice is a real executable genome within 280 characters", () => {
  assert.deepEqual(
    TOPOLOGY_GENOME_PRESETS.map(preset => preset.id),
    ["sphere", "plane", "cylinder", "torus", "sphere-torus", "mobius"]
  );
  assert.deepEqual(
    TOPOLOGY_GENOME_PRESETS.map(preset => compileTopologyGenome(preset.defaults).characters),
    [276, 271, 247, 277, 275, 276]
  );

  for (const preset of TOPOLOGY_GENOME_PRESETS) {
    for (const endpoint of ["min", "max"]) {
      const compiled = compileTopologyGenome(endpointSettings(preset, endpoint));
      assert.equal(compiled.code.length, compiled.characters);
      assert.ok(compiled.withinLimit, `${preset.id}/${endpoint}: ${compiled.characters}`);
      assert.ok(compiled.characters <= TOPOLOGY_GENOME_LIMIT);
      assert.doesNotMatch(compiled.code, /WEBGL/);
      assert.match(compiled.code, /#つぶやきProcessing$/);
      assert.doesNotThrow(() => new Function(compiled.code));
    }
  }
});

test("all six compact genomes draw finite animated wireframes", () => {
  for (const preset of TOPOLOGY_GENOME_PRESETS) {
    const compiled = compileTopologyGenome(topologyGenomeDefaults(preset.id));
    const { first, second } = executeFrames(compiled.code);
    assert.ok(first.length >= 480, `${preset.id}: too few edges`);
    assert.equal(second.length, first.length, `${preset.id}: edge count drifted`);
    assert.ok(first.flat().every(Number.isFinite), `${preset.id}: invalid first frame`);
    assert.ok(second.flat().every(Number.isFinite), `${preset.id}: invalid second frame`);
    assert.notDeepEqual(second, first, `${preset.id}: animation is frozen`);
  }
});

test("the sphere-torus RAW contains the transition instead of switching sketches", () => {
  const compiled = compileTopologyGenome(topologyGenomeDefaults("sphere-torus"));
  assert.equal(compiled.characters, 275);
  assert.match(compiled.code, /1\+sin\(a\)\+cos\(v\)/);
  assert.doesNotMatch(compiled.code, /sphere|torus|if|\?/i);

  const horn = executeFrameAt(compiled.code, 0);
  const sphere = executeFrameAt(compiled.code, 99 * Math.PI * 1.5);
  const ring = executeFrameAt(compiled.code, 99 * Math.PI / 2);
  const width = lines => {
    const x = lines.flatMap(line => [line[0], line[2]]);
    return Math.max(...x) - Math.min(...x);
  };
  assert.ok(horn.some(line => Math.hypot(line[0] - 200, line[1] - 200) < 1e-9));
  assert.ok(Math.abs(width(sphere) - 100) < 1e-9);
  assert.ok(Math.abs(width(ring) - 300) < 1e-9);
});

test("genetic controls rebuild the exact sketch identity without recording the camera", () => {
  const original = compileTopologyGenome(topologyGenomeDefaults("torus"));
  const changed = compileTopologyGenome({
    ...topologyGenomeDefaults("torus"),
    genomeA: 71,
    yaw: 2.4,
    pitch: -0.8
  });
  const cameraOnly = compileTopologyGenome({
    ...topologyGenomeDefaults("torus"),
    yaw: 2.4,
    pitch: -0.8
  });

  assert.notEqual(changed.code, original.code);
  assert.notEqual(changed.id, original.id);
  assert.equal(cameraOnly.code, original.code);
  assert.equal(cameraOnly.id, original.id);
});
