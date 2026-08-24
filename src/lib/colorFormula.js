export const COLOR_VARIABLES = Object.freeze([
  "i", "y", "k", "e", "d", "c", "t", "branch", "forms",
  "x", "Y", "z", "u", "r", "angle", "mix"
]);

export const COLOR_PRESETS = Object.freeze([
  {
    id: "phase",
    label: "Фаза",
    expression: "0.5 + 0.5 * sin(c + 0.35 * d + 0.8 * t)"
  },
  {
    id: "depth",
    label: "Глубина",
    expression: "smoothstep(-6, 6, d)"
  },
  {
    id: "branches",
    label: "Ветви",
    expression: "fract((branch + 0.25 * sin(t)) / max(forms, 1))"
  },
  {
    id: "interference",
    label: "Интерференция",
    expression: "0.5 + 0.5 * sin(k * 2 + e * 4 - d * 4 + 0.6 * t)"
  },
  {
    id: "fibers",
    label: "Волокна",
    expression: "fract(0.12 * y + 0.2 * sin(k * 2 - t))"
  }
]);

export const DEFAULT_COLOR_STATE = Object.freeze({
  mode: "formula",
  preset: "phase",
  expression: COLOR_PRESETS[0].expression,
  colorA: "#d7ff58",
  colorB: "#8ea1ff"
});

const formulaMath = Object.freeze({
  PI: Math.PI,
  TAU: Math.PI * 2,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  abs: Math.abs,
  sqrt: Math.sqrt,
  min: Math.min,
  max: Math.max,
  atan2: Math.atan2,
  mag: Math.hypot,
  clamp: (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value)),
  fract: value => value - Math.floor(value),
  lerp: (start, end, amount) => start + (end - start) * amount,
  smoothstep: (edgeA, edgeB, value) => {
    if (edgeA === edgeB) return value < edgeA ? 0 : 1;
    const amount = Math.min(1, Math.max(0, (value - edgeA) / (edgeB - edgeA)));
    return amount * amount * (3 - 2 * amount);
  }
});

const allowedNames = new Set([
  ...COLOR_VARIABLES,
  ...Object.keys(formulaMath)
]);

const tokenPattern = /\s*(?:((?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(\*\*|[()+\-*/%,^]))/gy;

function normalizeExpression(expression) {
  const source = String(expression ?? "").trim();
  if (!source) throw new Error("Введите выражение для u(i,t).");
  if (source.length > 220) throw new Error("Формула слишком длинная: максимум 220 символов.");

  const tokens = [];
  const variables = new Set();
  const names = new Set();
  let cursor = 0;
  while (cursor < source.length) {
    tokenPattern.lastIndex = cursor;
    const match = tokenPattern.exec(source);
    if (!match || match.index !== cursor) {
      throw new Error(`Недопустимый символ около «${source.slice(cursor, cursor + 12)}».`);
    }
    const [, number, identifier, operator] = match;
    if (identifier && !allowedNames.has(identifier)) {
      throw new Error(`Неизвестное имя «${identifier}».`);
    }
    if (identifier) names.add(identifier);
    if (identifier && COLOR_VARIABLES.includes(identifier)) variables.add(identifier);
    tokens.push(operator === "^" ? "**" : number || identifier || operator);
    cursor = tokenPattern.lastIndex;
    if (tokens.length > 120) throw new Error("Формула слишком сложная: сократите выражение.");
  }
  return { normalized: tokens.join(" "), variables, names };
}

export function clampUnit(value) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export function compileColorFormula(expression) {
  const { normalized, variables, names } = normalizeExpression(expression);
  const variableDeclarations = [...variables]
    .map(name => `const ${name}=scope.${name};`)
    .join("");
  const mathDeclarations = [...names]
    .filter(name => Object.hasOwn(formulaMath, name))
    .map(name => `const ${name}=math.${name};`)
    .join("");

  let compiled;
  try {
    compiled = new Function(
      "scope",
      "math",
      `"use strict";${variableDeclarations}${mathDeclarations}return (${normalized});`
    );
  } catch {
    throw new Error("Не удалось разобрать выражение: проверьте скобки и операторы.");
  }

  const evaluator = scope => {
    try {
      return clampUnit(compiled(scope, formulaMath));
    } catch {
      return 0.5;
    }
  };
  Object.defineProperty(evaluator, "variables", { value: variables });
  return evaluator;
}

export function normalizeHexColor(value, fallback) {
  const candidate = String(value ?? "").trim();
  const withHash = candidate.startsWith("#") ? candidate : `#${candidate}`;
  return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash.toLowerCase() : fallback;
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [value >> 16, (value >> 8) & 255, value & 255];
}

export function buildColorPalette(colorA, colorB, alpha, steps = 24) {
  const count = Math.max(2, Math.round(steps));
  const start = hexToRgb(normalizeHexColor(colorA, DEFAULT_COLOR_STATE.colorA));
  const end = hexToRgb(normalizeHexColor(colorB, DEFAULT_COLOR_STATE.colorB));
  const normalizedAlpha = clampUnit(Number(alpha) / 255);

  return Array.from({ length: count }, (_, index) => {
    const amount = index / (count - 1);
    const channels = start.map((channel, channelIndex) =>
      Math.round(channel + (end[channelIndex] - channel) * amount)
    );
    return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${normalizedAlpha})`;
  });
}

export function presetById(id) {
  return COLOR_PRESETS.find(preset => preset.id === id) || COLOR_PRESETS[0];
}

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function readColorState(query = {}) {
  const requestedPreset = String(firstQueryValue(query.cp) || DEFAULT_COLOR_STATE.preset);
  const preset = requestedPreset === "custom"
    ? "custom"
    : presetById(requestedPreset).id;
  const presetExpression = preset === "custom"
    ? DEFAULT_COLOR_STATE.expression
    : presetById(preset).expression;

  return {
    mode: firstQueryValue(query.cm) === "solid" ? "solid" : "formula",
    preset,
    expression: String(firstQueryValue(query.ce) || presetExpression).slice(0, 220),
    colorA: normalizeHexColor(firstQueryValue(query.ca), DEFAULT_COLOR_STATE.colorA),
    colorB: normalizeHexColor(firstQueryValue(query.cb), DEFAULT_COLOR_STATE.colorB)
  };
}

export function mergeColorQuery(query = {}, state = DEFAULT_COLOR_STATE) {
  const { cm, cp, ce, ca, cb, ...rest } = query;
  const next = { ...rest };
  if (state.mode !== DEFAULT_COLOR_STATE.mode) next.cm = state.mode;
  if (state.colorA.toLowerCase() !== DEFAULT_COLOR_STATE.colorA) next.ca = state.colorA.slice(1);
  if (state.colorB.toLowerCase() !== DEFAULT_COLOR_STATE.colorB) next.cb = state.colorB.slice(1);
  if (state.mode === "formula" && state.preset !== DEFAULT_COLOR_STATE.preset) next.cp = state.preset;
  if (state.mode === "formula" && state.preset === "custom") next.ce = state.expression;
  return next;
}
