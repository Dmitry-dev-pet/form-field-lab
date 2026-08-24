<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { buildColorPalette } from "../lib/colorFormula.js";
import {
  clampOrbitPitch,
  createOrbitRotation,
  orbitPitchDelta,
  rotateSpatialPoint
} from "../lib/spatialProjection.js";

const emit = defineEmits(["stimulate"]);

const props = defineProps({
  form: { type: Object, required: true },
  settings: { type: Object, required: true },
  layers: { type: Object, required: true },
  color: { type: Object, required: true },
  colorEvaluator: { type: Function, required: true },
  initialState: { type: Object, default: null },
  invertY: { type: Boolean, default: true },
  paused: { type: Boolean, default: false }
});

const canvas = ref(null);
const isOrbiting = ref(false);
let context;
let frameId;
let time = 0;
let previousFrameTime = 0;
let yaw = 0;
let pitch = 0;
let yawVelocity = 0;
let pitchVelocity = 0;
let activePointerId = null;
let pointerX = 0;
let pointerY = 0;
let pointerTime = 0;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerMoved = false;
let clearNextFrame = true;
const rotatedPoint = { x: 0, y: 0, z: 0 };
const interaction = { strength: 0, age: 0, x: 0, y: 0, u: 0.5 };
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const orbitRadiansPerPixel = 0.008;
const inertiaPerFrame = 0.9;
const colorBuckets = Array.from({ length: 24 }, () => []);
const formPoint = {
  x: 0, y: 0, z: 0, parameter: 0, k: 0, e: 0, d: 0, c: 0,
  branch: 0, forms: 1
};
const colorScope = {
  i: 0, y: 0, k: 0, e: 0, d: 0, c: 0, t: 0, branch: 0, forms: 0,
  x: 0, Y: 0, z: 0, u: 0, r: 0, angle: 0, mix: 0
};

function render() {
  if (!context) return;
  const { form, settings, layers } = props;
  const remembers = form.trailLayer && layers[form.trailLayer];
  const persistence = remembers ? Number(settings.memory) || 0 : 0;
  context.save();
  context.globalAlpha = clearNextFrame ? 1 : Math.max(0.035, 1 - persistence);
  context.fillStyle = settings.backgroundColor;
  context.fillRect(0, 0, 400, 400);
  context.restore();
  clearNextFrame = false;

  const formulaColor = props.color.mode === "formula";
  const formulaVariables = props.colorEvaluator.variables || new Set();
  const palette = buildColorPalette(
    props.color.colorA,
    formulaColor ? props.color.colorB : props.color.colorA,
    settings.alpha,
    colorBuckets.length
  );
  colorBuckets.forEach(bucket => { bucket.length = 0; });
  if (!formulaColor) context.fillStyle = palette[0];

  const orbitRotation = createOrbitRotation(yaw, pitch);

  for (let index = settings.pointCount; index--;) {
    form.evaluate(index, time, settings, layers, formPoint, interaction);
    if (!Number.isFinite(formPoint.x)
      || !Number.isFinite(formPoint.y)
      || !Number.isFinite(formPoint.z)) continue;

    rotateSpatialPoint(
      formPoint.x - 200,
      formPoint.y - 200,
      formPoint.z,
      orbitRotation,
      rotatedPoint
    );
    const projectedX = rotatedPoint.x + 200;
    const projectedY = rotatedPoint.y + 200;

    if (formulaColor) {
      colorScope.i = index;
      colorScope.y = formPoint.parameter;
      colorScope.k = formPoint.k;
      colorScope.e = formPoint.e;
      colorScope.d = formPoint.d;
      colorScope.c = formPoint.c;
      colorScope.t = time;
      colorScope.branch = formPoint.branch;
      colorScope.forms = formPoint.forms;
      colorScope.x = formPoint.x;
      colorScope.Y = formPoint.y;
      colorScope.z = formPoint.z;
      if (formulaVariables.has("u")) colorScope.u = index / Math.max(1, settings.pointCount - 1);
      if (formulaVariables.has("r")) {
        colorScope.r = Math.hypot(formPoint.x - 200, formPoint.y - 200);
      }
      if (formulaVariables.has("angle")) {
        colorScope.angle = Math.atan2(formPoint.y - 200, formPoint.x - 200);
      }
      colorScope.mix = 0;
      const bucketIndex = Math.round(props.colorEvaluator(colorScope) * (colorBuckets.length - 1));
      colorBuckets[bucketIndex].push(projectedX, projectedY);
    } else {
      context.fillRect(projectedX, projectedY, 1, 1);
    }
  }

  if (formulaColor) {
    colorBuckets.forEach((bucket, bucketIndex) => {
      if (!bucket.length) return;
      context.fillStyle = palette[bucketIndex];
      for (let offset = 0; offset < bucket.length; offset += 2) {
        context.fillRect(bucket[offset], bucket[offset + 1], 1, 1);
      }
    });
  }
}

function animate(timestamp) {
  const elapsedFrames = previousFrameTime
    ? Math.min(3, Math.max(0.25, (timestamp - previousFrameTime) / (1000 / 60)))
    : 1;
  previousFrameTime = timestamp;
  let viewChanged = false;

  if (!isOrbiting.value && (Math.abs(yawVelocity) > 0.00005 || Math.abs(pitchVelocity) > 0.00005)) {
    yaw += yawVelocity * elapsedFrames;
    pitch = clampOrbitPitch(pitch + pitchVelocity * elapsedFrames);
    const damping = Math.pow(inertiaPerFrame, elapsedFrames);
    yawVelocity *= damping;
    pitchVelocity *= damping;
    viewChanged = true;
  }

  if (!props.paused && interaction.strength > 0) {
    interaction.age += elapsedFrames / 60;
    const responseFrames = Math.max(1, Number(props.form.responseFrames) || 78);
    interaction.strength = Math.max(
      0,
      interaction.strength - elapsedFrames / responseFrames
    );
    viewChanged = true;
  }

  if (!props.paused) {
    time += props.form.timeStep * props.settings.speed;
    render();
  } else if (viewChanged) {
    render();
  }
  frameId = requestAnimationFrame(animate);
}

function resetTime() {
  time = 0;
  interaction.strength = 0;
  interaction.age = 0;
  clearNextFrame = true;
  render();
}

function resetView() {
  yaw = 0;
  pitch = 0;
  yawVelocity = 0;
  pitchVelocity = 0;
  clearNextFrame = true;
  render();
}

function restoreState(state = null) {
  const next = state || {};
  yaw = Number(next.yaw) || 0;
  pitch = clampOrbitPitch(Number(next.pitch) || 0);
  time = Math.max(0, Number(next.time) || 0);
  yawVelocity = 0;
  pitchVelocity = 0;
  interaction.strength = 0;
  interaction.age = 0;
  clearNextFrame = true;
  render();
}

function snapshot() {
  return { yaw, pitch, time };
}

function provoke(x = 0, y = 0) {
  interaction.x = Math.max(-1, Math.min(1, x));
  interaction.y = Math.max(-1, Math.min(1, y));
  interaction.u = (interaction.x + 1) / 2;
  interaction.strength = 1;
  interaction.age = 0;
  emit("stimulate");
  render();
}

function beginOrbit(event) {
  if (activePointerId !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
  activePointerId = event.pointerId;
  pointerX = event.clientX;
  pointerY = event.clientY;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  pointerTime = event.timeStamp;
  pointerMoved = false;
  yawVelocity = 0;
  pitchVelocity = 0;
  isOrbiting.value = true;
  try {
    canvas.value?.setPointerCapture?.(event.pointerId);
  } catch {
    // Synthetic or interrupted pointers can be used without capture.
  }
  event.preventDefault();
}

function moveOrbit(event) {
  if (event.pointerId !== activePointerId) return;
  if (!pointerMoved) {
    const distance = Math.hypot(
      event.clientX - pointerStartX,
      event.clientY - pointerStartY
    );
    if (distance < 7) {
      event.preventDefault();
      return;
    }
    pointerMoved = true;
  }
  const deltaX = event.clientX - pointerX;
  const deltaY = event.clientY - pointerY;
  const elapsed = Math.max(8, event.timeStamp - pointerTime);
  const yawDelta = deltaX * orbitRadiansPerPixel;
  const pitchDelta = orbitPitchDelta(deltaY, orbitRadiansPerPixel, props.invertY);
  const previousPitch = pitch;

  yaw += yawDelta;
  pitch = clampOrbitPitch(pitch + pitchDelta);
  yawVelocity = yawDelta / (elapsed / (1000 / 60));
  pitchVelocity = (pitch - previousPitch) / (elapsed / (1000 / 60));
  pointerX = event.clientX;
  pointerY = event.clientY;
  pointerTime = event.timeStamp;
  render();
  event.preventDefault();
}

function finishOrbit(event, cancelled = false) {
  if (event.pointerId !== activePointerId) return;
  activePointerId = null;
  isOrbiting.value = false;
  if (cancelled || prefersReducedMotion) {
    yawVelocity = 0;
    pitchVelocity = 0;
  }
}

function handleOrbitKey(event) {
  const keyStep = Math.PI / 24;
  if (event.key === "ArrowLeft") yaw -= keyStep;
  else if (event.key === "ArrowRight") yaw += keyStep;
  else if (event.key === "ArrowUp") pitch = clampOrbitPitch(pitch - keyStep);
  else if (event.key === "ArrowDown") pitch = clampOrbitPitch(pitch + keyStep);
  else if (event.key === "Home" || event.key === "0") resetView();
  else return;

  yawVelocity = 0;
  pitchVelocity = 0;
  render();
  event.preventDefault();
}

watch(
  [
    () => props.form,
    () => props.settings,
    () => props.layers,
    () => props.color,
    () => props.colorEvaluator,
    () => props.paused
  ],
  () => {
    clearNextFrame = true;
    if (props.paused) render();
  },
  { deep: true }
);

onMounted(() => {
  context = canvas.value.getContext("2d", { alpha: false });
  restoreState(props.initialState);
  frameId = requestAnimationFrame(animate);
});

onBeforeUnmount(() => cancelAnimationFrame(frameId));

defineExpose({ resetTime, resetView, restoreState, snapshot, render, provoke });
</script>

<template>
  <canvas
    ref="canvas"
    class="primary-canvas orbit-canvas"
    :class="{ 'is-orbiting': isOrbiting }"
    width="400"
    height="400"
    tabindex="0"
    role="img"
    :aria-label="`${form.title}: пространственная анимированная композиция из ${color.mode === 'formula' ? 'формульно окрашенных' : 'однотонных'} точек. Проведите пальцем или используйте стрелки, чтобы изменить только угол зрения. Инверсия Y ${invertY ? 'включена' : 'выключена'}.`"
    @pointerdown="beginOrbit"
    @pointermove="moveOrbit"
    @pointerup="finishOrbit"
    @pointercancel="finishOrbit($event, true)"
    @lostpointercapture="finishOrbit($event, true)"
    @keydown="handleOrbitKey"
    @contextmenu.prevent
  ></canvas>
</template>
