// Live shader parameters travel as uniforms: never splice slider values into RAW.
// Keeping this schema separate makes future parameterized GLSL presets possible.
export const SPHERICAL_FIELD_CONTROLS = Object.freeze([
  { key: "scale", uniform: "u_fieldScale", label: "Масштаб", min: 0.3, max: 3, step: 0.1, initial: 1, digits: 1, suffix: "×" },
  { key: "detail", uniform: "u_fieldDetail", label: "Детализация", min: 2, max: 7, step: 1, initial: 7, digits: 0, suffix: " ур." },
  { key: "warp", uniform: "u_fieldWarp", label: "Деформация", min: 0, max: 2, step: 0.05, initial: 0.7, digits: 2, suffix: "" },
  { key: "turn", uniform: "u_fieldTurn", label: "Разворот луча", min: 30, max: 95, step: 1, initial: 70, digits: 0, suffix: "-я ит." },
  { key: "hue", uniform: "u_fieldHue", label: "Фаза цвета", min: 0, max: 6.28, step: 0.01, initial: 0, digits: 2, suffix: " рад" }
].map(control => Object.freeze(control)));

export const SPHERICAL_FIELD_DEFAULT_PARAMETERS = Object.freeze(
  Object.fromEntries(SPHERICAL_FIELD_CONTROLS.map(({ key, initial }) => [key, initial]))
);

export function normalizeSphericalFieldParameters(parameters = {}) {
  return Object.fromEntries(SPHERICAL_FIELD_CONTROLS.map(control => {
    const raw = parameters?.[control.key];
    const number = raw == null || raw === "" ? NaN : Number(raw);
    const value = Number.isFinite(number) ? number : control.initial;
    return [control.key, Math.min(control.max, Math.max(control.min, value))];
  }));
}
