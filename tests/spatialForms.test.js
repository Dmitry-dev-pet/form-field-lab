import test from "node:test";
import assert from "node:assert/strict";
import { spatialForms, spatialLayerDefaults } from "../src/data/spatialForms.js";
import { createPointEngine } from "../src/lib/pointEngine.js";

test("the spatial lab exposes three attributed source forms", () => {
  assert.deepEqual(spatialForms.map(form => form.sketchNumber), [5, 1, 6]);
  assert.equal(new Set(spatialForms.map(form => form.id)).size, spatialForms.length);
  assert.equal(new Set(spatialForms.map(form => form.sketch.id)).size, spatialForms.length);

  for (const form of spatialForms) {
    assert.match(form.sketch.source, /^https:\/\/x\.com\/yuruyurau\/status\//);
    assert.ok(form.primaryControls.some(control => control.key === "depth"));
    assert.ok(form.layers.every(layer => Object.hasOwn(spatialLayerDefaults(form), layer.key)));
  }
});

test("every front projection reproduces its original p5.js frame", () => {
  for (const form of spatialForms) {
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

    for (let index = 1; index <= 200; index++) {
      form.evaluate(index * 37, form.timeStep * 5, form.defaults, layers, target);
      assert.ok(Number.isFinite(target.x), `${form.id}: invalid x`);
      assert.ok(Number.isFinite(target.y), `${form.id}: invalid y`);
      assert.ok(Number.isFinite(target.z), `${form.id}: invalid z`);
      depths.push(target.z);
    }

    assert.ok(Math.max(...depths) - Math.min(...depths) > 10, `${form.id}: depth is flat`);
  }
});
