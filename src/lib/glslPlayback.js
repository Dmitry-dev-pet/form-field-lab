// Shader animation rate is independent of the browser's drawing FPS.
// Both Twigl time (t) and virtual frame (f) run on this same speed scale.
export const GLSL_SPEED_MIN = 0.05;
export const GLSL_SPEED_MAX = 4;
export const GLSL_SPEED_STEP = 0.05;
export const GLSL_SPEED_DEFAULT = 1;
export const GLSL_SPEED_PRESETS = Object.freeze([0.1, 0.25, 0.5, 1, 2, 4]);

export function normalizeGlslSpeed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return GLSL_SPEED_DEFAULT;
  return Math.max(GLSL_SPEED_MIN, Math.min(GLSL_SPEED_MAX, number));
}

export function advanceGlslClock(clock, deltaMilliseconds, speed) {
  // Cap background/tab-suspension jumps, exactly like the existing renderer.
  const delta = Number.isFinite(deltaMilliseconds)
    ? Math.max(0, Math.min(deltaMilliseconds, 250)) / 1000
    : 0;
  const rate = normalizeGlslSpeed(speed);
  return {
    elapsed: clock.elapsed + delta * rate,
    frameNumber: clock.frameNumber + rate
  };
}
