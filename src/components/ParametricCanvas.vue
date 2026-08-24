<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { buildColorPalette } from "../lib/colorFormula.js";
import {
  forEachGridEdge,
  MESH_RENDER_MODE,
  readMeshRenderMode,
  resolveGridDimensions,
  resolveGridTopology
} from "../lib/meshTopology.js";
import {
  clampOrbitPitch,
  createOrbitRotation,
  identityQuaternion,
  multiplyQuaternions,
  normalizeQuaternion,
  projectTrackballPoint,
  quaternionBetweenVectors,
  quaternionFromAxisAngle,
  quaternionToAxisAngle,
  quaternionToEuler,
  quaternionToRotationMatrix,
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
const orientation = identityQuaternion();
const angularVelocity = { x: 0, y: 0, z: 0 };
let activePointerId = null;
let pointerTime = 0;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerMoved = false;
let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;
let clearNextFrame = true;
const previousTrackballPoint = { x: 0, y: 0, z: 1 };
const currentTrackballPoint = { x: 0, y: 0, z: 1 };
const deltaRotation = identityQuaternion();
const composedRotation = identityQuaternion();
const rotationAxisAngle = { x: 1, y: 0, z: 0, angle: 0 };
const eulerAngles = { yaw: 0, pitch: 0, roll: 0 };
const viewRotationMatrix = {};
const rotatedPoint = { x: 0, y: 0, z: 0 };
const interaction = { strength: 0, age: 0, x: 0, y: 0, u: 0.5 };
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const inertiaPerFrame = 0.9;
const colorBuckets = Array.from({ length: 24 }, () => []);
const edgeBuckets = Array.from({ length: 24 }, () => []);
let projectedMesh = new Float32Array(0);
let meshColorBuckets = new Uint8Array(0);
const formPoint = {
  x: 0, y: 0, z: 0, parameter: 0, k: 0, e: 0, d: 0, c: 0,
  branch: 0, forms: 1
};
const colorScope = {
  i: 0, y: 0, k: 0, e: 0, d: 0, c: 0, t: 0, branch: 0, forms: 0,
  x: 0, Y: 0, z: 0, u: 0, r: 0, angle: 0, mix: 0
};

const canvasAriaLabel = computed(() => {
  const geometry = props.form.mesh
    ? `топология ${resolveGridTopology(props.form.mesh, props.settings).label}, сеточная пространственная композиция в режиме ${readMeshRenderMode(props.settings.renderMode)}`
    : "пространственная анимированная композиция из точек";
  const coloring = props.color.mode === "formula" ? "формульно окрашенная" : "однотонная";
  return `${props.form.title}: ${coloring} ${geometry}. Свободный трекбол меняет только угол зрения: проведите пальцем, используйте стрелки и Q/E для вращения вокруг экрана; двойное касание возвращает вид спереди. Инверсия Y ${props.invertY ? "включена" : "выключена"}.`;
});

function pointColorBucket(index, point, pointCount, formulaColor) {
  if (!formulaColor) return 0;
  colorScope.i = index;
  colorScope.y = point.parameter;
  colorScope.k = point.k;
  colorScope.e = point.e;
  colorScope.d = point.d;
  colorScope.c = point.c;
  colorScope.t = time;
  colorScope.branch = point.branch;
  colorScope.forms = point.forms;
  colorScope.x = point.x;
  colorScope.Y = point.y;
  colorScope.z = point.z;
  colorScope.u = index / Math.max(1, pointCount - 1);
  colorScope.r = Math.hypot(point.x - 200, point.y - 200);
  colorScope.angle = Math.atan2(point.y - 200, point.x - 200);
  colorScope.mix = 0;
  return Math.round(props.colorEvaluator(colorScope) * (colorBuckets.length - 1));
}

function drawPointBuckets(palette, size = 1) {
  colorBuckets.forEach((bucket, bucketIndex) => {
    if (!bucket.length) return;
    context.fillStyle = palette[bucketIndex];
    for (let offset = 0; offset < bucket.length; offset += 2) {
      context.fillRect(bucket[offset], bucket[offset + 1], size, size);
    }
  });
}

function renderPointCloud(form, settings, layers, orbitRotation, palette, formulaColor) {
  const pointCount = settings.pointCount;
  for (let index = pointCount; index--;) {
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
    const bucketIndex = pointColorBucket(index, formPoint, pointCount, formulaColor);
    colorBuckets[bucketIndex].push(rotatedPoint.x + 200, rotatedPoint.y + 200);
  }
  drawPointBuckets(palette);
}

function ensureMeshBuffers(vertexCount) {
  if (projectedMesh.length !== vertexCount * 2) {
    projectedMesh = new Float32Array(vertexCount * 2);
    meshColorBuckets = new Uint8Array(vertexCount);
  }
}

function drawEdgeBuckets(palette, lineWidth) {
  context.lineWidth = lineWidth;
  edgeBuckets.forEach((bucket, bucketIndex) => {
    if (!bucket.length) return;
    context.beginPath();
    for (let offset = 0; offset < bucket.length; offset += 4) {
      context.moveTo(bucket[offset], bucket[offset + 1]);
      context.lineTo(bucket[offset + 2], bucket[offset + 3]);
    }
    context.strokeStyle = palette[bucketIndex];
    context.stroke();
  });
}

function renderMesh(form, settings, layers, orbitRotation, palette, formulaColor) {
  const dimensions = resolveGridDimensions(form.mesh, settings);
  const { vertexCount } = dimensions;
  const renderMode = readMeshRenderMode(settings.renderMode);
  const showPoints = renderMode !== MESH_RENDER_MODE.wireframe;
  const showEdges = renderMode !== MESH_RENDER_MODE.points;
  ensureMeshBuffers(vertexCount);

  for (let index = 0; index < vertexCount; index++) {
    form.evaluate(index, time, settings, layers, formPoint, interaction);
    const offset = index * 2;
    if (!Number.isFinite(formPoint.x)
      || !Number.isFinite(formPoint.y)
      || !Number.isFinite(formPoint.z)) {
      projectedMesh[offset] = Number.NaN;
      projectedMesh[offset + 1] = Number.NaN;
      continue;
    }

    rotateSpatialPoint(
      formPoint.x - 200,
      formPoint.y - 200,
      formPoint.z,
      orbitRotation,
      rotatedPoint
    );
    projectedMesh[offset] = rotatedPoint.x + 200;
    projectedMesh[offset + 1] = rotatedPoint.y + 200;
    const bucketIndex = pointColorBucket(index, formPoint, vertexCount, formulaColor);
    meshColorBuckets[index] = bucketIndex;
    if (showPoints) {
      colorBuckets[bucketIndex].push(projectedMesh[offset], projectedMesh[offset + 1]);
    }
  }

  if (showEdges) {
    forEachGridEdge(form.mesh, dimensions, (first, second) => {
      const firstOffset = first * 2;
      const secondOffset = second * 2;
      const firstX = projectedMesh[firstOffset];
      const firstY = projectedMesh[firstOffset + 1];
      const secondX = projectedMesh[secondOffset];
      const secondY = projectedMesh[secondOffset + 1];
      if (![firstX, firstY, secondX, secondY].every(Number.isFinite)) return;
      edgeBuckets[meshColorBuckets[first]].push(firstX, firstY, secondX, secondY);
    });
    drawEdgeBuckets(palette, Number(settings.lineWidth) || 0.72);
  }
  if (showPoints) drawPointBuckets(palette, renderMode === MESH_RENDER_MODE.points ? 1.5 : 1.2);
}

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
  const palette = buildColorPalette(
    props.color.colorA,
    formulaColor ? props.color.colorB : props.color.colorA,
    settings.alpha,
    colorBuckets.length
  );
  colorBuckets.forEach(bucket => { bucket.length = 0; });
  edgeBuckets.forEach(bucket => { bucket.length = 0; });

  quaternionToRotationMatrix(orientation, viewRotationMatrix);
  if (form.mesh) renderMesh(form, settings, layers, viewRotationMatrix, palette, formulaColor);
  else renderPointCloud(form, settings, layers, viewRotationMatrix, palette, formulaColor);
}

function stopViewInertia() {
  angularVelocity.x = 0;
  angularVelocity.y = 0;
  angularVelocity.z = 0;
}

function applyViewRotation(rotation) {
  multiplyQuaternions(rotation, orientation, composedRotation);
  normalizeQuaternion(composedRotation, orientation);
}

function animate(timestamp) {
  const elapsedFrames = previousFrameTime
    ? Math.min(3, Math.max(0.25, (timestamp - previousFrameTime) / (1000 / 60)))
    : 1;
  previousFrameTime = timestamp;
  let viewChanged = false;

  const angularSpeed = Math.hypot(
    angularVelocity.x,
    angularVelocity.y,
    angularVelocity.z
  );
  if (!isOrbiting.value && angularSpeed > 0.00005) {
    quaternionFromAxisAngle(
      angularVelocity.x,
      angularVelocity.y,
      angularVelocity.z,
      angularSpeed * elapsedFrames,
      deltaRotation
    );
    applyViewRotation(deltaRotation);
    const damping = Math.pow(inertiaPerFrame, elapsedFrames);
    angularVelocity.x *= damping;
    angularVelocity.y *= damping;
    angularVelocity.z *= damping;
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
  identityQuaternion(orientation);
  stopViewInertia();
  clearNextFrame = true;
  render();
}

function restoreState(state = null) {
  const next = state || {};
  if (next.orientation && typeof next.orientation === "object") {
    normalizeQuaternion(next.orientation, orientation);
  } else {
    normalizeQuaternion(createOrbitRotation(
      Number(next.yaw) || 0,
      clampOrbitPitch(Number(next.pitch) || 0),
      Number(next.roll) || 0
    ), orientation);
  }
  time = Math.max(0, Number(next.time) || 0);
  stopViewInertia();
  interaction.strength = 0;
  interaction.age = 0;
  clearNextFrame = true;
  render();
}

function snapshot() {
  quaternionToEuler(orientation, eulerAngles);
  return {
    orientation: { ...orientation },
    yaw: eulerAngles.yaw,
    pitch: eulerAngles.pitch,
    roll: eulerAngles.roll,
    time
  };
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
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  pointerTime = event.timeStamp;
  pointerMoved = false;
  stopViewInertia();
  projectTrackballPoint(
    event.clientX,
    event.clientY,
    canvas.value?.getBoundingClientRect(),
    props.invertY,
    previousTrackballPoint
  );
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
  const elapsed = Math.max(8, event.timeStamp - pointerTime);
  const elapsedFrames = elapsed / (1000 / 60);
  projectTrackballPoint(
    event.clientX,
    event.clientY,
    canvas.value?.getBoundingClientRect(),
    props.invertY,
    currentTrackballPoint
  );
  quaternionBetweenVectors(previousTrackballPoint, currentTrackballPoint, deltaRotation);
  applyViewRotation(deltaRotation);
  quaternionToAxisAngle(deltaRotation, rotationAxisAngle);
  const angularStep = rotationAxisAngle.angle / elapsedFrames;
  angularVelocity.x = rotationAxisAngle.x * angularStep;
  angularVelocity.y = rotationAxisAngle.y * angularStep;
  angularVelocity.z = rotationAxisAngle.z * angularStep;
  Object.assign(previousTrackballPoint, currentTrackballPoint);
  pointerTime = event.timeStamp;
  render();
  event.preventDefault();
}

function finishOrbit(event, cancelled = false) {
  if (event.pointerId !== activePointerId) return;
  activePointerId = null;
  isOrbiting.value = false;
  if (!cancelled && !pointerMoved && event.pointerType !== "mouse") {
    const isDoubleTap = event.timeStamp - lastTapTime < 340
      && Math.hypot(event.clientX - lastTapX, event.clientY - lastTapY) < 28;
    if (isDoubleTap) {
      lastTapTime = 0;
      resetView();
    } else {
      lastTapTime = event.timeStamp;
      lastTapX = event.clientX;
      lastTapY = event.clientY;
    }
  }
  if (cancelled || prefersReducedMotion) {
    stopViewInertia();
  }
}

function handleOrbitKey(event) {
  const keyStep = Math.PI / 24;
  const key = event.key.toLowerCase();
  if (event.key === "Home" || event.key === "0") {
    resetView();
    event.preventDefault();
    return;
  }
  if (event.key === "ArrowLeft") quaternionFromAxisAngle(0, 1, 0, -keyStep, deltaRotation);
  else if (event.key === "ArrowRight") quaternionFromAxisAngle(0, 1, 0, keyStep, deltaRotation);
  else if (event.key === "ArrowUp") quaternionFromAxisAngle(1, 0, 0, -keyStep, deltaRotation);
  else if (event.key === "ArrowDown") quaternionFromAxisAngle(1, 0, 0, keyStep, deltaRotation);
  else if (key === "q") quaternionFromAxisAngle(0, 0, 1, -keyStep, deltaRotation);
  else if (key === "e") quaternionFromAxisAngle(0, 0, 1, keyStep, deltaRotation);
  else return;

  applyViewRotation(deltaRotation);
  stopViewInertia();
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
    :aria-label="canvasAriaLabel"
    @pointerdown="beginOrbit"
    @pointermove="moveOrbit"
    @pointerup="finishOrbit"
    @pointercancel="finishOrbit($event, true)"
    @lostpointercapture="finishOrbit($event, true)"
    @keydown="handleOrbitKey"
    @dblclick="resetView"
    @contextmenu.prevent
  ></canvas>
</template>
