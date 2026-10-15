import test from "node:test";
import assert from "node:assert/strict";
import { buildFragmentShader, MAX_GLSL_CHARACTERS, VERTEX_SHADER } from "../src/lib/glslRuntime.js";
import { ORIGINAL_GLSL, STABLE_GLSL, SPHERICAL_FIELD_RAW_GLSL, SPHERICAL_FIELD_STABLE_GLSL, DIAGNOSTIC_GLSL, GLSL_PRESETS } from "../src/data/glslPresets.js";
import { SPHERICAL_FIELD_CONTROLS } from "../src/lib/glslParameters.js";

test("GLSL ES 300 supports Twigl's geekest aliases without rewriting user code", () => {
  const source = "o+=vec4(FC.xy/r, sin(t), 1.);";
  const generated = buildFragmentShader(source);
  assert.match(generated, /^#version 300 es\n/);
  assert.match(generated, /uniform vec2 r;/);
  assert.match(generated, /uniform vec2 m;/);
  assert.match(generated, /uniform float t;/);
  assert.match(generated, /uniform float f;/);
  for (const control of SPHERICAL_FIELD_CONTROLS) {
    assert.ok(generated.includes("uniform float " + control.uniform + ";"));
  }
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
  assert.equal(GLSL_PRESETS.length, 5);
});

test("second spherical GLSL shader keeps user RAW intact and a separate safe adaptation", () => {
  assert.equal(SPHERICAL_FIELD_RAW_GLSL, "float i,e,R,s,k,z;vec3 q,p,d=.5-FC.rgb/r.y;for(q.z++;s=5.,q+=d*e*R/6.+1e-5,p=vec3(log(R=length(q))-t/s,acos(q.z/R)-2.,atan(q.x,q.y)-t/s),i++<1e2;z=i>70.?d/=-d,-e:exp(e)*.2,o+=(cos(vec4(1,2,3,0)-R)+k+1.)*z/1e2)for(e=p.y;s<4e2;s+=s)e+=(z=sin(dot(p/p,exp(cos(p*s)+.7))))/s,k+=z/1e2;");
  assert.ok(buildFragmentShader(SPHERICAL_FIELD_RAW_GLSL).includes("\n#line 1\n" + SPHERICAL_FIELD_RAW_GLSL + "\n}"));
  assert.notEqual(SPHERICAL_FIELD_RAW_GLSL, SPHERICAL_FIELD_STABLE_GLSL);
  assert.ok(SPHERICAL_FIELD_STABLE_GLSL.includes("float i=0.,e=.02,R=1."));
  assert.ok(SPHERICAL_FIELD_STABLE_GLSL.includes("acos(clamp(q.z/R,-1.,1.))"));
  assert.ok(SPHERICAL_FIELD_STABLE_GLSL.includes("R=max(length(q),1e-5)"));
  assert.ok(!SPHERICAL_FIELD_STABLE_GLSL.includes("p/p"));
  assert.ok(!SPHERICAL_FIELD_STABLE_GLSL.includes("d/=-d"));
  for (const control of SPHERICAL_FIELD_CONTROLS) {
    assert.ok(SPHERICAL_FIELD_STABLE_GLSL.includes(control.uniform),
      "Adapter should read " + control.uniform);
    assert.ok(!SPHERICAL_FIELD_RAW_GLSL.includes(control.uniform),
      "RAW should never contain injected parameter names");
  }
  assert.ok(SPHERICAL_FIELD_STABLE_GLSL.includes("for(int level=0;level<7;level++)"));
  assert.ok(SPHERICAL_FIELD_STABLE_GLSL.includes("if(float(level)>=u_fieldDetail)break;"));
  assert.deepEqual(GLSL_PRESETS.map(preset => preset.id), [
    "stable", "original", "spherical-stable", "spherical-raw", "diagnostic"
  ]);
  assert.ok(GLSL_PRESETS.every(preset =>
    buildFragmentShader(preset.code).includes("\n#line 1\n" + preset.code + "\n}")
  ));
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
