<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { buildColorPalette } from "../lib/colorFormula.js";

const props = defineProps({
  settings: { type: Object, required: true },
  layers: { type: Object, required: true },
  color: { type: Object, required: true },
  colorEvaluator: { type: Function, required: true },
  paused: { type: Boolean, default: false }
});

const canvas = ref(null);
let context;
let frameId;
let time = 0;
const colorBuckets = Array.from({ length: 24 }, () => []);
const colorScope = {
  i: 0, y: 0, k: 0, e: 0, d: 0, c: 0, t: 0, branch: 0, forms: 0,
  x: 0, Y: 0, u: 0, r: 0, angle: 0, mix: 0
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

  for (let index = settings.pointCount; index--;) {
    const y = index / 995;
    const k = (4 + Math.cos(y * settings.waveFrequency + time))
      * Math.cos(index / settings.radialDivisor);
    const e = y / 5 - 11;
    const d = Math.hypot(k, e) - settings.distanceOffset;
    const branchPhase = layers.symmetry ? (index % formCount) * normalizedPhaseStep : 0;
    const c = d / 2 - time / 2 + branchPhase;
    const x = (settings.radius + k * k) * Math.cos(c) + 200;
    const pulse = layers.pulse
      ? d * d * (settings.pulse / 3) * Math.sin(time * 3 - d)
      : 0;
    const ripple = layers.ripple ? 3 * Math.sin(k * 2) : 0;
    const feather = layers.feather
      ? y / settings.featherDivisor * k * (e + Math.sin(e * 4 - d * 4))
      : 0;
    const screenY = settings.height * Math.sin(c / 3) + 200 + pulse + ripple + feather;

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
      if (formulaVariables.has("u")) colorScope.u = index / Math.max(1, settings.pointCount - 1);
      if (formulaVariables.has("r")) colorScope.r = Math.hypot(x - 200, screenY - 200);
      if (formulaVariables.has("angle")) colorScope.angle = Math.atan2(screenY - 200, x - 200);
      colorScope.mix = 0;
      const bucketIndex = Math.round(props.colorEvaluator(colorScope) * (colorBuckets.length - 1));
      colorBuckets[bucketIndex].push(x, screenY);
    } else {
      context.fillRect(x, screenY, 1, 1);
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

function animate() {
  if (!props.paused) {
    time += Math.PI / 60 * props.settings.speed;
    render();
  }
  frameId = requestAnimationFrame(animate);
}

function resetTime() {
  time = 0;
  render();
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

defineExpose({ resetTime, render });
</script>

<template>
  <canvas
    ref="canvas"
    class="primary-canvas"
    width="400"
    height="400"
    role="img"
    :aria-label="`Анимированная параметрическая композиция из ${color.mode === 'formula' ? 'формульно окрашенных' : 'однотонных'} точек`"
  ></canvas>
</template>
