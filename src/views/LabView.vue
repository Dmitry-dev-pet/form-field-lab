<script setup>
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import ColorFormulaControls from "../components/ColorFormulaControls.vue";
import ParametricCanvas from "../components/ParametricCanvas.vue";
import { useColorFormula } from "../composables/useColorFormula.js";

const route = useRoute();
const router = useRouter();
const { color, evaluator: colorEvaluator, error: colorFormulaError, resetColor } = useColorFormula(route, router);

const original = Object.freeze({
  speed: 1,
  forms: 3,
  radius: 79,
  height: 99,
  waveFrequency: 31,
  pulse: 3,
  pointCount: 20000,
  alpha: 96,
  phaseStep: 8,
  radialDivisor: 99,
  distanceOffset: 6,
  featherDivisor: 13,
  backgroundColor: "#090909"
});

const settings = reactive({ ...original });
const layers = reactive({ symmetry: true, pulse: true, ripple: true, feather: true });
const canvas = ref(null);
const paused = ref(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const preset = ref("Original");

const primaryControls = [
  { key: "speed", label: "Скорость", min: 0, max: 3, step: 0.05 },
  { key: "forms", label: "Формы", min: 1, max: 8, step: 1 },
  { key: "radius", label: "Размер", min: 30, max: 140, step: 1 },
  { key: "height", label: "Высота", min: 30, max: 170, step: 1 },
  { key: "waveFrequency", label: "Волны", min: 5, max: 60, step: 1 },
  { key: "pulse", label: "Пульсация", min: 0, max: 8, step: 0.1 },
  { key: "pointCount", label: "Точки", min: 2000, max: 40000, step: 1000 },
  { key: "alpha", label: "Прозрачность", min: 10, max: 255, step: 1 }
];

const advancedControls = [
  { key: "phaseStep", label: "Фазовый шаг", min: 0, max: 16, step: 0.1 },
  { key: "radialDivisor", label: "Плотность рёбер", min: 35, max: 200, step: 1 },
  { key: "distanceOffset", label: "Радиальное смещение", min: 0, max: 12, step: 0.1 },
  { key: "featherDivisor", label: "Длина волокон", min: 5, max: 30, step: 1 }
];

const layerLabels = {
  symmetry: "Симметрия",
  pulse: "Пульсация",
  ripple: "Рябь",
  feather: "Волокна"
};

const pointStatus = computed(() => `${settings.pointCount.toLocaleString("ru-RU")} pts · 400²`);

function formatValue(key, value) {
  if (key === "speed") return `${Number(value).toFixed(2)}×`;
  if (["pulse", "phaseStep", "distanceOffset"].includes(key)) return Number(value).toFixed(1);
  if (key === "pointCount") return Number(value).toLocaleString("ru-RU");
  return String(Math.round(value));
}

function rangeStyle(control) {
  const fill = (settings[control.key] - control.min) / (control.max - control.min) * 100;
  return { "--fill": `${fill}%` };
}

function changed() {
  preset.value = "Изменено";
}

function toggleLayer(key) {
  layers[key] = !layers[key];
  preset.value = "Анатомия";
}

function reset() {
  Object.assign(settings, original);
  resetColor();
  Object.keys(layers).forEach(key => { layers[key] = true; });
  paused.value = false;
  preset.value = "Original";
  canvas.value?.resetTime();
}

function randomStep(min, max, step) {
  const steps = Math.round((max - min) / step);
  return min + Math.floor(Math.random() * (steps + 1)) * step;
}

function randomize() {
  Object.assign(settings, {
    speed: randomStep(0.25, 2.5, 0.05),
    forms: randomStep(2, 7, 1),
    radius: randomStep(48, 120, 1),
    height: randomStep(60, 145, 1),
    waveFrequency: randomStep(12, 55, 1),
    pulse: randomStep(0.5, 6, 0.1),
    pointCount: randomStep(12000, 32000, 1000),
    alpha: randomStep(50, 170, 1),
    phaseStep: randomStep(4, 13, 0.1),
    radialDivisor: randomStep(55, 165, 1),
    distanceOffset: randomStep(3, 10, 0.1),
    featherDivisor: randomStep(8, 24, 1)
  });
  preset.value = "Случайный";
}
</script>

<template>
  <section class="view">
    <header class="view-head">
      <div>
        <p class="eyebrow">Generative study / Lab</p>
        <h1 class="display-title">Form / Field</h1>
      </div>
      <p class="view-lead">Двадцать тысяч координат складываются в живую структуру. Меняйте коэффициенты или отключайте отдельные «органы» формулы.</p>
    </header>

    <div class="lab-workspace">
      <div class="canvas-stage">
        <ParametricCanvas
          ref="canvas"
          :settings="settings"
          :layers="layers"
          :color="color"
          :color-evaluator="colorEvaluator"
          :paused="paused"
        />
        <div class="canvas-meta" aria-hidden="true">
          <span><span class="live-dot"></span>{{ paused ? "pause" : "live" }}</span>
          <span>{{ pointStatus }}</span>
        </div>
      </div>

      <aside class="control-panel" aria-label="Параметры визуализации">
        <div class="panel-title-row">
          <h2>Параметры</h2>
          <span class="status-badge">Форма · {{ preset }}</span>
        </div>

        <div class="control-list">
          <label v-for="control in primaryControls" :key="control.key" class="range-field">
            <span>{{ control.label }} <output>{{ formatValue(control.key, settings[control.key]) }}</output></span>
            <input
              v-model.number="settings[control.key]"
              type="range"
              :min="control.min"
              :max="control.max"
              :step="control.step"
              :style="rangeStyle(control)"
              :aria-label="control.label"
              @input="changed"
            >
          </label>
        </div>

        <div class="button-grid">
          <button class="button primary wide" type="button" :aria-pressed="paused" @click="paused = !paused">
            {{ paused ? "Продолжить" : "Приостановить" }}
          </button>
          <button class="button" type="button" @click="reset">Сбросить</button>
          <button class="button" type="button" @click="randomize">Случайный</button>
        </div>

        <details class="control-details color-details" open>
          <summary>Цветовая формула</summary>
          <ColorFormulaControls
            v-model:mode="color.mode"
            v-model:preset="color.preset"
            v-model:expression="color.expression"
            v-model:color-a="color.colorA"
            v-model:color-b="color.colorB"
            v-model:background="settings.backgroundColor"
            :error="colorFormulaError"
            include-background
          />
        </details>

        <details class="control-details">
          <summary>Точная настройка и анатомия</summary>
          <div class="advanced-controls">
            <label v-for="control in advancedControls" :key="control.key" class="range-field">
              <span>{{ control.label }} <output>{{ formatValue(control.key, settings[control.key]) }}</output></span>
              <input
                v-model.number="settings[control.key]"
                type="range"
                :min="control.min"
                :max="control.max"
                :step="control.step"
                :style="rangeStyle(control)"
                :aria-label="control.label"
                @input="changed"
              >
            </label>

            <div class="anatomy-box">
              <div class="anatomy-title"><strong>Анатомия</strong><small>нажмите, чтобы убрать</small></div>
              <div class="layer-grid">
                <button
                  v-for="(label, key) in layerLabels"
                  :key="key"
                  class="layer-toggle"
                  type="button"
                  :aria-pressed="layers[key]"
                  @click="toggleLayer(key)"
                >{{ label }}</button>
              </div>
            </div>
          </div>
        </details>

        <RouterLink class="text-link" to="/theory">Открыть код и математическую модель →</RouterLink>
      </aside>
    </div>
  </section>
</template>
