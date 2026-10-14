import test from "node:test";
import assert from "node:assert/strict";
import { buildFragmentShader, MAX_GLSL_CHARACTERS, VERTEX_SHADER } from "../src/lib/glslRuntime.js";
import { ORIGINAL_GLSL, STABLE_GLSL, DIAGNOSTIC_GLSL, GLSL_PRESETS } from "../src/data/glslPresets.js";

test("GLSL ES 300 supports Twigl's geekest aliases without rewriting user code", () => {
  const source = "o+=vec4(FC.xy/r, sin(t), 1.);";
  const generated = buildFragmentShader(source);
  assert.match(generated, /^#version 300 es\n/);
  assert.match(generated, /uniform vec2 r;/);
  assert.match(generated, /uniform vec2 m;/);
  assert.match(generated, /uniform float t;/);
  assert.match(generated, /uniform float f;/);
  assert.match(generated, /out vec4 o;/);
  assert.match(generated, /#define FC gl_FragCoord/);
  assert.match(generated, /o = vec4\(0\.0\);\n#line 1\n/);
  assert.ok(generated.includes("\n#line 1\n" + source + "\n}"));
  assert.match(VERTEX_SHADER, /layout\(location=0\) in vec2 a_position;/);
});

test("original supplied raymarcher is preserved exactly as raw input", () => {
  assert.equal(ORIGINAL_GLSL,
    "float i,e,R,s,k,z;vec3 q,p,d=.5-FC.rgb/r.y;for(q--;i++<1e2;i>85.?d/=-d,o+=(cos(vec4(1,3,5,0)+k)-k)*e*.1:o){s=3.;q+=d*e*R*.2-4e-5;p=vec3(log(R=length(q))-t,acos(q.z/R)-.5,atan(q.x,q.y)+t*.5);for(e=--p.y;s<4e3;s*=3.)e+=(z=sin(dot(p/p,exp(cos(p*s)+1.))))/s,k+=z/70.;}");
  assert.ok(buildFragmentShader(ORIGINAL_GLSL).includes(ORIGINAL_GLSL));
  assert.ok(!ORIGINAL_GLSL.includes("#つぶやきGLSL"));
  assert.ok(!STABLE_GLSL.includes("p/p"));
  assert.notEqual(ORIGINAL_GLSL, STABLE_GLSL);
  assert.equal(GLSL_PRESETS.length, 3);
});

test("the diagnostic code uses only supported short forms", () => {
  assert.match(DIAGNOSTIC_GLSL, /FC\.xy/);
  assert.match(DIAGNOSTIC_GLSL, /vec4/);
  assert.ok(buildFragmentShader(DIAGNOSTIC_GLSL).endsWith(DIAGNOSTIC_GLSL + "\n}"));
});

test("empty, malformed types and too-long code produce explicit errors", () => {
  assert.throws(() => buildFragmentShader(""), /Вставь GLSL/);
  assert.throws(() => buildFragmentShader(" \n"), /Вставь GLSL/);
  assert.throws(() => buildFragmentShader(null), /Вставь GLSL/);
  assert.throws(() => buildFragmentShader("a".repeat(MAX_GLSL_CHARACTERS + 1)), /12 000/);
});
