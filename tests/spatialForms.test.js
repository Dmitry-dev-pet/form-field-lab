import test from "node:test";
import assert from "node:assert/strict";
import { spatialForms, spatialLayerDefaults } from "../src/data/spatialForms.js";
import {
  compileTopologyGenome,
  topologyGenomeDefaults
} from "../src/data/topologyGenomes.js";
import { GRID_TOPOLOGY_PRESETS, resolveGridDimensions } from "../src/lib/meshTopology.js";
import { createPointEngine } from "../src/lib/pointEngine.js";

test("the spatial lab separates attributed lifts from synthetic entities", () => {
  const attributed = spatialForms.filter(form => form.sketch);
  const synthetic = spatialForms.filter(form => !form.sketch);

  assert.deepEqual(attributed.map(form => form.sketchNumber), [5, 1, 6]);
  assert.deepEqual(synthetic.map(form => form.id), ["sphere-grid", "pelagion", "chronophore"]);
  assert.equal(new Set(spatialForms.map(form => form.id)).size, spatialForms.length);
  assert.equal(new Set(attributed.map(form => form.sketch.id)).size, attributed.length);

  for (const form of attributed) {
    assert.match(form.sketch.source, /^https:\/\/x\.com\/yuruyurau\/status\//);
  }
  for (const form of spatialForms) {
    assert.ok(form.meshGenome || form.primaryControls.some(control => control.key === "depth"));
    assert.ok(form.layers.every(layer => Object.hasOwn(spatialLayerDefaults(form), layer.key)));
    assert.ok(form.sketch || form.genomeSketch, `${form.id}: RAW source is missing`);
  }
});

test("the mesh baseline decodes the exact compact sphere genome", () => {
  const form = spatialForms.find(item => item.id === "sphere-grid");
  const layers = spatialLayerDefaults(form);
  const target = {};
  const { vertexCount } = resolveGridDimensions(form.mesh, form.defaults);

  assert.equal(form.defaults.renderMode, "wireframe");
  assert.equal(form.defaults.topology, "sphere");
  assert.equal(vertexCount, 450);
  assert.equal(compileTopologyGenome(form.defaults).characters, 276);
  assert.equal(form.layers.length, 0);

  for (let index = 0; index < vertexCount; index += 17) {
    form.evaluate(index, 1, form.defaults, layers, target);
    assert.ok([target.x, target.y, target.z].every(Number.isFinite));
  }
});

test("all seven topology embeddings are finite spatial surfaces", () => {
  const form = spatialForms.find(item => item.id === "sphere-grid");
  const layers = spatialLayerDefaults(form);

  for (const topology of GRID_TOPOLOGY_PRESETS) {
    const settings = {
      ...form.defaults,
      ...topologyGenomeDefaults(topology.id)
    };
    const dimensions = resolveGridDimensions(form.mesh, settings);
    const axes = { x: [], y: [], z: [] };
    const target = {};
    for (let index = 0; index < dimensions.vertexCount; index += 7) {
      form.evaluate(index, 0.7, settings, layers, target);
      for (const axis of Object.keys(axes)) {
        assert.ok(Number.isFinite(target[axis]), `${topology.id}: invalid ${axis}`);
        axes[axis].push(target[axis]);
      }
    }
    assert.ok(Math.max(...axes.x) - Math.min(...axes.x) > 10, `${topology.id}: x is flat`);
    assert.ok(Math.max(...axes.y) - Math.min(...axes.y) > 10, `${topology.id}: y is flat`);
    assert.ok(Math.max(...axes.z) - Math.min(...axes.z) > 10, `${topology.id}: z is flat`);
  }
});

test("the ichthyomorph keeps its head still while the tail wave travels", () => {
  const form = spatialForms.find(item => item.id === "sphere-grid");
  const settings = { ...form.defaults, ...topologyGenomeDefaults("ichthyo") };
  const layers = spatialLayerDefaults(form);
  const dimensions = resolveGridDimensions(form.mesh, settings);
  const headBefore = {};
  const headAfter = {};
  const tailBefore = {};
  const tailAfter = {};

  form.evaluate(0, 0, settings, layers, headBefore);
  form.evaluate(0, Math.PI / 2, settings, layers, headAfter);
  form.evaluate(dimensions.vertexCount - 1, 0, settings, layers, tailBefore);
  form.evaluate(dimensions.vertexCount - 1, Math.PI / 2, settings, layers, tailAfter);

  assert.ok(Math.abs(headAfter.x - headBefore.x) < 1e-9);
  assert.ok(Math.abs(tailAfter.x - tailBefore.x) > 20);
});

test("one compact genome passes sphere, horn and ring-torus images", () => {
  const form = spatialForms.find(item => item.id === "sphere-grid");
  const settings = {
    ...form.defaults,
    ...topologyGenomeDefaults("sphere-torus")
  };
  const layers = spatialLayerDefaults(form);
  const dimensions = resolveGridDimensions(form.mesh, settings);
  const target = {};
  const radius = settings.genomeA;
  const projection = settings.genomeProjection / 100;

  let sphereError = 0;
  for (let index = 0; index < dimensions.vertexCount; index++) {
    form.evaluate(index, 99 * Math.PI * 1.5, settings, layers, target);
    const pureY = target.y - 200 + target.z * projection;
    sphereError = Math.max(sphereError, Math.abs(
      Math.hypot(target.x - 200, pureY, target.z) - radius
    ));
  }
  assert.ok(sphereError < 1e-9, `sphere image error ${sphereError}`);

  const cylindricalRadii = [];
  for (let index = 0; index < dimensions.vertexCount; index++) {
    form.evaluate(index, 99 * Math.PI / 2, settings, layers, target);
    cylindricalRadii.push(Math.hypot(target.x - 200, target.z));
  }
  assert.ok(Math.abs(Math.min(...cylindricalRadii) - radius) < 1e-9);
  assert.ok(Math.abs(Math.max(...cylindricalRadii) - radius * 3) < 1e-9);

  form.evaluate(8 * dimensions.columns, 0, settings, layers, target);
  assert.ok(Math.hypot(target.x - 200, target.z) < 1e-9, "horn singularity is missing");
});

test("every front projection reproduces its original p5.js frame", () => {
  for (const form of spatialForms.filter(item => item.sketch)) {
    const expected = createPointEngine(form.sketch).frame();
    const actual = [];
    const target = {};
    const layers = spatialLayerDefaults(form);

    for (let index = form.defaults.pointCount; index--;) {
      form.evaluate(index, form.timeStep, form.defaults, layers, target);
      if (Number.isFinite(target.x) && Number.isFinite(target.y)) {
        actual.push([target.x, target.y]);
      }
    }

    assert.equal(actual.length, expected.length, `${form.id}: point count drifted`);
    let maximumError = 0;
    for (let index = 0; index < expected.length; index++) {
      maximumError = Math.max(
        maximumError,
        Math.abs(actual[index][0] - expected[index][0]),
        Math.abs(actual[index][1] - expected[index][1])
      );
    }
    assert.ok(maximumError < 1e-9, `${form.id}: front projection error ${maximumError}`);
  }
});

test("each lift adds finite, non-flat depth without changing x/y", () => {
  for (const form of spatialForms) {
    const layers = spatialLayerDefaults(form);
    const target = {};
    const depths = [];
    const pointCount = form.mesh
      ? resolveGridDimensions(form.mesh, form.defaults).vertexCount
      : form.defaults.pointCount;

    for (let index = 1; index <= 200; index++) {
      form.evaluate((index * 37) % pointCount, form.timeStep * 5, form.defaults, layers, target);
      assert.ok(Number.isFinite(target.x), `${form.id}: invalid x`);
      assert.ok(Number.isFinite(target.y), `${form.id}: invalid y`);
      assert.ok(Number.isFinite(target.z), `${form.id}: invalid z`);
      depths.push(target.z);
    }

    assert.ok(Math.max(...depths) - Math.min(...depths) > 10, `${form.id}: depth is flat`);
  }
});

test("Pelagion has a local, finite response to stimulation", () => {
  const form = spatialForms.find(item => item.id === "pelagion");
  const layers = spatialLayerDefaults(form);
  const calm = {};
  const stimulated = {};
  const index = 5789;

  form.evaluate(index, 0.75, form.defaults, layers, calm, { strength: 0, u: 0.5, x: 0, y: 0 });
  form.evaluate(index, 0.75, form.defaults, layers, stimulated, { strength: 1, u: 0.5, x: 0.6, y: -0.4 });

  assert.ok([stimulated.x, stimulated.y, stimulated.z].every(Number.isFinite));
  assert.ok(Math.hypot(
    calm.x - stimulated.x,
    calm.y - stimulated.y,
    calm.z - stimulated.z
  ) > 1);
});

test("Chronophore preserves a finite knot and reacts across response phases", () => {
  const form = spatialForms.find(item => item.id === "chronophore");
  const layers = spatialLayerDefaults(form);
  const calm = {};
  const rupture = {};
  const division = {};
  const index = 9113;

  form.evaluate(index, 0.9, form.defaults, layers, calm, {
    strength: 0, age: 0, u: 0.5, x: 0, y: 0
  });
  form.evaluate(index, 0.9, form.defaults, layers, rupture, {
    strength: 0.94, age: 0.28, u: 0.5, x: 0.4, y: -0.2
  });
  form.evaluate(index, 0.9, form.defaults, layers, division, {
    strength: 0.48, age: 2.2, u: 0.5, x: 0.4, y: -0.2
  });

  for (const point of [calm, rupture, division]) {
    assert.ok([point.x, point.y, point.z].every(Number.isFinite));
  }
  assert.ok(Math.hypot(
    calm.x - rupture.x,
    calm.y - rupture.y,
    calm.z - rupture.z
  ) > 1);
  assert.ok(Math.hypot(
    calm.x - division.x,
    calm.y - division.y,
    calm.z - division.z
  ) > 1);
  assert.equal(form.defaults.windingP, 2);
  assert.equal(form.defaults.windingQ, 3);
});
