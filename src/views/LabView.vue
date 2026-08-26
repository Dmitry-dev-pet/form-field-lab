<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ColorFormulaControls from "../components/ColorFormulaControls.vue";
import SketchRunner from "../components/SketchRunner.vue";
import { useColorFormula } from "../composables/useColorFormula.js";
import { spatialForms, spatialFormById, spatialLayerDefaults } from "../data/spatialForms.js";
import {
  compileTopologyGenome,
  topologyGenomeDefaults
} from "../data/topologyGenomes.js";
import { DEFAULT_COLOR_STATE } from "../lib/colorFormula.js";
import {
  RAW_CODE_BUDGET_MAX,
  RAW_CODE_BUDGET_MIN,
  RAW_CODE_BUDGET_PRESETS,
  readRawCodeBudget,
  selectRawBudgetVariant
} from "../lib/codeBudget.js";
import {
  compileChronophoreImprint,
  createSavedEntityRecord,
  nextMutationNumber,
  normalizeSpatialSnapshot,
  readSavedEntities,
  writeSavedEntities
} from "../lib/genomeImprint.js";
import {
  measureGridTopology,
  resolveGridTopology
} from "../lib/meshTopology.js";
import {
  clearViewState,
  readViewState,
  writeViewState
} from "../lib/viewStateStorage.js";

const route = useRoute();
const router = useRouter();
const { color, error: colorFormulaError, resetColor } = useColorFormula(route, router);

const savedEntityRecords = ref(readSavedEntities());
const chronophoreForm = spatialFormById("chronophore");

function hydrateSavedForm(record) {
  const legacyNumbers = ["P3", "P4", "P5", "P6", "P7", "P8"];
  const legacyNumber = legacyNumbers.includes(record.displayNumber) ? `${record.displayNumber}′` : record.displayNumber;
  const legacyTitle = legacyNumbers.includes(record.displayNumber)
    ? record.title.replace(new RegExp(`${record.displayNumber}\\b`), `${record.displayNumber}′`)
    : record.title;
  return {
    ...chronophoreForm,
    id: record.id,
    displayNumber: legacyNumber,
    shortLabel: legacyTitle.replace("Хронофор ", "Мутация "),
    title: legacyTitle,
    association: `закреплённая мутация · потомок ${record.parentDisplayNumber}`,
    description: `Закреплённая RAW-мутация Хронофора сохраняет параметры и цвет родителя ${record.parentDisplayNumber}. Её можно снова исполнять напрямую и использовать как родителя следующего поколения.`,
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
if (Object.hasOwn(route.query, "view")) {
  const query = { ...route.query };
  delete query.view;
  router.replace({ query }).catch(() => undefined);
}
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
      forms: spatialForms.filter(form => !form.sketch
        && !["mesh-study", "provided-source-study"].includes(form.origin))
    },
    {
      id: "source-studies",
      label: "Исходные эксперименты",
      forms: spatialForms.filter(form => form.origin === "provided-source-study")
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
const settings = reactive({ ...initialForm.defaults });
const layers = reactive(initialForm.savedLayers || spatialLayerDefaults(initialForm));
const bareRunner = ref(null);
const barePaused = ref(false);
const invertOrbitY = ref(true);
const preset = ref(basePresetLabel(initialForm));
const mutationMessage = ref("");
const genomeCopyLabel = ref("Копировать RAW");
const bareVariant = ref(defaultBareVariant(initialForm));
const rawBudget = ref(RAW_CODE_BUDGET_MIN);
const rawBudgetPresets = computed(() => selectedForm.value.budgetVariants?.some(
  variant => variant.sketch.code.length > RAW_CODE_BUDGET_PRESETS.at(-1)
)
  ? [...RAW_CODE_BUDGET_PRESETS, RAW_CODE_BUDGET_MAX]
  : RAW_CODE_BUDGET_PRESETS);
const spaSnapshot = ref(restoredViewFor(initialForm));
const rawViewState = ref(spaSnapshot.value);
let mutationTimer;
let budgetRequest = 0;

if (initialForm.savedColor) Object.assign(color, initialForm.savedColor);

const supportsImprint = computed(() => selectedForm.value.imprintKind === "chronophore");
const isTopologyGenome = computed(() => Boolean(selectedForm.value.meshGenome));
const compiledTopologyGenome = computed(() => isTopologyGenome.value
  ? compileTopologyGenome(settings)
  : null);
const compiledFormulaGenome = computed(() => selectedForm.value.compileGenome
  ? selectedForm.value.compileGenome(settings)
  : null);
const compiledGenome = computed(() => compiledTopologyGenome.value || compiledFormulaGenome.value);
const isCompiledGenome = computed(() => Boolean(compiledGenome.value));
const canonicalSketch = computed(() => compiledGenome.value?.sketch
  || selectedForm.value.sketch
  || selectedForm.value.genomeSketch);
const imprintSource = computed(() => ({
  settings: { ...settings },
  layers: { ...layers },
  color: { ...color },
  pose: rawViewState.value || spaSnapshot.value || selectedForm.value.savedPose || { yaw: 0, pitch: 0, time: 0 }
}));

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
const budgetVariantSet = computed(() => selectedForm.value.budgetVariantsByMode?.[bareVariant.value]
  || selectedForm.value.budgetVariants
  || null);
const hasBudgetVariants = computed(() => Boolean(budgetVariantSet.value));
const budgetSelection = computed(() => budgetVariantSet.value
  ? selectRawBudgetVariant(budgetVariantSet.value, rawBudget.value)
  : null);
const isImprintBare = computed(() => supportsImprint.value
  && bareVariant.value === "imprint"
  && Boolean(imprintResult.value)
  && imprintResult.value.characters <= rawBudget.value);
const isImprintRequested = computed(() => supportsImprint.value
  && bareVariant.value === "imprint");
const selectedRawVariant = computed(() => budgetSelection.value?.variant
  || selectedForm.value.rawVariants?.find(variant => variant.id === bareVariant.value)
  || null);
const bareSketch = computed(() => isImprintBare.value
  ? Object.freeze({ id: imprintResult.value.id, code: imprintResult.value.code })
  : selectedRawVariant.value?.sketch || canonicalSketch.value);
const bareCodeLength = computed(() => bareSketch.value.code.length);
const rawBudgetStatus = computed(() => budgetSelection.value || Object.freeze({
  budget: rawBudget.value,
  characters: bareCodeLength.value,
  withinLimit: bareCodeLength.value <= rawBudget.value,
  activeFeatures: Object.freeze([]),
  omittedFeatures: Object.freeze([])
}));
const rawBudgetRangeStyle = computed(() => ({
  "--fill": `${(rawBudget.value - RAW_CODE_BUDGET_MIN) / (RAW_CODE_BUDGET_MAX - RAW_CODE_BUDGET_MIN) * 100}%`
}));
const savedImprintRecord = computed(() => geneticImprintResult.value
  ? savedEntityRecords.value.find(record => record.code === geneticImprintResult.value.code)
  : null);
const nextEntityLabel = computed(() => `P${nextMutationNumber(savedEntityRecords.value)}`);
const bareRunnerLabel = computed(() => isCompiledGenome.value
  ? `${selectedForm.value.title}: итоговый ${compiledGenome.value.characters}-символьный RAW-геном`
  : hasBudgetVariants.value
    ? `${selectedForm.value.title}: ${selectedRawVariant.value.title}, ${bareCodeLength.value} из ${rawBudget.value} символов`
  : selectedForm.value.sketch
    ? `${selectedForm.value.title}: исходный p5.js-скетч без преобразований`
  : isImprintBare.value
    ? `${selectedForm.value.title}: исполняемая RAW-мутация текущих параметров`
  : selectedRawVariant.value
    ? `${selectedForm.value.title}: ${selectedRawVariant.value.title}, ${bareCodeLength.value} символов`
    : `${selectedForm.value.title}: автономный канонический p5.js-геном`);
const bareLead = computed(() => isCompiledGenome.value
  ? selectedForm.value.origin === "provided-source-study"
    ? `На холсте исполняется буквальный исходный код: ${bareCodeLength.value} из 280 символов. Ползунки меняют только его исходные константы; «Сбросить» возвращает точную строку.`
    : selectedForm.value.autoOrbit
    ? `На холсте исполняется итоговый ${bareCodeLength.value}-символьный RAW: форма, волна, цвет и автоматический пространственный оборот находятся в самой строке.`
    : `На холсте исполняется итоговый код выбранной формы: ${bareCodeLength.value} из 280 символов. Лаборатория меняет только его короткие константы.`
  : hasBudgetVariants.value
    ? selectedForm.value.id === "pelagion"
      ? `Выбранный корневой RAW микроэволюции сохраняется целиком; лимит ${rawBudget.value} только дописывает к нему помещающийся слой: сейчас ${selectedRawVariant.value.title.toLowerCase()}.`
      : selectedForm.value.id === "blastophore"
        ? `Автономный цикл почкования сохраняется целиком; лимит ${rawBudget.value} добавляет только помещающуюся стадию анатомии: сейчас ${selectedRawVariant.value.title.toLowerCase()}.`
      : `Лимит ${rawBudget.value} автоматически выбирает самый насыщенный автономный геном, который действительно в него помещается: сейчас ${selectedRawVariant.value.title.toLowerCase()}.`
  : selectedForm.value.sketch
    ? "На холсте без преобразований выполняется исходный p5.js-код автора."
  : isImprintBare.value
    ? "На холсте выполняется RAW-мутация, собранная из текущих генетических параметров и формульного цвета."
  : isImprintRequested.value
    ? `RAW-мутация занимает ${imprintResult.value?.characters || 0} символов и не помещается в лимит ${rawBudget.value}; пока исполняется канонический геном.`
  : selectedRawVariant.value
    ? selectedRawVariant.value.description
    : `Канонический ${bareCodeLength.value}-символьный геном остаётся неизменным и доступен для сравнения.`);
const rawBudgetContract = computed(() => selectedForm.value.id === "pelagion"
  ? "микроэволюция выбирает корневую формулу не длиннее 280; уровни 512/768/900 не заменяют её, а добавляют орган, двухнаправленную сетку и автономный импульс. Камера и фаза переходят без перезапуска; касание остаётся только камерой."
  : selectedForm.value.id === "blastophore"
    ? "279 символов уже содержат полный цикл почкования и точную перетяжку до нулевого радиуса. 512 добавляет два ядра, 768 — тканевую сетку, 900 — бегущий морфогенетический фронт. Камера и фаза переходят между стадиями вне генома."
    : "признаки снимаются только в указанном списке и только до запуска. Базовая морфология, анимация и сохранённая камера входят даже в 280; вращение не изменяет сущность и не расходует символы.");
const rawColorPalettes = computed(() => selectedForm.value.rawColorPalettes || []);
const rawColorLaws = computed(() => selectedForm.value.rawColorLaws || []);
const selectedRawColorPalette = computed(() => rawColorPalettes.value.find(
  option => option.id === settings.colorPalette
) || rawColorPalettes.value[0] || null);
const selectedRawColorLaw = computed(() => rawColorLaws.value.find(
  option => option.id === settings.colorLaw
) || rawColorLaws.value[0] || null);
const rawColorPreviewStyle = computed(() => selectedRawColorPalette.value
  ? { background: `linear-gradient(90deg, ${selectedRawColorPalette.value.from}, ${selectedRawColorPalette.value.to})` }
  : {});
const primaryControls = computed(() => compiledTopologyGenome.value?.preset.controls
  || selectedForm.value.primaryControls);
const chronophoreRawControlKeys = new Set([
  "speed", "windingP", "windingQ", "radius", "depth", "flow", "pointCount", "alpha",
  "knotRadius", "tubeRadius", "strands", "knotDrift", "fiberTwist", "fiberSpeed",
  "pulse", "pulseFrequency"
]);
const chronophoreRawLayerKeys = new Set(["knot", "fibers", "flow"]);
const rawSignalControlKeys = new Set(["signalSpeed", "signalCount"]);
function visibleFormulaControls(controls) {
  if (!selectedRawColorLaw.value) return controls;
  const active = new Set(selectedRawColorLaw.value.controls);
  return controls.filter(control => !rawSignalControlKeys.has(control.key) || active.has(control.key));
}
const rawPrimaryControls = computed(() => isTopologyGenome.value
  ? primaryControls.value
  : compiledFormulaGenome.value
    ? visibleFormulaControls(selectedForm.value.primaryControls)
    : isImprintRequested.value
      ? selectedForm.value.primaryControls.filter(control => chronophoreRawControlKeys.has(control.key))
      : []);
const rawAdvancedControls = computed(() => compiledFormulaGenome.value
  ? visibleFormulaControls(selectedForm.value.advancedControls)
  : isImprintRequested.value
    ? selectedForm.value.advancedControls.filter(control => chronophoreRawControlKeys.has(control.key))
    : []);
const rawLayers = computed(() => isImprintRequested.value
  ? selectedForm.value.layers.filter(layer => chronophoreRawLayerKeys.has(layer.key))
  : []);
const hasRawControls = computed(() => isCompiledGenome.value || isImprintRequested.value);
const selectedTopology = computed(() => selectedForm.value.mesh
  ? resolveGridTopology(selectedForm.value.mesh, settings)
  : null);
const isTopologyMorph = computed(() => Boolean(selectedTopology.value?.morph));
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
function formNumber(form) {
  if (form.displayNumber) return form.displayNumber;
  return String(form.sketchNumber).padStart(2, "0");
}

function defaultBareVariant(form, motionMode = form.defaults?.motionMode) {
  return form.rawVariants?.some(variant => variant.id === motionMode)
    ? motionMode
    : "canonical";
}

function restoredViewFor(form) {
  return readViewState(form.id) || form.savedPose || null;
}

function rememberViewState(snapshot, form = selectedForm.value) {
  if (!snapshot) return null;
  const normalized = normalizeSpatialSnapshot(snapshot);
  spaSnapshot.value = normalized;
  rawViewState.value = normalized;
  writeViewState(form.id, normalized);
  return normalized;
}

async function captureActiveView() {
  const snapshot = bareSketch.value.viewModel
    ? await bareRunner.value?.snapshot()
    : rawViewState.value || spaSnapshot.value;
  return rememberViewState(snapshot);
}

function basePresetLabel(form) {
  if (form.savedRecord) return "Мутация";
  if (form.meshGenome) return "RAW ≤ 280";
  if (form.origin === "provided-source-study") return "Исходник";
  if (form.motionModes) {
    return form.motionModes.find(mode => mode.id === form.defaults.motionMode)?.label
      || "Хореография";
  }
  if (form.memoryModes) {
    return form.memoryModes.find(mode => mode.id === form.defaults.memoryMode)?.label
      || "С памятью";
  }
  return form.sketch ? "Original" : "Синтез";
}

function theoryTarget(form) {
  if (form.savedRecord) return "/theory#chronophore";
  return form.sketch ? "/theory" : `/theory#${form.id}`;
}

function formatValue(control, value) {
  if (control.format === "speed") return `${Number(value).toFixed(2)}×`;
  if (control.format === "integerSpeed") return `${Math.round(Number(value))}×`;
  if (control.format === "codeFraction") {
    const digits = String(Math.round(Number(value))).padStart(2, "0");
    return digits.endsWith("0") ? `.${digits[0]}` : `.${digits}`;
  }
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

function chooseRawColor(kind, id) {
  const options = kind === "colorPalette" ? rawColorPalettes.value : rawColorLaws.value;
  if (!options.some(option => option.id === id)) return;
  settings[kind] = id;
  preset.value = "Цвет RAW";
}

function toggleLayer(key) {
  layers[key] = !layers[key];
  preset.value = "Анатомия";
}

async function setRawBudget(value) {
  const nextBudget = readRawCodeBudget(value);
  const request = ++budgetRequest;
  const currentVariantId = budgetSelection.value?.variant?.id;
  const nextVariantId = budgetVariantSet.value
    ? selectRawBudgetVariant(budgetVariantSet.value, nextBudget).variant?.id
    : null;

  if (nextBudget === rawBudget.value) return;
  if (currentVariantId && nextVariantId !== currentVariantId && bareSketch.value.viewModel) {
    const snapshot = await bareRunner.value?.snapshot();
    if (request !== budgetRequest) return;
    if (snapshot) rememberViewState(snapshot);
  }
  if (request === budgetRequest) rawBudget.value = nextBudget;
}

function normalizeRawBudget(event) {
  setRawBudget(event?.target?.value ?? rawBudget.value);
}

function setTopology(topologyId) {
  if (!selectedForm.value.mesh?.topologies.some(item => item.id === topologyId)) return;
  if (isTopologyGenome.value) {
    const sharedGenome = {
      genomeProjection: settings.genomeProjection,
      genomeSpeed: settings.genomeSpeed,
      alpha: settings.alpha
    };
    Object.assign(settings, topologyGenomeDefaults(topologyId), sharedGenome, {
      topology: topologyId
    });
    settings.speed = 1;
    settings.lineWidth = 0.72;
    settings.renderMode = "wireframe";
    settings.backgroundColor = "#090909";
  } else {
    settings.topology = topologyId;
  }
  preset.value = "RAW выбран";
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
  barePaused.value = false;
  invertOrbitY.value = true;
  preset.value = basePresetLabel(form);
  clearViewState(form.id);
  spaSnapshot.value = form.savedPose || null;
  rawViewState.value = spaSnapshot.value;
  bareVariant.value = defaultBareVariant(form);
}

function frontView() {
  bareRunner.value?.resetView();
}

async function restartBareSketch() {
  const current = bareSketch.value.viewModel
    ? await bareRunner.value?.snapshot()
    : rawViewState.value;
  if (current) rememberViewState({ ...current, time: 0 });
  bareRunner.value?.reload();
}

function startBareMotion() {
  barePaused.value = false;
}

function toggleBareMotion() {
  if (barePaused.value) startBareMotion();
  else barePaused.value = true;
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
  if (compiledTopologyGenome.value) {
    for (const control of compiledTopologyGenome.value.preset.controls) {
      settings[control.key] = randomStep(control.min, control.max, control.step);
    }
    preset.value = "RAW случайный";
    return;
  }
  if (rawColorPalettes.value.length) {
    settings.colorPalette = rawColorPalettes.value[Math.floor(Math.random() * rawColorPalettes.value.length)].id;
  }
  if (rawColorLaws.value.length) {
    settings.colorLaw = rawColorLaws.value[Math.floor(Math.random() * rawColorLaws.value.length)].id;
  }
  for (const control of [...rawPrimaryControls.value, ...rawAdvancedControls.value]) {
    settings[control.key] = Number(
      randomStep(control.min, control.max, control.step).toFixed(6)
    );
  }
  preset.value = "RAW случайный";
}

async function copyCompiledGenome() {
  if (!compiledGenome.value) return;
  try {
    await navigator.clipboard.writeText(compiledGenome.value.code);
    genomeCopyLabel.value = "Скопировано ✓";
  } catch {
    genomeCopyLabel.value = "Не удалось";
  }
  window.setTimeout(() => { genomeCopyLabel.value = "Копировать RAW"; }, 1500);
}

async function setBareVariant(variant) {
  if (bareSketch.value.viewModel) {
    rememberViewState(await bareRunner.value?.snapshot());
  }
  if (variant === "imprint" && supportsImprint.value) {
    bareVariant.value = imprintResult.value ? "imprint" : "canonical";
  } else if (selectedForm.value.rawVariants?.some(item => item.id === variant)) {
    bareVariant.value = variant;
  } else {
    bareVariant.value = defaultBareVariant(selectedForm.value);
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

async function selectForm(formId, updateRoute = true) {
  const form = formById(formId);
  if (form.id === selectedFormId.value) return;

  await captureActiveView();

  selectedFormId.value = form.id;
  replaceReactive(settings, form.defaults);
  replaceReactive(layers, form.savedLayers || spatialLayerDefaults(form));
  if (form.savedColor) Object.assign(color, form.savedColor);
  spaSnapshot.value = restoredViewFor(form);
  rawViewState.value = spaSnapshot.value;
  bareVariant.value = defaultBareVariant(form);
  barePaused.value = false;
  preset.value = basePresetLabel(form);

  if (updateRoute) {
    const query = { ...route.query };
    delete query.view;
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

onBeforeUnmount(() => {
  const snapshot = rawViewState.value || spaSnapshot.value;
  if (snapshot) writeViewState(selectedForm.value.id, snapshot);
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
        {{ bareLead }}
      </p>
    </header>

    <div class="lab-workspace">
      <div class="canvas-stage">
        <div class="raw-runtime-seal" aria-label="На холсте всегда исполняется показанный RAW-код">
          <span>RAW</span>
          <strong>Код = изображение</strong>
        </div>
        <SketchRunner
          :key="bareSketch.id"
          ref="bareRunner"
          class="lab-raw-runner"
          :sketch="bareSketch"
          :label="bareRunnerLabel"
          :paused="barePaused"
          :view-state="rawViewState"
          :invert-y="invertOrbitY"
          @update:view-state="rememberViewState"
        />
        <div
          v-if="barePaused"
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
          <span><span class="live-dot raw"></span>{{ barePaused ? "pause / raw" : "raw / p5.js" }}</span>
          <span>{{ bareCodeLength }} chars · {{ isCompiledGenome ? "compiled" : isImprintBare ? "raw mutation" : selectedRawVariant?.id || "canonical" }} · {{ bareSketch.viewModel ? "drag / saved view" : "isolated" }}</span>
        </div>
      </div>

      <aside :key="`${selectedForm.id}-raw`" class="control-panel" aria-label="RAW-геном и его параметры">
        <div class="form-picker">
          <p class="panel-kicker">Форма / источник / синтез</p>
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

        <div class="bare-mode-panel">
          <div>
            <p class="panel-kicker">RAW / GENOTYPE FEEDBACK</p>
            <h2>{{ isCompiledGenome ? "Итоговый RAW" : isImprintBare ? "RAW-мутация" : selectedRawVariant?.title || "Код без посредника" }}</h2>
            <p>{{ bareLead }}</p>
          </div>

          <div v-if="supportsImprint" class="imprint-mode-switch" role="group" aria-label="Версия голого генома">
            <button type="button" :aria-pressed="bareVariant !== 'imprint'" @click="setBareVariant('canonical')">Исходный геном</button>
            <button type="button" :aria-pressed="bareVariant === 'imprint'" :disabled="!imprintResult" @click="setBareVariant('imprint')">RAW-мутация</button>
          </div>

          <div v-else-if="selectedForm.rawVariants" class="microevolution-field">
            <div class="microevolution-label"><span>Микроэволюция 280</span><small>корневой RAW</small></div>
            <div class="imprint-mode-switch micro-variant-switch" role="group" aria-label="Микроэволюция 280">
              <button
                v-for="variant in selectedForm.rawVariants"
                :key="variant.id"
                type="button"
                :aria-pressed="bareVariant === variant.id"
                @click="setBareVariant(variant.id)"
              ><span>{{ variant.label }}</span><small>{{ variant.sketch.code.length }}</small></button>
            </div>
          </div>

          <section class="raw-budget-panel" aria-label="Регулируемый лимит RAW-кода">
            <header>
              <div>
                <span>Бюджет RAW</span>
                <small>исполняемый результат всегда внутри лимита</small>
              </div>
              <output :class="{ invalid: !rawBudgetStatus.withinLimit }">{{ bareCodeLength }} / {{ rawBudget }}</output>
            </header>
            <div class="raw-budget-presets" role="group" aria-label="Предустановки лимита кода">
              <button
                v-for="budget in rawBudgetPresets"
                :key="budget"
                type="button"
                :aria-pressed="rawBudget === budget"
                @click="setRawBudget(budget)"
              >{{ budget }}</button>
            </div>
            <label class="range-field raw-budget-range">
              <span>Лимит <output>{{ rawBudget }} символов</output></span>
              <input
                :value="rawBudget"
                type="range"
                :min="RAW_CODE_BUDGET_MIN"
                :max="RAW_CODE_BUDGET_MAX"
                step="1"
                :style="rawBudgetRangeStyle"
                aria-label="Лимит RAW-кода"
                @input="setRawBudget($event.target.value)"
              >
            </label>
            <label class="budget-number-field">
              <span>Точное значение</span>
              <input
                :value="rawBudget"
                type="number"
                :min="RAW_CODE_BUDGET_MIN"
                :max="RAW_CODE_BUDGET_MAX"
                inputmode="numeric"
                @change="normalizeRawBudget"
                @blur="normalizeRawBudget"
              >
            </label>
            <div
              class="genome-budget-track"
              role="progressbar"
              aria-label="Использование выбранного лимита RAW"
              :aria-valuenow="bareCodeLength"
              aria-valuemin="0"
              :aria-valuemax="rawBudget"
            ><span :class="{ invalid: !rawBudgetStatus.withinLimit }" :style="{ width: `${Math.min(100, bareCodeLength / rawBudget * 100)}%` }"></span></div>
            <template v-if="hasBudgetVariants">
              <p class="budget-variant-note"><strong>{{ selectedRawVariant.title }}</strong> выбран автоматически по фактической длине кода.</p>
              <ul class="budget-feature-list" aria-label="Признаки, вошедшие в RAW">
                <li v-for="feature in rawBudgetStatus.activeFeatures" :key="feature"><span aria-hidden="true">+</span>{{ feature }}</li>
                <li v-for="feature in rawBudgetStatus.omittedFeatures" :key="`off-${feature}`" class="omitted"><span aria-hidden="true">−</span>{{ feature }}</li>
              </ul>
            </template>
            <p v-else class="budget-variant-note">Этот автономный геном уже укладывается в минимальный стандарт 280.</p>
          </section>

          <dl class="bare-mode-facts">
            <div><dt>Исполнение</dt><dd>p5.js в изолированном iframe</dd></div>
            <div><dt>Объём</dt><dd>{{ bareCodeLength }} из {{ rawBudget }} символов</dd></div>
            <div v-if="bareSketch.viewModel"><dt>Камера</dt><dd>{{ selectedForm.autoOrbit ? "автоповорот · внутри RAW; ручной ракурс · 0 символов" : "последний ракурс · вне генома · 0 символов" }}</dd></div>
            <div v-if="isImprintBare"><dt>Ядро</dt><dd>{{ imprintResult.coreCharacters }} / 280 + состояние {{ imprintResult.stateCharacters >= 0 ? "+" : "" }}{{ imprintResult.stateCharacters }}</dd></div>
            <div><dt>Источник</dt><dd>{{ isCompiledGenome ? "текущие константы RAW" : hasBudgetVariants ? "автоматический выбор по бюджету" : isImprintBare ? "генетические параметры и цвет" : selectedRawVariant?.id === 'living-stroke' ? "автономная RAW-хореография" : selectedForm.savedRecord ? `закреплённый потомок ${selectedForm.savedRecord.parentDisplayNumber}` : "неизменяемый канон" }}</dd></div>
          </dl>

          <div v-if="selectedRawVariant" class="genome-comparison">
            <div class="genome-lineage" aria-label="Выбранный автономный RAW-вариант">
              <span><small>Канон</small>{{ canonicalSketch.code.length }}</span>
              <i aria-hidden="true">↔</i>
              <span><small>{{ selectedRawVariant.label }}</small>{{ bareCodeLength }}</span>
            </div>
            <p class="comparison-label">{{ selectedForm.id === 'pelagion' ? "Выбранный корневой RAW сохранён буквально; следующий код только добавляет слой" : hasBudgetVariants ? "Выбранный бюджетом автономный результат" : "Оба варианта автономны и исполняются напрямую" }}</p>
            <details class="imprint-code-details">
              <summary>Итоговый исполняемый код</summary>
              <pre><code>{{ bareSketch.code }}</code></pre>
            </details>
          </div>

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

          <div v-if="!selectedRawVariant && !isImprintBare" class="genome-comparison">
            <p class="comparison-label">Этот код непосредственно создаёт изображение на холсте.</p>
            <details class="imprint-code-details">
              <summary>Итоговый исполняемый код</summary>
              <pre><code>{{ bareSketch.code }}</code></pre>
            </details>
          </div>

          <div class="bare-mode-actions">
            <div class="bare-transport">
              <button class="button primary" type="button" @click="restartBareSketch">Перезапустить</button>
              <button class="button" type="button" :aria-pressed="barePaused" @click="toggleBareMotion">{{ barePaused ? "Продолжить" : "Приостановить" }}</button>
              <button v-if="bareSketch.viewModel" class="button" type="button" title="Также: двойное касание холста или клавиша 0" @click="frontView">Вид спереди</button>
              <button
                v-if="bareSketch.viewModel"
                class="button"
                type="button"
                :aria-pressed="invertOrbitY"
                @click="invertOrbitY = !invertOrbitY"
              >Инверсия Y · {{ invertOrbitY ? "вкл." : "выкл." }}</button>
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

          <p v-if="isCompiledGenome" class="bare-mode-note"><strong>Инвариант:</strong> это не предварительный просмотр, а точный результат выбора. Любое изменение генетического ползунка пересобирает исполняемый код.</p>
          <p v-else-if="hasBudgetVariants" class="bare-mode-note"><strong>Контракт бюджета:</strong> {{ rawBudgetContract }}</p>
          <p v-else-if="selectedRawVariant" class="bare-mode-note"><strong>Прямое исполнение:</strong> выбран самостоятельный компактный геном. Последние камера и фаза сохраняются как состояние просмотра вне лимита; касание не становится мутацией.</p>
          <p v-else class="bare-mode-note"><strong>Граница:</strong> исходный геном не перезаписывается. Палец и мышь меняют только ракурс; отдельная кнопка реакции не входит в геном. Потомок появляется лишь после явного изменения параметров и команды «Запечатлеть».</p>
        </div>

        <template v-if="hasRawControls">
          <div class="panel-title-row">
            <h2>{{ isCompiledGenome ? "Константы RAW" : "Генетические параметры RAW" }}</h2>
            <span class="status-badge">#{{ formNumber(selectedForm) }} · {{ preset }}</span>
          </div>

          <div v-if="selectedForm.mesh" class="mesh-topology-field">
            <div class="mesh-mode-title">
              <strong>Топология</strong>
              <small>{{ isTopologyMorph ? "один закон · два образа" : "отдельный закон связей" }}</small>
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
            <p v-if="isTopologyMorph" class="topology-summary">домен T² · смена образа через сингулярность</p>
            <p v-else class="topology-summary">{{ meshMetrics.orientable ? "ориентируемая" : "неориентируемая" }} · {{ boundaryLabel }}</p>
          </div>

          <section
            v-if="compiledGenome"
            class="live-genome-panel"
            :class="{ invalid: !compiledGenome.withinLimit }"
            aria-label="Итоговый исполняемый RAW-геном"
          >
            <header>
              <div><span>Исполняемый RAW</span><small>это и есть результат</small></div>
              <strong aria-live="polite">{{ compiledGenome.characters }} / {{ compiledGenome.limit }}</strong>
            </header>
            <div
              class="genome-budget-track"
              role="progressbar"
              aria-label="Использование лимита генома"
              :aria-valuenow="compiledGenome.characters"
              aria-valuemin="0"
              :aria-valuemax="compiledGenome.limit"
            ><span :style="{ width: `${compiledGenome.characters / compiledGenome.limit * 100}%` }"></span></div>
            <pre><code>{{ compiledGenome.code }}</code></pre>
            <p v-if="compiledGenome.withinLimit">Геном исполняется самостоятельно и проходит лимит 280 символов.</p>
            <p v-else role="alert">Лимит превышен: этот вариант не может считаться сущностью.</p>
            <div class="live-genome-actions">
              <button class="button" type="button" @click="copyCompiledGenome">{{ genomeCopyLabel }}</button>
              <span class="raw-live-caption">Уже исполняется на холсте</span>
            </div>
          </section>

          <section
            v-if="rawColorPalettes.length && rawColorLaws.length"
            class="raw-color-panel"
            aria-label="Генетическая настройка цвета RAW"
          >
            <header class="raw-color-header">
              <div><span>Цвет RAW</span><small>палитра и закон находятся в коде</small></div>
              <code>{{ selectedRawColorLaw.formula }}</code>
            </header>
            <div class="raw-color-preview" :style="rawColorPreviewStyle" aria-hidden="true"></div>

            <div class="raw-color-group">
              <div class="raw-color-label"><strong>Палитра</strong><small>перестановка каналов · 0 дополнительных символов</small></div>
              <div class="raw-palette-grid" role="group" aria-label="Палитра формульного цвета">
                <button
                  v-for="option in rawColorPalettes"
                  :key="option.id"
                  class="raw-palette-option"
                  type="button"
                  :aria-pressed="settings.colorPalette === option.id"
                  @click="chooseRawColor('colorPalette', option.id)"
                >
                  <span :style="{ background: `linear-gradient(90deg, ${option.from}, ${option.to})` }" aria-hidden="true"></span>
                  <small>{{ option.label }}</small>
                </button>
              </div>
            </div>

            <div class="raw-color-group">
              <div class="raw-color-label"><strong>Математический закон</strong><small>каждый вариант сохраняет RAW ≤ 280</small></div>
              <div class="raw-law-grid" role="group" aria-label="Математический закон цвета">
                <button
                  v-for="option in rawColorLaws"
                  :key="option.id"
                  class="raw-law-option"
                  type="button"
                  :aria-pressed="settings.colorLaw === option.id"
                  @click="chooseRawColor('colorLaw', option.id)"
                >
                  <strong>{{ option.label }}</strong>
                  <code>{{ option.formula }}</code>
                </button>
              </div>
              <p>{{ selectedRawColorLaw.description }}</p>
            </div>
          </section>

          <div class="control-list">
            <label v-for="control in rawPrimaryControls" :key="control.key" class="range-field">
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

          <div class="button-grid raw-genetic-actions">
            <button class="button" type="button" @click="reset">Сбросить</button>
            <button class="button" type="button" @click="randomize">Случайный</button>
          </div>

          <details v-if="isImprintRequested" class="control-details color-details" open>
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

          <details v-if="rawAdvancedControls.length || rawLayers.length" class="control-details">
            <summary>{{ rawLayers.length ? "Точная настройка и анатомия" : "Точная настройка" }}</summary>
            <div class="advanced-controls">
              <label v-for="control in rawAdvancedControls" :key="control.key" class="range-field">
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

              <div v-if="rawLayers.length" class="anatomy-box">
                <div class="anatomy-title"><strong>Анатомия</strong><small>нажмите, чтобы убрать</small></div>
                <div class="layer-grid">
                  <button
                    v-for="layer in rawLayers"
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
