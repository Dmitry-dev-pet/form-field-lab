// The user's visible GLSL body is appended verbatim after #line 1.
// This is a small Twigl geekest (GLSL ES 3.00) compatibility wrapper, not p5.js.
export const MAX_GLSL_CHARACTERS = 12000;

export const VERTEX_SHADER = [
  "#version 300 es",
  "precision highp float;",
  "layout(location=0) in vec2 a_position;",
  "void main() {",
  "  gl_Position = vec4(a_position, 0.0, 1.0);",
  "}"
].join("\n");

export function buildFragmentShader(code) {
  if (typeof code !== "string" || !code.trim()) {
    throw new Error("Вставь GLSL-код перед запуском.");
  }
  if (code.length > MAX_GLSL_CHARACTERS) {
    throw new Error("Превышен предел редактора: 12 000 символов.");
  }
  return [
    "#version 300 es",
    "precision highp float;",
    "uniform vec2 r;",
    "uniform vec2 m;",
    "uniform float t;",
    "uniform float f;",
    "out vec4 o;",
    "#define FC gl_FragCoord",
    "void main() {",
    "  o = vec4(0.0);",
    "#line 1",
    code,
    "}"
  ].join("\n");
}
