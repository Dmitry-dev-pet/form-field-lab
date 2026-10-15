import test from "node:test";
import assert from "node:assert/strict";
import {
  SPHERICAL_FIELD_CONTROLS, SPHERICAL_FIELD_DEFAULT_PARAMETERS,
  normalizeSphericalFieldParameters
} from "../src/lib/glslParameters.js";

test("five live controls have stable unique ids, uniforms and safe default values", () => {
  assert.deepEqual(SPHERICAL_FIELD_CONTROLS.map(control => control.key), [
    "scale", "detail", "warp", "turn", "hue"
  ]);
  assert.equal(new Set(SPHERICAL_FIELD_CONTROLS.map(control => control.uniform)).size, 5);
  assert.deepEqual(SPHERICAL_FIELD_DEFAULT_PARAMETERS, {
    scale: 1, detail: 7, warp: 0.7, turn: 70, hue: 0
  });
  for (const control of SPHERICAL_FIELD_CONTROLS) {
    assert.ok(control.min <= control.initial && control.initial <= control.max);
    assert.ok(control.step > 0);
    assert.equal(SPHERICAL_FIELD_DEFAULT_PARAMETERS[control.key], control.initial);
  }
});

test("uniform inputs are numeric, bounded and have reliable defaults", () => {
  assert.deepEqual(normalizeSphericalFieldParameters(), SPHERICAL_FIELD_DEFAULT_PARAMETERS);
  assert.deepEqual(normalizeSphericalFieldParameters({
    scale: "2.5", detail: 100, warp: -3, turn: Infinity, hue: 7
  }), { scale: 2.5, detail: 7, warp: 0, turn: 70, hue: 6.28 });
  assert.deepEqual(normalizeSphericalFieldParameters({
    scale: null, detail: "", warp: "unusable", turn: 30, hue: 1.4
  }), { scale: 1, detail: 7, warp: 0.7, turn: 30, hue: 1.4 });
  const input = { scale: 0.8 };
  normalizeSphericalFieldParameters(input);
  assert.deepEqual(input, { scale: 0.8 }, "normalization must not mutate UI state");
});
