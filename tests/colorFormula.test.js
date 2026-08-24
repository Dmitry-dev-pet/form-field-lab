import test from "node:test";
import assert from "node:assert/strict";
import {
  COLOR_PRESETS,
  buildColorPalette,
  clampUnit,
  compileColorFormula,
  mergeColorQuery,
  normalizeHexColor,
  presetById,
  readColorState
} from "../src/lib/colorFormula.js";

const scope = {
  i: 10,
  y: 2,
  k: 1,
  e: -3,
  d: 0,
  c: Math.PI / 2,
  t: 0,
  branch: 1,
  forms: 3,
  x: 200,
  Y: 200,
  z: 40,
  u: 0.5,
  r: 0,
  angle: 0,
  mix: 0.5
};

test("color formulas expose geometry variables and clamp output", () => {
  assert.equal(compileColorFormula("0.5 + 0.5 * sin(c)")(scope), 1);
  assert.ok(Math.abs(compileColorFormula("smoothstep(-100, 100, z)")(scope) - 0.784) < 1e-12);
  assert.equal(compileColorFormula("2")(scope), 1);
  assert.equal(compileColorFormula("-2")(scope), 0);
  assert.equal(compileColorFormula("sqrt(-1)")(scope), 0.5);
  assert.equal(clampUnit(Number.POSITIVE_INFINITY), 0.5);
});

test("every built-in color preset compiles and returns a palette coordinate", () => {
  for (const preset of COLOR_PRESETS) {
    const value = compileColorFormula(preset.expression)(scope);
    assert.ok(value >= 0 && value <= 1, `${preset.id} returned ${value}`);
  }
});

test("color formula language rejects access outside its math vocabulary", () => {
  assert.throws(() => compileColorFormula("globalThis.alert(1)"), /Неизвестное имя|Недопустимый символ/);
  assert.throws(() => compileColorFormula("sin.constructor(1)"), /Недопустимый символ/);
  assert.throws(() => compileColorFormula("i; alert(1)"), /Недопустимый символ/);
  assert.throws(() => compileColorFormula("unknown + 1"), /Неизвестное имя/);
});

test("palette interpolation and URL color normalization are deterministic", () => {
  assert.deepEqual(buildColorPalette("#000000", "#ffffff", 255, 3), [
    "rgba(0, 0, 0, 1)",
    "rgba(128, 128, 128, 1)",
    "rgba(255, 255, 255, 1)"
  ]);
  assert.equal(normalizeHexColor("D7FF58", "#ffffff"), "#d7ff58");
  assert.equal(normalizeHexColor("not-a-color", "#ffffff"), "#ffffff");
  assert.equal(presetById("depth").id, "depth");
  assert.equal(presetById("missing").id, "phase");
});

test("color state round-trips through compact route query parameters", () => {
  const state = readColorState({
    a: "5",
    cm: "formula",
    cp: "custom",
    ce: "fract(y * 0.2)",
    ca: "ff0000",
    cb: "00ff00"
  });
  assert.deepEqual(state, {
    mode: "formula",
    preset: "custom",
    expression: "fract(y * 0.2)",
    colorA: "#ff0000",
    colorB: "#00ff00"
  });
  assert.deepEqual(mergeColorQuery({ a: "5", old: "kept" }, state), {
    a: "5",
    old: "kept",
    ca: "ff0000",
    cb: "00ff00",
    cp: "custom",
    ce: "fract(y * 0.2)"
  });
});
