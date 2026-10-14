<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { buildFragmentShader, VERTEX_SHADER } from "../lib/glslRuntime.js";
import { advanceGlslClock, GLSL_SPEED_DEFAULT } from "../lib/glslPlayback.js";

const props = defineProps({
  source: { type: String, required: true },
  revision: { type: Number, required: true },
  resolution: { type: Number, default: 320 },
  speed: { type: Number, default: GLSL_SPEED_DEFAULT },
  paused: { type: Boolean, default: false }
});
const emit = defineEmits(["diagnostic"]);
const surface = ref(null);

let gl = null;
let program = null;
let geometry = null;
let vertexArray = null;
let uniform = {};
let animation = 0;
let lastTick = 0;
let elapsed = 0;
let frameNumber = 0;
let pointer = { x: 0.5, y: 0.5 };

function stop() {
  if (animation) cancelAnimationFrame(animation);
  animation = 0;
  lastTick = 0;
}

function releaseProgram() {
  if (gl && program) gl.deleteProgram(program);
  program = null;
  uniform = {};
}

function setupContext() {
  gl = surface.value?.getContext("webgl2", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: false
  });
  if (!gl) throw new Error("WebGL2 недоступен. Проверь настройки браузера или GPU.");
  geometry = gl.createBuffer();
  vertexArray = gl.createVertexArray();
  if (!geometry || !vertexArray) throw new Error("Не удалось создать WebGL2-буферы.");
  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, geometry);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1, 1, 1
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
}

function compileShader(type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Браузер не смог создать объект GLSL.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || "Неизвестная ошибка компилятора.";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function buildProgram() {
  let vertex = null;
  let fragment = null;
  let nextProgram = null;
  try {
    vertex = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    fragment = compileShader(gl.FRAGMENT_SHADER, buildFragmentShader(props.source));
    nextProgram = gl.createProgram();
    if (!nextProgram) throw new Error("WebGL2 не смог создать программу.");
    gl.attachShader(nextProgram, vertex);
    gl.attachShader(nextProgram, fragment);
    gl.linkProgram(nextProgram);
    if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(nextProgram) || "Ошибка линковки GLSL.");
    }
    return nextProgram;
  } catch (error) {
    if (nextProgram) gl.deleteProgram(nextProgram);
    throw error;
  } finally {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}

function draw() {
  if (!gl || !program || gl.isContextLost()) return;
  const size = surface.value.width;
  gl.viewport(0, 0, size, size);
  gl.useProgram(program);
  gl.bindVertexArray(vertexArray);
  if (uniform.r !== null) gl.uniform2f(uniform.r, size, size);
  if (uniform.m !== null) gl.uniform2f(uniform.m, pointer.x, pointer.y);
  if (uniform.t !== null) gl.uniform1f(uniform.t, elapsed);
  if (uniform.f !== null) gl.uniform1f(uniform.f, frameNumber);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function tick(now) {
  animation = 0;
  if (props.paused || !program || !gl || gl.isContextLost()) return;
  // Bound update rate and framebuffer size; 100-step raymarchers are expensive on phones.
  if (!lastTick || now - lastTick >= 1000 / 24) {
    // Only the virtual shader clock changes: WebGL FPS stays capped at 24.
    const next = advanceGlslClock(
      { elapsed, frameNumber }, lastTick ? now - lastTick : 0, props.speed
    );
    elapsed = next.elapsed;
    frameNumber = next.frameNumber;
    lastTick = now;
    draw();
  }
  animation = requestAnimationFrame(tick);
}

function start() {
  if (!props.paused && !animation && program) animation = requestAnimationFrame(tick);
}

function recompile() {
  stop();
  if (!gl || gl.isContextLost()) return;
  releaseProgram();
  try {
    program = buildProgram();
    uniform = Object.fromEntries(["r", "m", "t", "f"].map(
      name => [name, gl.getUniformLocation(program, name)]
    ));
    elapsed = 0;
    frameNumber = 0;
    draw();
    emit("diagnostic", { ok: true, message: "GLSL скомпилирован. Выполняется видимый код." });
    start();
  } catch (error) {
    gl.clearColor(0.03, 0.03, 0.03, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    emit("diagnostic", { ok: false, message: String(error.message || error) });
  }
}

function pointerMoved(event) {
  const box = surface.value.getBoundingClientRect();
  pointer = {
    x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
    y: Math.max(0, Math.min(1, 1 - (event.clientY - box.top) / box.height))
  };
  if (props.paused) draw();
}

function contextLost(event) {
  event.preventDefault();
  stop();
  emit("diagnostic", { ok: false, message: "Контекст WebGL2 потерян. Ожидается восстановление браузером." });
}

function contextRestored() {
  gl = null;
  program = null;
  geometry = null;
  vertexArray = null;
  try {
    setupContext();
    recompile();
  } catch (error) {
    emit("diagnostic", { ok: false, message: String(error.message || error) });
  }
}

watch(() => props.revision, recompile);
watch(() => props.resolution, () => {
  if (gl && program) draw();
});
watch(() => props.paused, value => {
  if (value) {
    stop();
    draw();
  } else {
    lastTick = 0;
    start();
  }
});

onMounted(() => {
  try {
    setupContext();
    recompile();
  } catch (error) {
    emit("diagnostic", { ok: false, message: String(error.message || error) });
  }
});

onBeforeUnmount(() => {
  stop();
  releaseProgram();
  if (gl && !gl.isContextLost()) {
    if (geometry) gl.deleteBuffer(geometry);
    if (vertexArray) gl.deleteVertexArray(vertexArray);
  }
});
</script>

<template>
  <canvas
    ref="surface"
    class="glsl-surface"
    :width="resolution"
    :height="resolution"
    aria-label="Живой холст GLSL"
    @pointermove="pointerMoved"
    @webglcontextlost="contextLost"
    @webglcontextrestored="contextRestored"
  ></canvas>
</template>

<style scoped>
.glsl-surface {
  display: block;
  width: min(100%, 600px);
  height: auto;
  aspect-ratio: 1;
  border: 1px solid rgba(88, 255, 231, 0.2);
  border-radius: 20px;
  background: #090909;
  touch-action: pan-y;
}
</style>
