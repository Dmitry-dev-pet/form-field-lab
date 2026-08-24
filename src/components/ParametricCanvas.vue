<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { buildColorPalette } from "../lib/colorFormula.js";
import {
  clampOrbitPitch,
  createOrbitRotation,
  latentPhaseDepth,
  rotateSpatialPoint
} from "../lib/spatialProjection.js";

const props = defineProps({
  settings: { type: Object, required: true },
  layers: { type: Object, required: true },
  color: { type: Object, required: true },
  colorEvaluator: { type: Function, required: true },
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
const rotatedPoint = { x: 0, y: 0, z: 0 };
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const orbitRadiansPerPixel = 0.008;
const inertiaPerFrame = 0.9;
const colorBuckets = Array.from({ length: 24 }, () => []);
const colorScope = {
  i: 0, y: 0, k: 0, e: 0, d: 0, c: 0, t: 0, branch: 0, forms: 0,
  x: 0, Y: 0, z: 0, u: 0, r: 0, angle: 0, mix: 0
};

function render() {
  if (!context) return;
  const { settings, layers } = props;
  context.fillStyle = settings.backgroundColor;
  context.fillRect(0, 0, 400, 400);

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

  const formCount = Math.max(1, Math.round(settings.forms));
  const normalizedPhaseStep = settings.phaseStep * 3 / formCount;
  const depthScale = Number.isFinite(settings.depth) ? settings.depth : 0;
  const orbitRotation = createOrbitRotation(yaw, pitch);

  for (let index = settings.pointCount; index--;) {
    const y = index / 995;
    const k = (4 + Math.cos(y * settings.waveFrequency + time))
      * Math.cos(index / settings.radialDivisor);
    const e = y / 5 - 11;
    const d = Math.hypot(k, e) - settings.distanceOffset;
    const branchPhase = layers.symmetry ? (index % formCount) * normalizedPhaseStep : 0;
    const c = d / 2 - time / 2 + branchPhase;
    const radialSize = settings.radius + k * k;
    const x = radialSize * Math.cos(c) + 200;
    const pulse = layers.pulse
      ? d * d * (settings.pulse / 3) * Math.sin(time * 3 - d)
      : 0;
    const ripple = layers.ripple ? 3 * Math.sin(k * 2) : 0;
    const feather = layers.feather
      ? y / settings.featherDivisor * k * (e + Math.sin(e * 4 - d * 4))
      : 0;
    const screenY = settings.height * Math.sin(c / 3) + 200 + pulse + ripple + feather;
    const z = latentPhaseDepth(radialSize, c, depthScale);
    rotateSpatialPoint(x - 200, screenY - 200, z, orbitRotation, rotatedPoint);
    const projectedX = rotatedPoint.x + 200;
    const projectedY = rotatedPoint.y + 200;

    if (formulaColor) {
      colorScope.i = index;
      colorScope.y = y;
      colorScope.k = k;
      colorScope.e = e;
      colorScope.d = d;
      colorScope.c = c;
      colorScope.t = time;
      colorScope.branch = index % formCount;
      colorScope.forms = formCount;
      colorScope.x = x;
      colorScope.Y = screenY;
      colorScope.z = z;
      if (formulaVariables.has("u")) colorScope.u = index / Math.max(1, settings.pointCount - 1);
      if (formulaVariables.has("r")) colorScope.r = Math.hypot(x - 200, screenY - 200);
      if (formulaVariables.has("angle")) colorScope.angle = Math.atan2(screenY - 200, x - 200);
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

  if (!props.paused) {
    time += Math.PI / 60 * props.settings.speed;
    render();
  } else if (viewChanged) {
    render();
  }
  frameId = requestAnimationFrame(animate);
}

function resetTime() {
  time = 0;
  render();
}

function resetView() {
  yaw = 0;
  pitch = 0;
  yawVelocity = 0;
  pitchVelocity = 0;
  render();
}

function beginOrbit(event) {
  if (activePointerId !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
  activePointerId = event.pointerId;
  pointerX = event.clientX;
  pointerY = event.clientY;
  pointerTime = event.timeStamp;
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
  const deltaX = event.clientX - pointerX;
  const deltaY = event.clientY - pointerY;
  const elapsed = Math.max(8, event.timeStamp - pointerTime);
  const yawDelta = deltaX * orbitRadiansPerPixel;
  const previousPitch = pitch;

  yaw += yawDelta;
  pitch = clampOrbitPitch(pitch + deltaY * orbitRadiansPerPixel);
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
  [() => props.settings, () => props.layers, () => props.color, () => props.colorEvaluator, () => props.paused],
  () => { if (props.paused) render(); },
  { deep: true }
);

onMounted(() => {
  context = canvas.value.getContext("2d", { alpha: false });
  render();
  frameId = requestAnimationFrame(animate);
});

onBeforeUnmount(() => cancelAnimationFrame(frameId));

defineExpose({ resetTime, resetView, render });
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
    :aria-label="`Пространственная анимированная композиция из ${color.mode === 'formula' ? 'формульно окрашенных' : 'однотонных'} точек. Проведите пальцем или используйте стрелки, чтобы вращать форму вокруг центра.`"
    @pointerdown="beginOrbit"
    @pointermove="moveOrbit"
    @pointerup="finishOrbit"
    @pointercancel="finishOrbit($event, true)"
    @lostpointercapture="finishOrbit($event, true)"
    @keydown="handleOrbitKey"
    @contextmenu.prevent
  ></canvas>
</template>
