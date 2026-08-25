import {
  DEFAULT_COLOR_STATE,
  normalizeFormulaExpression,
  normalizeHexColor
} from "./colorFormula.js";
import {
  createOrbitRotation,
  normalizeQuaternion,
  quaternionToEuler,
  quaternionToRotationMatrix
} from "./spatialProjection.js";

export const GENOME_ENTITY_STORAGE_KEY = "form-field-lab:genome-entities:v1";
export const GENOME_ENTITY_VERSION = 1;

const CORE_SETTINGS = Object.freeze([
  ["speed", "скорость"],
  ["windingP", "обороты p"],
  ["windingQ", "переплетения q"],
  ["radius", "радиус"],
  ["knotRadius", "глубина узла"],
  ["tubeRadius", "толщина нитей"],
  ["strands", "число нитей"],
  ["depth", "глубина z"],
  ["flow", "поток"],
  ["knotDrift", "дрейф фазы"],
  ["fiberTwist", "скручивание"],
  ["fiberSpeed", "скорость нитей"],
  ["pulse", "дыхание"],
  ["pulseFrequency", "ритм дыхания"],
  ["pointCount", "число точек"],
  ["alpha", "прозрачность"],
  ["backgroundColor", "фон"]
]);

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, Number(value) || 0));

function compactNumber(value, digits = 5) {
  const rounded = Number((Number(value) || 0).toFixed(digits));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function displayNumber(value, digits = 3) {
  return Number(value).toLocaleString("ru-RU", { maximumFractionDigits: digits });
}

function displaySetting(value) {
  return typeof value === "number" ? displayNumber(value) : String(value);
}

function hexToRgb(value, fallback) {
  const normalized = normalizeHexColor(value, fallback);
  const packed = Number.parseInt(normalized.slice(1), 16);
  return [packed >> 16, (packed >> 8) & 255, packed & 255];
}

function codeSignature(source) {
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function portableFormula(color) {
  if (color.mode !== "formula") return { expression: "0", helpers: "" };
  const { normalized, names } = normalizeFormulaExpression(color.expression);
  const expression = normalized.replace(/\bt\b/g, "T");
  const helperParts = [];
  if (names.has("clamp") || names.has("smoothstep")) {
    helperParts.push("clamp=(x,a=0,b=1)=>min(b,max(a,x))");
  }
  if (names.has("fract")) helperParts.push("fract=x=>x-floor(x)");
  if (names.has("smoothstep")) {
    helperParts.push("smoothstep=(a,b,x)=>(x=clamp((x-a)/(b-a)),x*x*(3-2*x))");
  }
  return {
    expression,
    helpers: helperParts.length ? `${helperParts.join(",")},` : ""
  };
}

function layerValue(layers, key, fallback = true) {
  return layers && Object.hasOwn(layers, key) ? Boolean(layers[key]) : fallback;
}

function changedValue(before, after) {
  if (typeof before === "number" || typeof after === "number") {
    return Math.abs(Number(before) - Number(after)) > 1e-8;
  }
  return before !== after;
}

function colorStateChanged(before = DEFAULT_COLOR_STATE, after = DEFAULT_COLOR_STATE) {
  return ["mode", "preset", "expression", "colorA", "colorB"]
    .some(key => before[key] !== after[key]);
}

export function normalizeSpatialSnapshot(snapshot = {}) {
  const orientation = normalizeQuaternion(
    snapshot.orientation && typeof snapshot.orientation === "object"
      ? snapshot.orientation
      : createOrbitRotation(
        Number(snapshot.yaw) || 0,
        clamp(snapshot.pitch, -Math.PI * 0.49, Math.PI * 0.49),
        Number(snapshot.roll) || 0
      )
  );
  const euler = quaternionToEuler(orientation);
  return Object.freeze({
    orientation: Object.freeze({ ...orientation }),
    yaw: euler.yaw,
    pitch: euler.pitch,
    roll: euler.roll,
    time: Math.max(0, Number(snapshot.time) || 0)
  });
}

export function compileChronophoreImprint({
  settings,
  layers = {},
  color = DEFAULT_COLOR_STATE,
  pose = {},
  originalCode = "",
  originalDefaults = {},
  originalLayers = {},
  originalColor = DEFAULT_COLOR_STATE
}) {
  const spatial = normalizeSpatialSnapshot(pose);
  const pointCount = Math.round(clamp(settings.pointCount, 1000, 30000));
  const strands = Math.round(clamp(settings.strands, 3, 24));
  const windingP = Math.round(clamp(settings.windingP, 1, 8));
  const windingQ = Math.round(clamp(settings.windingQ, 1, 12));
  const knotRadius = layerValue(layers, "knot") ? settings.knotRadius : 0;
  const tubeRadius = layerValue(layers, "fibers") ? settings.tubeRadius : 0;
  const flow = layerValue(layers, "flow") ? settings.flow : 0;
  const fiberSpeed = layerValue(layers, "flow") ? settings.fiberSpeed : 0;
  const rotation = quaternionToRotationMatrix(spatial.orientation);
  const background = normalizeHexColor(settings.backgroundColor, "#05070c");
  const colorA = hexToRgb(color.colorA, DEFAULT_COLOR_STATE.colorA);
  const colorB = hexToRgb(color.colorB, DEFAULT_COLOR_STATE.colorB);
  const formula = portableFormula(color);
  const alpha = Math.round(clamp(settings.alpha, 1, 255));
  const step = 0.012 * clamp(settings.speed, 0, 8);

  const code = `${formula.helpers}o=${compactNumber(spatial.time)},t=0,draw=_=>{t||createCanvas(w=400,w);background("${background}");for(t+=${compactNumber(step)},i=${pointCount};i--;){T=t+o;u=(i/${pointCount}+T*${compactNumber(flow)})%1;a=TAU*${windingP}*u;v=TAU*${windingQ}*u+T*${compactNumber(settings.knotDrift)};b=TAU*(i%${strands}/${strands}+${compactNumber(settings.fiberTwist)}*u)+T*${compactNumber(fiberSpeed)};g=${compactNumber(knotRadius)}*(1+${compactNumber(settings.pulse)}*sin(T*${compactNumber(settings.pulseFrequency)}-TAU*${windingQ}*u));r=${compactNumber(settings.radius)}+g*cos(v)+${compactNumber(tubeRadius)}*cos(b);z=${compactNumber(settings.depth)}*(g*sin(v)+${compactNumber(tubeRadius)}*sin(b));x=r*cos(a);Y=r*sin(a);X=x*${compactNumber(rotation.m00)}+Y*${compactNumber(rotation.m01)}+z*${compactNumber(rotation.m02)};V=x*${compactNumber(rotation.m10)}+Y*${compactNumber(rotation.m11)}+z*${compactNumber(rotation.m12)};y=u;k=sin(v);e=0;d=z;c=v+b;branch=i%${strands};forms=${strands};angle=atan2(Y,x);mix=0;s=constrain(${formula.expression},0,1);stroke(${colorA[0]}+${colorB[0]-colorA[0]}*s,${colorA[1]}+${colorB[1]-colorA[1]}*s,${colorA[2]}+${colorB[2]-colorA[2]}*s,${alpha});point(X+200,V+200)}}`;

  const mutations = [];
  for (const [key, label] of CORE_SETTINGS) {
    if (!Object.hasOwn(originalDefaults, key) || !changedValue(originalDefaults[key], settings[key])) continue;
    mutations.push({
      key,
      label,
      before: displaySetting(originalDefaults[key]),
      after: displaySetting(settings[key])
    });
  }
  const layerChanges = Object.keys({ ...originalLayers, ...layers })
    .filter(key => Boolean(originalLayers[key]) !== Boolean(layers[key]));
  if (layerChanges.length) {
    mutations.push({
      key: "layers",
      label: "анатомические слои",
      before: layerChanges.filter(key => originalLayers[key]).join(", ") || "отключены",
      after: layerChanges.filter(key => layers[key]).join(", ") || "отключены"
    });
  }
  if (colorStateChanged(originalColor, color)) {
    mutations.push({
      key: "color",
      label: "цвет",
      before: originalColor.mode === "formula" ? originalColor.expression : originalColor.colorA,
      after: color.mode === "formula" ? color.expression : color.colorA
    });
  }

  const viewState = Object.freeze([
    { key: "yaw", label: "ракурс Y", value: `${displayNumber(spatial.yaw * 180 / Math.PI, 1)}°` },
    { key: "pitch", label: "ракурс X", value: `${displayNumber(spatial.pitch * 180 / Math.PI, 1)}°` },
    { key: "roll", label: "крен Z", value: `${displayNumber(spatial.roll * 180 / Math.PI, 1)}°` },
    { key: "time", label: "фаза запуска", value: displayNumber(spatial.time) }
  ]);

  return Object.freeze({
    id: `chronophore-imprint-${codeSignature(code)}`,
    code,
    characters: code.length,
    coreCharacters: originalCode.length,
    stateCharacters: Math.max(0, code.length - originalCode.length),
    mutations: Object.freeze(mutations),
    hasGeneticMutation: mutations.length > 0,
    viewState,
    pose: spatial
  });
}

export function nextMutationNumber(records = [], minimum = 6) {
  return records.reduce((next, record) => {
    const value = Number.parseInt(String(record.displayNumber || "").replace(/\D/g, ""), 10);
    return Number.isFinite(value) ? Math.max(next, value + 1) : next;
  }, minimum);
}

export function createSavedEntityRecord({
  number,
  parent,
  imprint,
  pose = imprint.pose,
  settings,
  layers,
  color
}) {
  const entityNumber = Math.max(6, Math.round(Number(number) || 6));
  const displayNumber = `P${entityNumber}`;
  return Object.freeze({
    version: GENOME_ENTITY_VERSION,
    kind: "chronophore",
    id: `chronophore-p${entityNumber}`,
    displayNumber,
    title: `Хронофор ${displayNumber}`,
    parentId: parent.id,
    parentDisplayNumber: parent.displayNumber || "P2",
    code: imprint.code,
    settings: { ...settings },
    layers: { ...layers },
    color: { ...color },
    pose: pose.orientation
      ? { ...pose, orientation: { ...pose.orientation } }
      : { ...pose },
    mutations: imprint.mutations.map(mutation => ({ ...mutation })),
    createdAt: new Date().toISOString()
  });
}

function validRecord(record) {
  return record
    && record.version === GENOME_ENTITY_VERSION
    && record.kind === "chronophore"
    && /^chronophore-p\d+$/.test(record.id)
    && /^P\d+$/.test(record.displayNumber)
    && typeof record.code === "string"
    && record.code.length > 0
    && record.code.length < 12000
    && record.settings && typeof record.settings === "object"
    && record.color && typeof record.color === "object";
}

export function readSavedEntities(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(GENOME_ENTITY_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validRecord).slice(0, 24);
  } catch {
    return [];
  }
}

export function writeSavedEntities(records, storage = globalThis.localStorage) {
  const valid = Array.from(records || []).filter(validRecord).slice(0, 24);
  try {
    storage?.setItem(GENOME_ENTITY_STORAGE_KEY, JSON.stringify(valid));
    return true;
  } catch {
    return false;
  }
}
