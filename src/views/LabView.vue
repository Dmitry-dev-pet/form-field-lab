<script setup>
import { computed, nextTick, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ColorFormulaControls from "../components/ColorFormulaControls.vue";
import ParametricCanvas from "../components/ParametricCanvas.vue";
import { useColorFormula } from "../composables/useColorFormula.js";
import { spatialForms, spatialFormById, spatialLayerDefaults } from "../data/spatialForms.js";

const route = useRoute();
const router = useRouter();
const { color, evaluator: colorEvaluator, error: colorFormulaError, resetColor } = useColorFormula(route, router);

const requestedFormId = Array.isArray(route.query.form) ? route.query.form[0] : route.query.form;
const initialForm = spatialFormById(requestedFormId);
const selectedFormId = ref(initialForm.id);
const selectedForm = computed(() => spatialFormById(selectedFormId.value));
const settings = reactive({ ...initialForm.defaults });
const layers = reactive(spatialLayerDefaults(initialForm));
const canvas = ref(null);
const paused = ref(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const invertOrbitY = ref(true);
const preset = ref("Original");
const primaryControls = computed(() => selectedForm.value.primaryControls);
const advancedControls = computed(() => selectedForm.value.advancedControls);
const pointStatus = computed(() => `#${formNumber(selectedForm.value)} · ${settings.pointCount.toLocaleString("ru-RU")} pts · 400²`);

function formNumber(form) {
  return String(form.sketchNumber).padStart(2, "0");
}

function formatValue(control, value) {
  if (control.format === "speed") return `${Number(value).toFixed(2)}×`;
  if (control.format === "percent") return `${Math.round(Number(value) * 100)}%`;
  if (control.format === "count") return Number(value).toLocaleString("ru-RU");
  if (Number.isInteger(control.digits)) return Number(value).toFixed(control.digits);
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

function replaceReactive(target, source) {
  Object.keys(target).forEach(key => { delete target[key]; });
  Object.assign(target, source);
}

function reset() {
  const form = selectedForm.value;
  replaceReactive(settings, form.defaults);
  replaceReactive(layers, spatialLayerDefaults(form));
  resetColor();
  paused.value = false;
  invertOrbitY.value = true;
  preset.value = "Original";
  canvas.value?.resetTime();
  canvas.value?.resetView();
}

function frontView() {
  canvas.value?.resetView();
}

function randomStep(min, max, step) {
  const steps = Math.round((max - min) / step);
  return min + Math.floor(Math.random() * (steps + 1)) * step;
}

function randomize() {
  Object.entries(selectedForm.value.randomRanges).forEach(([key, [min, max, step]]) => {
    settings[key] = Number(randomStep(min, max, step).toFixed(6));
  });
  preset.value = "Случайный";
}

async function selectForm(formId, updateRoute = true) {
  const form = spatialFormById(formId);
  if (form.id === selectedFormId.value) return;

  selectedFormId.value = form.id;
  replaceReactive(settings, form.defaults);
  replaceReactive(layers, spatialLayerDefaults(form));
  preset.value = "Original";
  await nextTick();
  canvas.value?.resetTime();
  canvas.value?.resetView();

  if (updateRoute) {
    const query = { ...route.query };
    if (form.id === spatialForms[0].id) delete query.form;
    else query.form = form.id;
    router.replace({ query }).catch(() => undefined);
  }
}

watch(
  () => route.query.form,
  value => {
    const formId = Array.isArray(value) ? value[0] : value;
    const form = spatialFormById(formId);
    if (form.id !== selectedFormId.value) selectForm(form.id, false);
  }
);
</script>

<template>
  <section class="view">
    <header class="view-head">
      <div>
        <p class="eyebrow">Generative study / Lab</p>
        <h1 class="display-title">Form / Field</h1>
      </div>
      <p class="view-lead"><strong>{{ selectedForm.title }}.</strong> {{ selectedForm.description }} Проведите пальцем по форме, чтобы обойти её вокруг центра.</p>
    </header>

    <div class="lab-workspace">
      <div class="canvas-stage">
        <ParametricCanvas
          ref="canvas"
          :form="selectedForm"
          :settings="settings"
          :layers="layers"
          :color="color"
          :color-evaluator="colorEvaluator"
          :invert-y="invertOrbitY"
          :paused="paused"
        />
        <div class="canvas-meta" aria-hidden="true">
          <span><span class="live-dot"></span>{{ paused ? "pause" : "live" }}</span>
          <span>drag / orbit · {{ pointStatus }}</span>
        </div>
      </div>

      <aside class="control-panel" aria-label="Параметры визуализации">
        <div class="form-picker">
          <p class="panel-kicker">Исходная форма</p>
          <div class="form-choice-grid" role="group" aria-label="Выбор исходного скетча">
            <button
              v-for="form in spatialForms"
              :key="form.id"
              class="form-choice"
              type="button"
              :aria-pressed="selectedForm.id === form.id"
              @click="selectForm(form.id)"
            >
              <strong>#{{ formNumber(form) }}</strong>
              <span>{{ form.shortLabel }}</span>
            </button>
          </div>
          <p class="form-context">
            <span>{{ selectedForm.association }}</span>
            <RouterLink :to="{ name: 'sketch', params: { id: selectedForm.sketch.id } }">оригинал и код →</RouterLink>
          </p>
        </div>

        <div class="panel-title-row">
          <h2>Параметры</h2>
          <span class="status-badge">#{{ formNumber(selectedForm) }} · {{ preset }}</span>
        </div>

        <div class="control-list">
          <label v-for="control in primaryControls" :key="control.key" class="range-field">
            <span>{{ control.label }} <output>{{ formatValue(control, settings[control.key]) }}</output></span>
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
          <button class="button" type="button" @click="frontView">Вид спереди</button>
          <button
            class="button"
            type="button"
            :aria-pressed="invertOrbitY"
            @click="invertOrbitY = !invertOrbitY"
          >Инверсия Y · {{ invertOrbitY ? "вкл." : "выкл." }}</button>
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
              <span>{{ control.label }} <output>{{ formatValue(control, settings[control.key]) }}</output></span>
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
                  v-for="layer in selectedForm.layers"
                  :key="layer.key"
                  class="layer-toggle"
                  type="button"
                  :aria-pressed="layers[layer.key]"
                  @click="toggleLayer(layer.key)"
                >{{ layer.label }}</button>
              </div>
            </div>
          </div>
        </details>

        <RouterLink class="text-link" to="/theory">Открыть код и математическую модель →</RouterLink>
      </aside>
    </div>
  </section>
</template>
