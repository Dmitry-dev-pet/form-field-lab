import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ORBIT_PITCH,
  clampOrbitPitch,
  createOrbitRotation,
  latentPhaseDepth,
  orbitPitchDelta,
  rotateSpatialPoint
} from "../src/lib/spatialProjection.js";

const almostEqual = (actual, expected, epsilon = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
};

test("front view preserves the original x and y coordinates", () => {
  const point = rotateSpatialPoint(42, -17, 91, createOrbitRotation(0, 0));
  almostEqual(point.x, 42);
  almostEqual(point.y, -17);
  almostEqual(point.z, 91);
});

test("a quarter yaw rotates x into the hidden depth axis", () => {
  const point = rotateSpatialPoint(10, 5, 0, createOrbitRotation(Math.PI / 2, 0));
  almostEqual(point.x, 0);
  almostEqual(point.y, 5);
  almostEqual(point.z, -10);
});

test("phase depth completes the cosine coordinate into a circle", () => {
  const radius = 87;
  const phase = 1.234;
  const x = radius * Math.cos(phase);
  const z = latentPhaseDepth(radius, phase);
  almostEqual(Math.hypot(x, z), radius);
});

test("orbit pitch is clamped before the camera can flip", () => {
  assert.equal(clampOrbitPitch(Math.PI), MAX_ORBIT_PITCH);
  assert.equal(clampOrbitPitch(-Math.PI), -MAX_ORBIT_PITCH);
});

test("Y inversion reverses only the vertical drag direction", () => {
  assert.equal(orbitPitchDelta(20, 0.01, false), 0.2);
  assert.equal(orbitPitchDelta(20, 0.01, true), -0.2);
});
