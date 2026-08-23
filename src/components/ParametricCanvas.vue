<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  settings: { type: Object, required: true },
  layers: { type: Object, required: true },
  paused: { type: Boolean, default: false }
});

const canvas = ref(null);
let context;
let frameId;
let time = 0;

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 };
}

function render() {
  if (!context) return;
  const { settings, layers } = props;
  context.fillStyle = settings.backgroundColor;
  context.fillRect(0, 0, 400, 400);

  const point = hexToRgb(settings.pointColor);
  context.fillStyle = `rgba(${point.r}, ${point.g}, ${point.b}, ${settings.alpha / 255})`;
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
    context.fillRect(x, screenY, 1, 1);
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
  [() => props.settings, () => props.layers, () => props.paused],
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
    aria-label="Анимированная параметрическая композиция из светящихся точек"
  ></canvas>
</template>
