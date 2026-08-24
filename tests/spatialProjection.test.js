import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ORBIT_PITCH,
  clampOrbitPitch,
  createOrbitRotation,
  latentPhaseDepth,
  multiplyQuaternions,
  normalizeQuaternion,
  orbitPitchDelta,
  projectTrackballPoint,
  quaternionBetweenVectors,
  quaternionFromAxisAngle,
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

test("a quarter roll rotates the view around its screen axis", () => {
  const point = rotateSpatialPoint(10, 0, 0, createOrbitRotation(0, 0, Math.PI / 2));
  almostEqual(point.x, 0);
  almostEqual(point.y, 10);
  almostEqual(point.z, 0);
});

test("trackball delta maps one unit vector onto another", () => {
  const from = { x: 0, y: 0, z: 1 };
  const to = { x: 0.6, y: -0.3, z: Math.sqrt(0.55) };
  const delta = quaternionBetweenVectors(from, to);
  const point = rotateSpatialPoint(from.x, from.y, from.z, delta);
  almostEqual(point.x, to.x);
  almostEqual(point.y, to.y);
  almostEqual(point.z, to.z);
});

test("trackball Y inversion flips the vertical sphere coordinate", () => {
  const bounds = { left: 0, top: 0, width: 100, height: 100 };
  const direct = projectTrackballPoint(50, 75, bounds, false);
  const inverted = projectTrackballPoint(50, 75, bounds, true);
  almostEqual(direct.x, inverted.x);
  almostEqual(direct.y, -inverted.y);
  almostEqual(direct.z, inverted.z);
});

test("repeated arbitrary rotations remain a unit quaternion", () => {
  const orientation = createOrbitRotation();
  const composed = {};
  for (let index = 0; index < 5000; index++) {
    const delta = quaternionFromAxisAngle(1, 2, 3, 0.001 + index * 1e-7);
    multiplyQuaternions(delta, orientation, composed);
    normalizeQuaternion(composed, orientation);
  }
  almostEqual(Math.hypot(
    orientation.x,
    orientation.y,
    orientation.z,
    orientation.w
  ), 1);
});
