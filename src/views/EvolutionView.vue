<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { sketches } from "../data/sketches.js";
import { createPointEngine, interpolatePointClouds } from "../lib/pointEngine.js";

const route = useRoute();
const router = useRouter();
const canvas = ref(null);
const parentA = ref(readIndex(route.query.a, 5));
const parentB = ref(readIndex(route.query.b, 3));
const mix = ref(readMix(route.query.mix));
const auto = ref(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const pointStatus = ref("— points");
const errorMessage = ref("");
let engineA;
let engineB;
let context;
let frameId;
let lastFrame = 0;
let direction = 1;

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});

function readIndex(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  const oneBased = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(0, Math.min(sketches.length - 1, oneBased - 1));
}

function readMix(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.5;
}

function label(sketch, index) {
  return `№ ${String(index + 1).padStart(2, "0")} · ${dateFormatter.format(new Date(sketch.createdAt))}`;
}

function rangeStyle() {
  return { "--fill": `${mix.value * 100}%` };
}

function rebuild() {
  try {
    engineA = createPointEngine(sketches[parentA.value]);
    engineB = createPointEngine(sketches[parentB.value]);
    errorMessage.value = "";
    render();
  } catch (error) {
    auto.value = false;
    errorMessage.value = `Не удалось подготовить формулу: ${error.message}`;
  }
}

function render() {
  if (!context || !engineA || !engineB) return;
  try {
    const pointsA = engineA.frame();
    const pointsB = engineB.frame();
    const points = interpolatePointClouds(pointsA, pointsB, mix.value);
    context.fillStyle = "#090909";
    context.fillRect(0, 0, 400, 400);
    context.fillStyle = "rgba(255,255,255,0.42)";
    points.forEach(([x, y]) => context.fillRect(x, y, 1, 1));
    pointStatus.value = mix.value <= 0.001 || mix.value >= 0.999
      ? `${points.length.toLocaleString("ru-RU")} points`
      : `${pointsA.length.toLocaleString("ru-RU")} ↔ ${pointsB.length.toLocaleString("ru-RU")} points`;
    errorMessage.value = "";
  } catch (error) {
    auto.value = false;
    errorMessage.value = `Не удалось выполнить формулу: ${error.message}`;
  }
}

function animate(timestamp) {
  if (auto.value && timestamp - lastFrame >= 33) {
    lastFrame = timestamp;
    let next = mix.value + direction * 0.004;
    if (next >= 1 || next <= 0) {
      next = Math.max(0, Math.min(1, next));
      direction *= -1;
    }
    mix.value = next;
    render();
  }
  frameId = requestAnimationFrame(animate);
}

function syncQuery() {
  router.replace({
    name: "evolution",
    query: {
      a: String(parentA.value + 1),
      b: String(parentB.value + 1),
      mix: mix.value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")
    }
  });
}

function selectParent() {
  rebuild();
  syncQuery();
}

function manualMix() {
  auto.value = false;
  render();
}

function finishMix() {
  syncQuery();
}

function toggleAuto() {
  auto.value = !auto.value;
  if (!auto.value) {
    render();
    syncQuery();
  }
}

function swap() {
  const previous = parentA.value;
  parentA.value = parentB.value;
  parentB.value = previous;
  mix.value = 1 - mix.value;
  rebuild();
  syncQuery();
}

onMounted(() => {
  context = canvas.value.getContext("2d", { alpha: false });
  rebuild();
  frameId = requestAnimationFrame(animate);
});

onBeforeUnmount(() => cancelAnimationFrame(frameId));
</script>

<template>
  <section class="view">
    <header class="view-head">
      <div>
        <p class="eyebrow">Evolution / point transport</p>
        <h1 class="display-title">Скрестить две формулы</h1>
      </div>
      <p class="view-lead">Выберите любые две работы. Обе программы вычисляются заново, а соответствующие точки непрерывно перемещаются между координатами A и B.</p>
    </header>

    <div class="evolution-workspace">
      <div class="evolution-stage">
        <canvas ref="canvas" width="400" height="400" role="img" :aria-label="`Морфинг между скетчами ${parentA + 1} и ${parentB + 1}`"></canvas>
        <div class="canvas-meta" aria-hidden="true">
          <span><span class="live-dot"></span>{{ auto ? "auto morph" : "manual" }}</span>
          <span>{{ pointStatus }}</span>
        </div>
      </div>

      <aside class="evolution-panel" aria-label="Параметры эволюции">
        <h2>Родительские формы</h2>

        <label class="select-field">
          <span>Формула A <b>№ {{ String(parentA + 1).padStart(2, "0") }}</b></span>
          <select v-model.number="parentA" @change="selectParent">
            <option v-for="(sketch, index) in sketches" :key="sketch.id" :value="index">{{ label(sketch, index) }}</option>
          </select>
        </label>

        <label class="select-field">
          <span>Формула B <b>№ {{ String(parentB + 1).padStart(2, "0") }}</b></span>
          <select v-model.number="parentB" @change="selectParent">
            <option v-for="(sketch, index) in sketches" :key="sketch.id" :value="index">{{ label(sketch, index) }}</option>
          </select>
        </label>

        <label class="range-field mix-field">
          <span>Степень превращения <output>{{ Math.round(mix * 100) }}%</output></span>
          <input v-model.number="mix" type="range" min="0" max="1" step="0.005" :style="rangeStyle()" @input="manualMix" @change="finishMix">
        </label>

        <div class="button-grid two">
          <button class="button primary" type="button" :aria-pressed="auto" @click="toggleAuto">{{ auto ? "Остановить" : "Продолжить" }}</button>
          <button class="button" type="button" @click="swap">Поменять местами</button>
        </div>

        <div class="parent-links">
          <RouterLink :to="`/sketch/${sketches[parentA].id}`">Открыть A</RouterLink>
          <RouterLink :to="`/sketch/${sketches[parentB].id}`">Открыть B</RouterLink>
        </div>

        <p class="method-note"><strong>Метод.</strong> Это не растворение изображений: на каждом кадре исполняются оба исходника. На краях ползунка сохраняется оригинальная геометрия автора.</p>
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
      </aside>
    </div>
  </section>
</template>
