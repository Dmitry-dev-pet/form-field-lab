<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const stages = Object.freeze([
  Object.freeze({
    id: "seed",
    index: "01",
    label: "Посев random3D",
    short: "Сфера становится диском",
    description: "Точки равномерно рождаются на сфере, но исходный 2D-холст использует только x и y. Третья координата пока не создаёт наблюдаемого объёма."
  }),
  Object.freeze({
    id: "memory",
    index: "02",
    label: "Память координат",
    short: "Точка продолжает путь",
    description: "Положение больше не вычисляется с нуля. Каждый кадр добавляет малый шаг к предыдущему состоянию; здесь поле временно оставлено непрерывным."
  }),
  Object.freeze({
    id: "xor",
    index: "03",
    label: "XOR-поле",
    short: "Плоскость делится на клетки",
    description: "Побитовое XOR сначала превращает координаты в целые. Частота скачком меняется на границах клеток, и непрерывное течение собирается в решётку."
  }),
  Object.freeze({
    id: "metabolism",
    index: "04",
    label: "Обмен и след",
    short: "Организм обновляет вещество",
    description: "Пакеты новых частиц входят в массив, старые удаляются, индекс становится приблизительным возрастом, а полупрозрачный фон хранит следы движения."
  })
]);

const canvas = ref(null);
const stageIndex = ref(0);
const paused = ref(false);
const particleCount = ref(2000);
const frameNumber = ref(0);
const currentStage = computed(() => stages[stageIndex.value]);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let context;
let particles = [];
let animationFrame;
let lastFrame = 0;
let seedState = 0x9e3779b9;

function random() {
  seedState ^= seedState << 13;
  seedState ^= seedState >>> 17;
  seedState ^= seedState << 5;
  return (seedState >>> 0) / 4294967296;
}

function randomSphere() {
  const z = random() * 2 - 1;
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(1 - z * z);
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z };
}

function reset() {
  seedState = 0x9e3779b9;
  particles = Array.from({ length: 2000 }, randomSphere);
  frameNumber.value = 0;
  particleCount.value = particles.length;
  draw(true);
}

function chooseStage(index) {
  stageIndex.value = index;
  reset();
}

function stepParticle(particle, quantized) {
  const frequency = quantized
    ? ((Math.trunc(particle.x * 2 + 2.5) ^ Math.trunc(particle.y + 2)) * 8)
    : (particle.x * 2 + 2.5 + particle.y + 2) * 8;
  particle.x += Math.sin(particle.y * frequency) / 90;
  particle.y += Math.cos(particle.x * frequency) / 90;
}

function colorFor(index, metabolism) {
  if (!metabolism) return "rgba(244,243,237,.68)";
  return `rgb(${Math.min(255, index)},${Math.min(255, index / 3)},${Math.min(255, index / 5)})`;
}

function draw(forceClear = false) {
  if (!context) return;
  const stage = currentStage.value.id;
  const metabolism = stage === "metabolism";
  context.fillStyle = metabolism && !forceClear ? "rgba(0,0,0,.045)" : "#090909";
  context.fillRect(0, 0, 540, 540);

  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    if (stage !== "seed") stepParticle(particle, stage !== "memory");
    const x = (particle.x + 2) * 135;
    const y = (particle.y + 1.6) * 135;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    context.fillStyle = colorFor(index, metabolism);
    context.fillRect(x, y, 1.25, 1.25);
  }

  if (metabolism) {
    particles = particles[2000]
      ? particles.slice(-1980)
      : [...particles, ...Array.from({ length: 20 }, randomSphere)];
  }
  frameNumber.value += 1;
  particleCount.value = particles.length;
}

function animate(timestamp) {
  if (!paused.value && timestamp - lastFrame >= 1000 / 30) {
    lastFrame = timestamp;
    draw();
  }
  animationFrame = requestAnimationFrame(animate);
}

function togglePause() {
  paused.value = !paused.value;
  if (!paused.value) lastFrame = performance.now();
}

onMounted(() => {
  context = canvas.value.getContext("2d", { alpha: false });
  paused.value = prefersReducedMotion;
  reset();
  animationFrame = requestAnimationFrame(animate);
});

onBeforeUnmount(() => cancelAnimationFrame(animationFrame));
</script>

<template>
  <section class="mechanism-microscope" aria-labelledby="mechanism-microscope-title">
    <header class="microscope-head">
      <div>
        <span>MICROSCOPE / ORIGINAL #36</span>
        <h3 id="mechanism-microscope-title">Из чего возникает решётчатое существо</h3>
      </div>
      <div class="microscope-transport">
        <button class="button" type="button" @click="reset">Сбросить</button>
        <button class="button" type="button" :aria-pressed="paused" @click="togglePause">{{ paused ? "Продолжить" : "Пауза" }}</button>
      </div>
    </header>

    <div class="microscope-layout">
      <div class="microscope-stage">
        <canvas
          ref="canvas"
          width="540"
          height="540"
          role="img"
          :aria-label="`Этап ${currentStage.index}: ${currentStage.label}. ${currentStage.description}`"
        ></canvas>
        <div class="microscope-readout" aria-live="polite">
          <span>{{ currentStage.index }} / {{ currentStage.short }}</span>
          <span>{{ particleCount }} точек · кадр {{ frameNumber }}</span>
        </div>
      </div>

      <div class="microscope-controls">
        <div class="microscope-tabs" role="tablist" aria-label="Слои механики исходного скетча">
          <button
            v-for="(stage, index) in stages"
            :key="stage.id"
            type="button"
            role="tab"
            :aria-selected="stageIndex === index"
            :aria-controls="`microscope-panel-${stage.id}`"
            @click="chooseStage(index)"
          >
            <span>{{ stage.index }}</span>
            <strong>{{ stage.label }}</strong>
          </button>
        </div>
        <div
          :id="`microscope-panel-${currentStage.id}`"
          class="microscope-copy"
          role="tabpanel"
        >
          <span>{{ currentStage.short }}</span>
          <h4>{{ currentStage.label }}</h4>
          <p>{{ currentStage.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
