export const PELAGION_MOTION_MODE = Object.freeze({
  continuous: "continuous",
  livingStroke: "living-stroke"
});

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, Number(value) || 0));

export function smoothStrokeEnvelope(phase) {
  const cycle = 0.5 - 0.5 * Math.cos(phase);
  return cycle * cycle * (3 - 2 * cycle);
}

export function pelagionMotionState(parameter, time, settings, target = {}) {
  const u = clamp(parameter, 0, 1);
  if (settings.motionMode !== PELAGION_MOTION_MODE.livingStroke) {
    target.beat = 0;
    target.localPhase = 0;
    target.stroke = 1;
    target.effort = 1;
    target.travel = time;
    target.axialScale = 1;
    target.volumeScale = 1;
    return target;
  }

  const frequency = clamp(settings.strokeFrequency, 0.25, 12);
  const accent = clamp(settings.strokeAccent, 0, 0.95);
  const followThrough = clamp(settings.followThrough, 0, Math.PI * 2);
  const beat = time * frequency;
  const localPhase = beat - followThrough * u;
  const stroke = smoothStrokeEnvelope(localPhase);
  const bodyProfile = Math.sin(Math.PI * u) ** 0.7;
  const axialScale = 1 - 0.14 * accent * stroke * bodyProfile;

  target.beat = beat;
  target.localPhase = localPhase;
  target.stroke = stroke;
  target.effort = 0.28 + 0.72 * stroke;
  target.travel = time + accent / frequency * Math.sin(localPhase);
  target.axialScale = axialScale;
  target.volumeScale = 1 / Math.sqrt(axialScale);
  return target;
}
