import test from "node:test";
import assert from "node:assert/strict";
import {
  GLSL_SPEED_MIN, GLSL_SPEED_MAX, GLSL_SPEED_DEFAULT,
  GLSL_SPEED_STEP, GLSL_SPEED_PRESETS,
  normalizeGlslSpeed, advanceGlslClock
} from "../src/lib/glslPlayback.js";

test("GLSL speed values cover 0.05×–4×, default 1×", () => {
  assert.equal(GLSL_SPEED_MIN, 0.05);
  assert.equal(GLSL_SPEED_MAX, 4);
  assert.equal(GLSL_SPEED_STEP, 0.05);
  assert.equal(GLSL_SPEED_DEFAULT, 1);
  assert.deepEqual(GLSL_SPEED_PRESETS, [0.1, 0.25, 0.5, 1, 2, 4]);
  assert.equal(normalizeGlslSpeed(-2), 0.05);
  assert.equal(normalizeGlslSpeed(10), 4);
  assert.equal(normalizeGlslSpeed("0.25"), 0.25);
  assert.equal(normalizeGlslSpeed(NaN), 1);
});

test("speed scales both the shader time t and virtual frame f, not FPS", () => {
  const start = { elapsed: 2, frameNumber: 15 };
  const slow = advanceGlslClock(start, 40, 0.25);
  assert.ok(Math.abs(slow.elapsed - 2.01) < 1e-10);
  assert.equal(slow.frameNumber, 15.25);
  // Changing the rate uses the previous clock (no time/frame discontinuity).
  const fast = advanceGlslClock(slow, 40, 4);
  assert.ok(Math.abs(fast.elapsed - 2.17) < 1e-10);
  assert.equal(fast.frameNumber, 19.25);
  assert.deepEqual(start, { elapsed: 2, frameNumber: 15 });
});

test("long browser suspensions remain bounded, and a pause does not advance time", () => {
  const start = { elapsed: 4, frameNumber: 99 };
  const afterBackground = advanceGlslClock(start, 30_000, 4);
  assert.deepEqual(afterBackground, { elapsed: 5, frameNumber: 103 });
  const afterResume = advanceGlslClock(afterBackground, 0, 4);
  assert.deepEqual(afterResume, { elapsed: 5, frameNumber: 107 });
  // No call to advanceGlslClock while paused; redraw() doesn't mutate clock.
  assert.deepEqual(afterResume, { elapsed: 5, frameNumber: 107 });
});

test("frame-driven and time-driven shaders share independent clock values", () => {
  let clock = { elapsed: 0, frameNumber: 0 };
  for (let frame = 0; frame < 10; frame++) {
    clock = advanceGlslClock(clock, 1000 / 24, 0.5);
  }
  assert.ok(Math.abs(clock.elapsed - (10 / 24) * 0.5) < 1e-9);
  assert.equal(clock.frameNumber, 5);
});
