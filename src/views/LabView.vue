<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ColorFormulaControls from "../components/ColorFormulaControls.vue";
import ParametricCanvas from "../components/ParametricCanvas.vue";
import SketchRunner from "../components/SketchRunner.vue";
import { useColorFormula } from "../composables/useColorFormula.js";
import {
  PELAGION_GENOME_CHARACTERS,
  PELAGION_GENOME_SKETCH
} from "../data/pelagionGenome.js";
import { spatialForms, spatialFormById, spatialLayerDefaults } from "../data/spatialForms.js";
import {
  LAB_VIEW_MODE,
  mergeLabViewModeQuery,
  readLabViewMode
} from "../lib/labViewMode.js";

const route = useRoute();
const router = useRouter();
const { color, evaluator: colorEvaluator, error: colorFormulaError, resetColor } = useColorFormula(route, router);

const requestedFormId = Array.isArray(route.query.form) ? route.query.form[0] : route.query.form;
const initialForm = spatialFormById(requestedFormId);
const selectedFormId = ref(initialForm.id);
const selectedForm = computed(() => spatialFormById(selectedFormId.value));
const viewMode = ref(readLabViewMode(route.query.view));
const isBareMode = computed(() => viewMode.value === LAB_VIEW_MODE.bare);
const bareSketch = computed(() => selectedForm.value.sketch || PELAGION_GENOME_SKETCH);
const bareCodeLength = computed(() => bareSketch.value.code.length);
const bareRunnerLabel = computed(() => selectedForm.value.sketch
  ? `${selectedForm.value.title}: исходный p5.js-скетч без преобразований`
  : `Пелагион: автономный p5.js-геном, ${PELAGION_GENOME_CHARACTERS} символов`);
const bareLead = computed(() => selectedForm.value.sketch
  ? "Исходный p5.js-код выполняется изолированно и без глубины, формульного цвета или управления лаборатории."
  : `Автономный ${PELAGION_GENOME_CHARACTERS}-символьный геном выполняется без расширенной анатомии, следа и реакции SPA.`);
const settings = reactive({ ...initialForm.defaults });
const layers = reactive(spatialLayerDefaults(initialForm));
const canvas = ref(null);
const bareRunner = ref(null);
const reducedMotionRequested = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const spaPaused = ref(reducedMotionRequested);
const barePaused = ref(reducedMotionRequested);
const barePauseReason = ref(reducedMotionRequested ? "system" : "");
const invertOrbitY = ref(true);
const preset = ref(basePresetLabel(initialForm));
const reactionMessage = ref("");
let reactionTimer;
const primaryControls = computed(() => selectedForm.value.primaryControls);
const advancedControls = computed(() => selectedForm.value.advancedControls);
const pointStatus = computed(() => `#${formNumber(selectedForm.value)} · ${settings.pointCount.toLocaleString("ru-RU")} pts · 400²`);

function formNumber(form) {
  if (form.displayNumber) return form.displayNumber;
  return String(form.sketchNumber).padStart(2, "0");
}

function basePresetLabel(form) {
  return form.origin === "community-synthesis" ? "Синтез" : "Original";
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
  spaPaused.value = false;
  invertOrbitY.value = true;
  preset.value = basePresetLabel(form);
  canvas.value?.resetTime();
  canvas.value?.resetView();
}

function frontView() {
  canvas.value?.resetView();
}

function restartBareSketch() {
  bareRunner.value?.reload();
}

function startBareMotion() {
  barePaused.value = false;
  barePauseReason.value = "";
}

function toggleBareMotion() {
  if (barePaused.value) startBareMotion();
  else {
    barePaused.value = true;
    barePauseReason.value = "user";
  }
}

function provoke() {
  canvas.value?.provoke();
}

function announceStimulus() {
  reactionMessage.value = "Пелагион сжался и раскрыл мембрану в ответ на возмущение.";
  window.clearTimeout(reactionTimer);
  reactionTimer = window.setTimeout(() => { reactionMessage.value = ""; }, 1800);
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

function setViewMode(mode, updateRoute = true) {
  const nextMode = readLabViewMode(mode);
  if (nextMode === viewMode.value) return;
  viewMode.value = nextMode;

  if (updateRoute) {
    router.replace({ query: mergeLabViewModeQuery(route.query, nextMode) })
      .catch(() => undefined);
  }
}

async function selectForm(formId, updateRoute = true) {
  const form = spatialFormById(formId);
  if (form.id === selectedFormId.value) return;

  selectedFormId.value = form.id;
  replaceReactive(settings, form.defaults);
  replaceReactive(layers, spatialLayerDefaults(form));
  preset.value = basePresetLabel(form);
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

watch(
  () => route.query.view,
  value => {
    const mode = readLabViewMode(value);
    if (mode !== viewMode.value) setViewMode(mode, false);
  }
);

onBeforeUnmount(() => window.clearTimeout(reactionTimer));
</script>

<template>
  <section class="view">
    <header class="view-head">
      <div>
        <p class="eyebrow">Generative study / Lab</p>
        <h1 class="display-title">Form / Field</h1>
      </div>
      <p class="view-lead">
        <strong>{{ selectedForm.title }}.</strong>&nbsp;
        <template v-if="isBareMode">{{ bareLead }}</template>
        <template v-else>{{ selectedForm.description }} Проведите пальцем по форме, чтобы обойти её вокруг центра.</template>
      </p>
    </header>

    <div class="lab-workspace">
      <div class="canvas-stage">
        <div class="render-switch" role="group" aria-label="Режим исполнения рисунка">
          <button
            type="button"
            :aria-pressed="isBareMode"
            @click="setViewMode(LAB_VIEW_MODE.bare)"
          ><span>RAW</span>Голый скетч</button>
          <button
            type="button"
            :aria-pressed="!isBareMode"
            @click="setViewMode(LAB_VIEW_MODE.spa)"
          ><span>SPA</span>SPA-форма</button>
        </div>

        <ParametricCanvas
          v-if="!isBareMode"
          ref="canvas"
          :form="selectedForm"
          :settings="settings"
          :layers="layers"
          :color="color"
          :color-evaluator="colorEvaluator"
          :invert-y="invertOrbitY"
          :paused="spaPaused"
          @stimulate="announceStimulus"
        />
        <SketchRunner
          v-else
          :key="bareSketch.id"
          ref="bareRunner"
          class="lab-raw-runner"
          :sketch="bareSketch"
          :label="bareRunnerLabel"
          :paused="barePaused"
        />
        <div
          v-if="isBareMode && barePaused"
          class="raw-paused-overlay"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div>
            <span>{{ barePauseReason === "system" ? "SYSTEM / REDUCE MOTION" : "RAW / PAUSED" }}</span>
            <strong>Анимация остановлена</strong>
          </div>
          <button class="button primary" type="button" @click="startBareMotion">Запустить анимацию</button>
        </div>
        <div class="canvas-meta" aria-hidden="true">
          <span><span class="live-dot" :class="{ raw: isBareMode }"></span>{{ isBareMode ? barePaused ? "pause / raw" : "raw / p5.js" : spaPaused ? "pause" : "live" }}</span>
          <span v-if="isBareMode">{{ bareCodeLength }} chars · isolated · no SPA</span>
          <span v-else>{{ selectedForm.supportsStimulus ? "tap / provoke · drag / orbit" : "drag / orbit" }} · {{ pointStatus }}</span>
        </div>
        <p class="sr-only" aria-live="polite">{{ reactionMessage }}</p>
      </div>

      <aside class="control-panel" :aria-label="isBareMode ? 'Сведения о голом скетче' : 'Параметры визуализации'">
        <div class="form-picker">
          <p class="panel-kicker">Форма / синтез</p>
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
            <RouterLink
              v-if="selectedForm.sketch"
              :to="{ name: 'sketch', params: { id: selectedForm.sketch.id } }"
            >оригинал и код →</RouterLink>
            <RouterLink v-else to="/community#pelagion">карта происхождения →</RouterLink>
          </p>
        </div>

        <div v-if="isBareMode" class="bare-mode-panel">
          <div>
            <p class="panel-kicker">RAW / ISOLATED P5.JS</p>
            <h2>Код без лаборатории</h2>
            <p>{{ bareLead }}</p>
          </div>

          <dl class="bare-mode-facts">
            <div><dt>Исполнение</dt><dd>p5.js в изолированном iframe</dd></div>
            <div><dt>Объём</dt><dd>{{ bareCodeLength }} символов</dd></div>
            <div><dt>Визуальные надстройки</dt><dd>отсутствуют</dd></div>
          </dl>

          <div class="bare-mode-actions">
            <div class="bare-transport">
              <button class="button primary" type="button" @click="restartBareSketch">Перезапустить</button>
              <button class="button" type="button" :aria-pressed="barePaused" @click="toggleBareMotion">{{ barePaused ? "Продолжить" : "Приостановить" }}</button>
            </div>
            <RouterLink
              v-if="selectedForm.sketch"
              class="text-link"
              :to="{ name: 'sketch', params: { id: selectedForm.sketch.id } }"
            >Открыть оригинал и код →</RouterLink>
            <template v-else>
              <RouterLink class="text-link" to="/theory#pelagion">Открыть геном и LaTeX →</RouterLink>
              <RouterLink class="text-link" to="/community#pelagion">Карта происхождения →</RouterLink>
            </template>
          </div>

          <p class="bare-mode-note"><strong>Важно:</strong> переключение не сравнивает «плохую» и «улучшенную» версии. Оно разделяет исходное кодовое высказывание и его исследовательское разворачивание в SPA.</p>
        </div>

        <template v-else>
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
            <button
              v-if="selectedForm.supportsStimulus"
              class="button primary wide"
              type="button"
              @click="provoke"
            >Спровоцировать реакцию</button>
            <button
              class="button"
              :class="{ primary: !selectedForm.supportsStimulus, wide: !selectedForm.supportsStimulus }"
              type="button"
              :aria-pressed="spaPaused"
              @click="spaPaused = !spaPaused"
            >
              {{ spaPaused ? "Продолжить" : "Приостановить" }}
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

          <RouterLink class="text-link" :to="selectedForm.id === 'pelagion' ? '/theory#pelagion' : '/theory'">Открыть код и математическую модель →</RouterLink>
        </template>
      </aside>
    </div>
  </section>
</template>
