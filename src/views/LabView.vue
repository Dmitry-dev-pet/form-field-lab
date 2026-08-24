<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ColorFormulaControls from "../components/ColorFormulaControls.vue";
import ParametricCanvas from "../components/ParametricCanvas.vue";
import SketchRunner from "../components/SketchRunner.vue";
import { useColorFormula } from "../composables/useColorFormula.js";
import { spatialForms, spatialFormById, spatialLayerDefaults } from "../data/spatialForms.js";
import { DEFAULT_COLOR_STATE } from "../lib/colorFormula.js";
import {
  compileChronophoreImprint,
  createSavedEntityRecord,
  nextMutationNumber,
  readSavedEntities,
  writeSavedEntities
} from "../lib/genomeImprint.js";
import {
  LAB_VIEW_MODE,
  mergeLabViewModeQuery,
  readLabViewMode
} from "../lib/labViewMode.js";
import {
  measureGridTopology,
  readMeshRenderMode,
  resolveGridTopology
} from "../lib/meshTopology.js";

const route = useRoute();
const router = useRouter();
const { color, evaluator: colorEvaluator, error: colorFormulaError, resetColor } = useColorFormula(route, router);

const savedEntityRecords = ref(readSavedEntities());
const chronophoreForm = spatialFormById("chronophore");

function hydrateSavedForm(record) {
  return {
    ...chronophoreForm,
    id: record.id,
    displayNumber: record.displayNumber,
    shortLabel: record.title.replace("Хронофор ", "Мутация "),
    title: record.title,
    association: `закреплённая мутация · потомок ${record.parentDisplayNumber}`,
    description: `Закреплённый отпечаток Хронофора сохраняет параметры, цвет и пространственную позу родителя ${record.parentDisplayNumber}. Его можно снова развернуть в SPA и использовать как родителя следующего поколения.`,
    origin: "local-mutation",
    genomeSketch: Object.freeze({ id: `${record.id}-genome`, code: record.code }),
    defaults: Object.freeze({ ...chronophoreForm.defaults, ...record.settings }),
    savedLayers: Object.freeze({ ...record.layers }),
    savedColor: Object.freeze({ ...record.color }),
    savedPose: Object.freeze({ ...record.pose }),
    savedRecord: record
  };
}

const savedMutationForms = computed(() => savedEntityRecords.value.map(hydrateSavedForm));
const availableForms = computed(() => [...spatialForms, ...savedMutationForms.value]);

function formById(formId) {
  return availableForms.value.find(form => form.id === formId) || spatialForms[0];
}

const requestedFormId = Array.isArray(route.query.form) ? route.query.form[0] : route.query.form;
const initialForm = formById(requestedFormId);
const selectedFormId = ref(initialForm.id);
const selectedForm = computed(() => formById(selectedFormId.value));
const formGroups = computed(() => {
  const groups = [
    {
      id: "attributed",
      label: "Архетипы автора",
      forms: spatialForms.filter(form => form.sketch)
    },
    {
      id: "synthetic",
      label: "Синтетические сущности",
      forms: spatialForms.filter(form => !form.sketch && form.origin !== "mesh-study")
    },
    {
      id: "mesh-studies",
      label: "Сеточные опыты",
      forms: spatialForms.filter(form => form.origin === "mesh-study")
    }
  ].filter(group => group.forms.length);
  if (savedMutationForms.value.length) {
    groups.push({
      id: "mutations",
      label: "Закреплённые мутации",
      forms: savedMutationForms.value
    });
  }
  return groups;
});
const viewMode = ref(readLabViewMode(route.query.view));
const isBareMode = computed(() => viewMode.value === LAB_VIEW_MODE.bare);
const settings = reactive({ ...initialForm.defaults });
const layers = reactive(initialForm.savedLayers || spatialLayerDefaults(initialForm));
const canvas = ref(null);
const bareRunner = ref(null);
const spaPaused = ref(false);
const barePaused = ref(false);
const invertOrbitY = ref(true);
const preset = ref(basePresetLabel(initialForm));
const reactionMessage = ref("");
const mutationMessage = ref("");
const bareVariant = ref("canonical");
const spaSnapshot = ref(initialForm.savedPose || null);
const imprintSnapshot = ref(null);
let reactionTimer;
let mutationTimer;

if (initialForm.savedColor) Object.assign(color, initialForm.savedColor);

const supportsImprint = computed(() => selectedForm.value.imprintKind === "chronophore");
const canonicalSketch = computed(() => selectedForm.value.sketch || selectedForm.value.genomeSketch);
const imprintSource = computed(() => imprintSnapshot.value || {
  settings: { ...settings },
  layers: { ...layers },
  color: { ...color },
  pose: spaSnapshot.value || selectedForm.value.savedPose || { yaw: 0, pitch: 0, time: 0 }
});

function compileImprintSource(source, pose = source.pose) {
  if (!supportsImprint.value || colorFormulaError.value) return null;
  try {
    return compileChronophoreImprint({
      ...source,
      pose,
      originalCode: canonicalSketch.value.code,
      originalDefaults: selectedForm.value.defaults,
      originalLayers: selectedForm.value.savedLayers || spatialLayerDefaults(selectedForm.value),
      originalColor: selectedForm.value.savedColor || DEFAULT_COLOR_STATE
    });
  } catch {
    return null;
  }
}

const imprintResult = computed(() => compileImprintSource(imprintSource.value));
const geneticImprintResult = computed(() => compileImprintSource(
  imprintSource.value,
  { yaw: 0, pitch: 0, time: 0 }
));
const isImprintBare = computed(() => supportsImprint.value
  && bareVariant.value === "imprint"
  && Boolean(imprintResult.value));
const bareSketch = computed(() => isImprintBare.value
  ? Object.freeze({ id: imprintResult.value.id, code: imprintResult.value.code })
  : canonicalSketch.value);
const bareCodeLength = computed(() => bareSketch.value.code.length);
const savedImprintRecord = computed(() => geneticImprintResult.value
  ? savedEntityRecords.value.find(record => record.code === geneticImprintResult.value.code)
  : null);
const nextEntityLabel = computed(() => `P${nextMutationNumber(savedEntityRecords.value)}`);
const bareRunnerLabel = computed(() => selectedForm.value.sketch
  ? `${selectedForm.value.title}: исходный p5.js-скетч без преобразований`
  : isImprintBare.value
    ? `${selectedForm.value.title}: исполняемый отпечаток текущего состояния SPA`
    : `${selectedForm.value.title}: автономный канонический p5.js-геном`);
const bareLead = computed(() => selectedForm.value.sketch
  ? "Исходный p5.js-код выполняется изолированно и без глубины, формульного цвета или управления лаборатории."
  : isImprintBare.value
    ? "Исполняемый отпечаток переносит в автономный p5.js-код текущую фазу, пространственную позу, параметры и формульный цвет SPA."
    : `Канонический ${bareCodeLength.value}-символьный геном остаётся неизменным и доступен для сравнения.`);
const primaryControls = computed(() => selectedForm.value.primaryControls);
const advancedControls = computed(() => selectedForm.value.advancedControls);
const selectedTopology = computed(() => selectedForm.value.mesh
  ? resolveGridTopology(selectedForm.value.mesh, settings)
  : null);
const meshMetrics = computed(() => selectedForm.value.mesh
  ? measureGridTopology(selectedForm.value.mesh, settings)
  : null);
const boundaryLabel = computed(() => {
  const boundaries = meshMetrics.value?.boundaries || 0;
  if (!boundaries) return "без границы";
  if (boundaries === 1) return "1 граница";
  if (boundaries >= 2 && boundaries <= 4) return `${boundaries} границы`;
  return `${boundaries} границ`;
});
const pointStatus = computed(() => {
  const form = selectedForm.value;
  if (form.mesh) {
    return `#${formNumber(form)} · ${selectedTopology.value.label} · ${meshMetrics.value.vertexCount.toLocaleString("ru-RU")} узлов · 400²`;
  }
  return `#${formNumber(form)} · ${settings.pointCount.toLocaleString("ru-RU")} pts · 400²`;
});

function formNumber(form) {
  if (form.displayNumber) return form.displayNumber;
  return String(form.sketchNumber).padStart(2, "0");
}

function basePresetLabel(form) {
  if (form.savedRecord) return "Мутация";
  return form.sketch ? "Original" : "Синтез";
}

function theoryTarget(form) {
  if (form.savedRecord) return "/theory#chronophore";
  return form.sketch ? "/theory" : `/theory#${form.id}`;
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

function setRenderMode(mode) {
  settings.renderMode = readMeshRenderMode(mode);
  changed();
}

function setTopology(topologyId) {
  if (!selectedForm.value.mesh?.topologies.some(item => item.id === topologyId)) return;
  settings.topology = topologyId;
  preset.value = "Топология";
}

function replaceReactive(target, source) {
  Object.keys(target).forEach(key => { delete target[key]; });
  Object.assign(target, source);
}

function reset() {
  const form = selectedForm.value;
  replaceReactive(settings, form.defaults);
  replaceReactive(layers, form.savedLayers || spatialLayerDefaults(form));
  if (form.savedColor) Object.assign(color, form.savedColor);
  else resetColor();
  spaPaused.value = false;
  invertOrbitY.value = true;
  preset.value = basePresetLabel(form);
  spaSnapshot.value = form.savedPose || null;
  imprintSnapshot.value = null;
  bareVariant.value = "canonical";
  canvas.value?.restoreState(spaSnapshot.value);
}

function frontView() {
  canvas.value?.resetView();
}

function restartBareSketch() {
  bareRunner.value?.reload();
}

function startBareMotion() {
  barePaused.value = false;
}

function toggleBareMotion() {
  if (barePaused.value) startBareMotion();
  else barePaused.value = true;
}

function provoke() {
  canvas.value?.provoke();
}

function announceStimulus() {
  reactionMessage.value = selectedForm.value.stimulusMessage || "Форма ответила на возмущение.";
  window.clearTimeout(reactionTimer);
  reactionTimer = window.setTimeout(() => { reactionMessage.value = ""; }, 1800);
}

function announceMutation(message) {
  mutationMessage.value = message;
  window.clearTimeout(mutationTimer);
  mutationTimer = window.setTimeout(() => { mutationMessage.value = ""; }, 3200);
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

function captureImprint() {
  if (!supportsImprint.value) return;
  const pose = canvas.value?.snapshot() || spaSnapshot.value || { yaw: 0, pitch: 0, time: 0 };
  spaSnapshot.value = { ...pose };
  imprintSnapshot.value = {
    settings: { ...settings },
    layers: { ...layers },
    color: { ...color },
    pose: { ...pose }
  };
  bareVariant.value = "imprint";
}

function setBareVariant(variant) {
  if (variant === "imprint" && supportsImprint.value) {
    if (!imprintSnapshot.value) captureImprint();
    bareVariant.value = imprintResult.value ? "imprint" : "canonical";
  } else {
    bareVariant.value = "canonical";
  }
  barePaused.value = false;
}

function saveImprint() {
  const imprint = geneticImprintResult.value;
  if (!imprint?.hasGeneticMutation || savedImprintRecord.value) return;
  const source = imprintSource.value;
  const record = createSavedEntityRecord({
    number: nextMutationNumber(savedEntityRecords.value),
    parent: selectedForm.value,
    imprint,
    pose: source.pose,
    settings: source.settings,
    layers: source.layers,
    color: source.color
  });
  const nextRecords = [...savedEntityRecords.value, record];
  if (!writeSavedEntities(nextRecords)) {
    announceMutation("Не удалось сохранить мутацию в этом браузере.");
    return;
  }
  savedEntityRecords.value = nextRecords;
  announceMutation(`${record.title} закреплён и добавлен в список мутаций.`);
}

function setViewMode(mode, updateRoute = true) {
  const nextMode = readLabViewMode(mode);
  if (nextMode === viewMode.value) return;
  if (nextMode === LAB_VIEW_MODE.bare) captureImprint();
  viewMode.value = nextMode;

  if (updateRoute) {
    router.replace({ query: mergeLabViewModeQuery(route.query, nextMode) })
      .catch(() => undefined);
  }
}

async function selectForm(formId, updateRoute = true) {
  const form = formById(formId);
  if (form.id === selectedFormId.value) return;

  selectedFormId.value = form.id;
  replaceReactive(settings, form.defaults);
  replaceReactive(layers, form.savedLayers || spatialLayerDefaults(form));
  if (form.savedColor) Object.assign(color, form.savedColor);
  spaSnapshot.value = form.savedPose || null;
  imprintSnapshot.value = null;
  bareVariant.value = "canonical";
  preset.value = basePresetLabel(form);
  await nextTick();
  canvas.value?.restoreState(spaSnapshot.value);

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
    const form = formById(formId);
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

onBeforeUnmount(() => {
  window.clearTimeout(reactionTimer);
  window.clearTimeout(mutationTimer);
});
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
          :initial-state="spaSnapshot"
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
            <span>RAW / PAUSED</span>
            <strong>Анимация остановлена</strong>
          </div>
          <button class="button primary" type="button" @click="startBareMotion">Запустить анимацию</button>
        </div>
        <div class="canvas-meta" aria-hidden="true">
          <span><span class="live-dot" :class="{ raw: isBareMode }"></span>{{ isBareMode ? barePaused ? "pause / raw" : "raw / p5.js" : spaPaused ? "pause" : "live" }}</span>
          <span v-if="isBareMode">{{ bareCodeLength }} chars · {{ isImprintBare ? "SPA imprint" : "canonical" }} · isolated</span>
          <span v-else>{{ selectedForm.supportsStimulus ? "button / reaction · drag / orbit" : "drag / orbit" }} · {{ pointStatus }}</span>
        </div>
        <p class="sr-only" aria-live="polite">{{ reactionMessage }}</p>
      </div>

      <aside :key="`${selectedForm.id}-${viewMode}`" class="control-panel" :aria-label="isBareMode ? 'Сведения о голом скетче' : 'Параметры визуализации'">
        <div class="form-picker">
          <p class="panel-kicker">Форма / синтез</p>
          <div class="form-choice-groups">
            <div v-for="group in formGroups" :key="group.id" class="form-choice-group">
              <p>{{ group.label }}</p>
              <div class="form-choice-grid" role="group" :aria-label="group.label">
                <button
                  v-for="form in group.forms"
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
            </div>
          </div>
          <p class="form-context">
            <span>{{ selectedForm.association }}</span>
            <RouterLink
              v-if="selectedForm.sketch"
              :to="{ name: 'sketch', params: { id: selectedForm.sketch.id } }"
            >оригинал и код →</RouterLink>
            <RouterLink v-else :to="theoryTarget(selectedForm)">модель и геном →</RouterLink>
          </p>
        </div>

        <div v-if="isBareMode" class="bare-mode-panel">
          <div>
            <p class="panel-kicker">RAW / GENOTYPE FEEDBACK</p>
            <h2>{{ isImprintBare ? "Отпечаток SPA" : "Код без лаборатории" }}</h2>
            <p>{{ bareLead }}</p>
          </div>

          <div v-if="supportsImprint" class="imprint-mode-switch" role="group" aria-label="Версия голого генома">
            <button type="button" :aria-pressed="!isImprintBare" @click="setBareVariant('canonical')">Исходный геном</button>
            <button type="button" :aria-pressed="isImprintBare" :disabled="!imprintResult" @click="setBareVariant('imprint')">Отпечаток SPA</button>
          </div>

          <dl class="bare-mode-facts">
            <div><dt>Исполнение</dt><dd>p5.js в изолированном iframe</dd></div>
            <div><dt>Объём</dt><dd>{{ bareCodeLength }} символов</dd></div>
            <div v-if="isImprintBare"><dt>Ядро</dt><dd>{{ imprintResult.coreCharacters }} / 280 + состояние {{ imprintResult.stateCharacters >= 0 ? "+" : "" }}{{ imprintResult.stateCharacters }}</dd></div>
            <div><dt>Источник</dt><dd>{{ isImprintBare ? "поза, параметры и цвет SPA" : selectedForm.savedRecord ? `закреплённый потомок ${selectedForm.savedRecord.parentDisplayNumber}` : "неизменяемый канон" }}</dd></div>
          </dl>

          <div v-if="isImprintBare" class="genome-comparison">
            <div class="genome-lineage" aria-label="Переход от исходного генома к отпечатку">
              <span><small>Ядро</small>{{ canonicalSketch.code.length }}</span>
              <i aria-hidden="true">→</i>
              <span><small>Отпечаток</small>{{ imprintResult.characters }}</span>
            </div>
            <p class="comparison-label">Проекция · не наследуется как мутация</p>
            <ul class="mutation-list view-state-list" aria-label="Состояние точки зрения">
              <li v-for="item in imprintResult.viewState" :key="item.key">
                <span>{{ item.label }}</span>
                <code>{{ item.value }}</code>
              </li>
            </ul>
            <p class="comparison-label">Генетические изменения</p>
            <ul v-if="imprintResult.mutations.length" class="mutation-list" aria-label="Изменения генома">
              <li v-for="mutation in imprintResult.mutations" :key="mutation.key">
                <span>{{ mutation.label }}</span>
                <code>{{ mutation.before }} → {{ mutation.after }}</code>
              </li>
            </ul>
            <p v-else class="no-mutation-note">Ракурс и фаза перенесены в RAW, но геном не изменён.</p>
            <details class="imprint-code-details">
              <summary>Итоговый исполняемый код</summary>
              <pre><code>{{ imprintResult.code }}</code></pre>
            </details>
          </div>

          <div class="bare-mode-actions">
            <div class="bare-transport">
              <button class="button primary" type="button" @click="restartBareSketch">Перезапустить</button>
              <button class="button" type="button" :aria-pressed="barePaused" @click="toggleBareMotion">{{ barePaused ? "Продолжить" : "Приостановить" }}</button>
            </div>
            <button
              v-if="isImprintBare"
              class="button imprint-save"
              :class="{ primary: geneticImprintResult?.hasGeneticMutation && !savedImprintRecord }"
              type="button"
              :disabled="Boolean(savedImprintRecord) || !geneticImprintResult?.hasGeneticMutation"
              @click="saveImprint"
            >{{ savedImprintRecord ? `Уже сохранён как ${savedImprintRecord.displayNumber}` : geneticImprintResult?.hasGeneticMutation ? `Запечатлеть как ${nextEntityLabel}` : "Нет генетических изменений" }}</button>
            <p v-if="mutationMessage" class="mutation-message" role="status">{{ mutationMessage }}</p>
            <RouterLink
              v-if="selectedForm.sketch"
              class="text-link"
              :to="{ name: 'sketch', params: { id: selectedForm.sketch.id } }"
            >Открыть оригинал и код →</RouterLink>
            <template v-else>
              <RouterLink class="text-link" :to="theoryTarget(selectedForm)">Открыть геном и LaTeX →</RouterLink>
              <RouterLink v-if="selectedForm.id === 'pelagion'" class="text-link" to="/community#pelagion">Карта происхождения →</RouterLink>
            </template>
          </div>

          <p class="bare-mode-note"><strong>Граница:</strong> исходный геном не перезаписывается. Палец и мышь меняют только ракурс; отдельная кнопка реакции не входит в геном. Потомок появляется лишь после явного изменения параметров и команды «Запечатлеть».</p>
        </div>

        <template v-else>
          <div class="panel-title-row">
            <h2>Параметры</h2>
            <span class="status-badge">#{{ formNumber(selectedForm) }} · {{ preset }}</span>
          </div>

          <div v-if="selectedForm.mesh" class="mesh-topology-field">
            <div class="mesh-mode-title">
              <strong>Топология</strong>
              <small>отдельный закон связей</small>
            </div>
            <div class="topology-switch" role="group" aria-label="Топология сеточной формы">
              <button
                v-for="topology in selectedForm.mesh.topologies"
                :key="topology.id"
                type="button"
                :aria-pressed="selectedTopology.id === topology.id"
                @click="setTopology(topology.id)"
              >{{ topology.label }}</button>
            </div>
            <p class="topology-description">{{ selectedTopology.description }}</p>
            <dl class="mesh-facts" aria-live="polite" aria-label="Топологические инварианты">
              <div><dt>V</dt><dd>{{ meshMetrics.vertexCount }}</dd></div>
              <div><dt>E</dt><dd>{{ meshMetrics.edges }}</dd></div>
              <div><dt>F</dt><dd>{{ meshMetrics.faces }}</dd></div>
              <div><dt>χ</dt><dd>{{ meshMetrics.eulerCharacteristic }}</dd></div>
            </dl>
            <p class="topology-summary">{{ meshMetrics.orientable ? "ориентируемая" : "неориентируемая" }} · {{ boundaryLabel }}</p>
          </div>

          <div v-if="selectedForm.renderModes" class="mesh-mode-field">
            <div class="mesh-mode-title">
              <strong>Отображение</strong>
              <small>те же вершины, разные связи</small>
            </div>
            <div class="mesh-mode-switch" role="group" aria-label="Отображение сеточной формы">
              <button
                v-for="mode in selectedForm.renderModes"
                :key="mode.id"
                type="button"
                :aria-pressed="settings.renderMode === mode.id"
                @click="setRenderMode(mode.id)"
              >{{ mode.label }}</button>
            </div>
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

          <RouterLink class="text-link" :to="theoryTarget(selectedForm)">Открыть код и математическую модель →</RouterLink>
        </template>
      </aside>
    </div>
  </section>
</template>
