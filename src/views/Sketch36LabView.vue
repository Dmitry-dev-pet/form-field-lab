<script setup>
import { computed, reactive, ref } from "vue";
import SketchRunner from "../components/SketchRunner.vue";
import {
  SKETCH_36_LIMIT,
  inspectSketch36Genome,
  sketch36Colors,
  sketch36Couplings,
  sketch36Defaults,
  sketch36Depths,
  sketch36FieldLaws,
  sketch36Modes,
  sketch36Original,
  sketch36Renders,
  sketch36Seeds,
  sketch36Signature
} from "../data/sketch36Genome.js";

const panels = Object.freeze([
  { id: "field", index: "01", label: "Поле" },
  { id: "body", index: "02", label: "Тело" },
  { id: "exchange", index: "03", label: "Обмен" },
  { id: "trace", index: "04", label: "След и цвет" }
]);

const genome = reactive({ ...sketch36Defaults });
const activePanel = ref("field");
const paused = ref(false);
const runner = ref(null);
const copyLabel = ref("Копировать RAW");
const budgetMessage = ref("");

const inspection = computed(() => inspectSketch36Genome(genome));
const code = computed(() => inspection.value.code);
const original = computed(() => inspection.value.original);
const population = computed(() => genome.memory * 1000);
const exchangeRhythm = computed(() => Math.ceil(genome.death / genome.birth) + 1);
const changedGenes = computed(() => Object.keys(sketch36Defaults).filter(key => genome[key] !== sketch36Defaults[key]).length);
const activeMode = computed(() => sketch36Modes.find(option => option.id === genome.mode));
const activeLaw = computed(() => sketch36FieldLaws.find(option => option.id === genome.fieldLaw));
const activeSeed = computed(() => sketch36Seeds.find(option => option.id === genome.seed));
const activeDepth = computed(() => sketch36Depths.find(option => option.id === genome.depth));
const activeRender = computed(() => sketch36Renders.find(option => option.id === genome.render));
const activeColor = computed(() => sketch36Colors.find(option => option.id === genome.color));
const mutationSketch = computed(() => ({
  id: `sketch-36-${sketch36Signature(genome)}`,
  code: code.value
}));
const fieldFormula = computed(() => {
  const z = genome.depth === "field" ? " + z" : "";
  if (genome.fieldLaw === "mod") return `r = (x × ${genome.cell} + 2.5${z}) % (|y| + 1) × ${genome.field}`;
  return `r = (x × ${genome.cell} + 2.5${z} ${activeLaw.value.symbol} y + 2) × ${genome.field}`;
});

function fill(value, minimum, maximum) {
  return { "--fill": `${(value - minimum) / (maximum - minimum) * 100}%` };
}

function preview(key, value) {
  return inspectSketch36Genome({ ...genome, [key]: value });
}

function optionCost(key, value) {
  const candidate = preview(key, value);
  if (!candidate.fits) return `${candidate.length} > 280`;
  const delta = candidate.length - inspection.value.length;
  if (delta === 0) return "Δ 0";
  return `Δ ${delta > 0 ? "+" : "−"}${Math.abs(delta)}`;
}

function isCompatible(key, value) {
  return preview(key, value).fits;
}

function selectGene(key, value, label) {
  const candidate = preview(key, value);
  if (!candidate.fits) {
    budgetMessage.value = `${label}: нужно ${candidate.length} символов. Сначала выберите более короткий жизненный цикл или другой ген.`;
    return;
  }
  genome[key] = value;
  budgetMessage.value = "";
}

function setNumeric(key, rawValue, label) {
  const candidate = preview(key, Number(rawValue));
  if (!candidate.fits) {
    budgetMessage.value = `${label}: комбинация потребует ${candidate.length} символов из 280.`;
    return;
  }
  genome[key] = candidate.genome[key];
  budgetMessage.value = "";
}

function originFor(key) {
  return genome[key] === sketch36Defaults[key] ? "A" : "M";
}

function resetOriginal() {
  Object.assign(genome, sketch36Defaults);
  paused.value = false;
  budgetMessage.value = "";
}

function mutate() {
  const pick = values => values[Math.floor(Math.random() * values.length)];
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const candidate = {
      mode: pick(sketch36Modes).id,
      fieldLaw: pick(sketch36FieldLaws).id,
      coupling: pick(sketch36Couplings).id,
      seed: pick(sketch36Seeds).id,
      depth: pick(sketch36Depths).id,
      render: pick(sketch36Renders).id,
      color: pick(sketch36Colors).id,
      trail: pick([3, 4, 5, 6, 7, 8, 9]),
      cell: pick([1, 2, 3, 4, 5, 6, 7, 8, 9]),
      field: pick([2, 3, 4, 5, 6, 7, 8, 9]),
      step: pick([30, 40, 50, 60, 70, 80, 90, 99]),
      memory: pick([1, 2, 3, 4, 5]),
      birth: pick([10, 20, 30, 40, 50, 60, 70, 80, 90, 99]),
      death: pick([20, 30, 40, 50, 60, 70, 80, 90, 99]),
      centerX: pick([1, 1.5, 2, 2.5, 3]),
      centerY: pick([1, 1.3, 1.6, 1.9, 2.2]),
      scaleX: pick([90, 110, 135, 155, 180]),
      scaleY: pick([90, 110, 135, 155, 180])
    };
    const result = inspectSketch36Genome(candidate);
    if (result.fits && !result.original) {
      Object.assign(genome, result.genome);
      budgetMessage.value = "";
      return;
    }
  }
  Object.assign(genome, { ...sketch36Defaults, mode: "memory", depth: "orbit", color: "cell" });
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(code.value);
    copyLabel.value = "Скопировано ✓";
  } catch {
    copyLabel.value = "Не удалось";
  }
  window.setTimeout(() => { copyLabel.value = "Копировать RAW"; }, 1500);
}
</script>

<template>
  <section class="view sketch36-view">
    <header class="view-head sketch36-head">
      <div>
        <RouterLink class="back-link" :to="`/archive?s=${sketch36Original.id}`">← Скетч №36 в архиве</RouterLink>
        <p class="eyebrow">Sketch 36 / genome constructor</p>
        <h1 class="display-title">Поле становится организмом</h1>
      </div>
      <p class="view-lead">Теперь исходник разложен на независимые гены. Метка A означает механику автора, M — нашу мутацию; стоимость рядом показывает реальное изменение RAW-кода.</p>
    </header>

    <div class="sketch36-workspace">
      <article class="sketch36-stage">
        <div class="sketch36-seal" aria-live="polite">
          <span>{{ original ? "ORIGINAL" : `${changedGenes} MUTATIONS` }}</span>
          <strong>{{ code.length }} / {{ SKETCH_36_LIMIT }}</strong>
        </div>
        <SketchRunner
          ref="runner"
          class="sketch36-runner"
          :sketch="mutationSketch"
          :paused="paused"
          label="Конструктор генома скетча №36"
        />
        <div class="sketch36-stage-caption">
          <span><i class="live-dot" aria-hidden="true"></i>{{ paused ? "Пауза" : "Код исполняется" }}</span>
          <strong>{{ activeMode.label }} · {{ activeLaw.label }} · {{ activeSeed.label }}</strong>
        </div>
      </article>

      <aside class="sketch36-controls" aria-label="Гены скетча №36">
        <div class="panel-title-row sketch36-panel-head">
          <div>
            <p class="panel-kicker">17 genes / executable RAW</p>
            <h2>Конструктор</h2>
          </div>
          <span class="status-badge">{{ original ? "RAW" : "LIVE" }}</span>
        </div>

        <div class="sketch36-budget" aria-live="polite">
          <div>
            <span><b>A</b> автор</span>
            <span><b class="mutation">M</b> мутация</span>
            <output>{{ code.length }} / 280</output>
          </div>
          <i><span :style="{ width: `${code.length / SKETCH_36_LIMIT * 100}%` }"></span></i>
        </div>

        <div class="sketch36-tabs" role="tablist" aria-label="Разделы генома">
          <button
            v-for="panel in panels"
            :id="`sketch36-tab-${panel.id}`"
            :key="panel.id"
            type="button"
            role="tab"
            :aria-selected="activePanel === panel.id"
            :aria-controls="`sketch36-panel-${panel.id}`"
            @click="activePanel = panel.id"
          >
            <small>{{ panel.index }}</small>
            <strong>{{ panel.label }}</strong>
          </button>
        </div>

        <div
          v-if="activePanel === 'field'"
          id="sketch36-panel-field"
          class="sketch36-tab-panel"
          role="tabpanel"
          aria-labelledby="sketch36-tab-field"
        >
          <section class="sketch36-gene-section">
            <header><div><span>Закон поля</span><small>оператор меняет топологию потока</small></div><code>{{ activeLaw.symbol }}</code></header>
            <div class="sketch36-gene-grid five" role="group" aria-label="Закон поля">
              <button
                v-for="option in sketch36FieldLaws"
                :key="option.id"
                type="button"
                :aria-pressed="genome.fieldLaw === option.id"
                :aria-disabled="!isCompatible('fieldLaw', option.id)"
                @click="selectGene('fieldLaw', option.id, option.label)"
              >
                <span><b :class="{ mutation: option.origin === 'M' }">{{ option.origin }}</b>{{ option.label }}</span>
                <code>{{ option.symbol }}</code>
                <small>{{ optionCost('fieldLaw', option.id) }}</small>
              </button>
            </div>
            <p>{{ activeLaw.description }}</p>
          </section>

          <section class="sketch36-gene-section">
            <header><div><span>Связь осей</span><small>кто управляет движением x и y</small></div><b :class="{ mutation: originFor('coupling') === 'M' }">{{ originFor('coupling') }}</b></header>
            <div class="sketch36-gene-grid" role="group" aria-label="Связь осей">
              <button
                v-for="option in sketch36Couplings"
                :key="option.id"
                type="button"
                :aria-pressed="genome.coupling === option.id"
                :aria-disabled="!isCompatible('coupling', option.id)"
                @click="selectGene('coupling', option.id, option.label)"
              >
                <span><b :class="{ mutation: option.origin === 'M' }">{{ option.origin }}</b>{{ option.label }}</span>
                <code>{{ option.formula }}</code>
                <small>{{ optionCost('coupling', option.id) }}</small>
              </button>
            </div>
          </section>

          <div class="sketch36-range-grid">
            <label class="range-field" for="sketch36-cell">
              <span>Размер ячейки <b :class="{ mutation: originFor('cell') === 'M' }">{{ originFor('cell') }}</b><output>{{ genome.cell }}</output></span>
              <input id="sketch36-cell" :value="genome.cell" type="range" min="1" max="9" step="1" :style="fill(genome.cell, 1, 9)" @input="setNumeric('cell', $event.target.value, 'Размер ячейки')">
            </label>
            <label class="range-field" for="sketch36-field">
              <span>Сила поля <b :class="{ mutation: originFor('field') === 'M' }">{{ originFor('field') }}</b><output>{{ genome.field }}</output></span>
              <input id="sketch36-field" :value="genome.field" type="range" min="2" max="9" step="1" :style="fill(genome.field, 2, 9)" @input="setNumeric('field', $event.target.value, 'Сила поля')">
            </label>
            <label class="range-field wide" for="sketch36-step">
              <span>Делитель шага <b :class="{ mutation: originFor('step') === 'M' }">{{ originFor('step') }}</b><output>1 / {{ genome.step }}</output></span>
              <input id="sketch36-step" :value="genome.step" type="range" min="30" max="99" step="1" :style="fill(genome.step, 30, 99)" @input="setNumeric('step', $event.target.value, 'Делитель шага')">
            </label>
          </div>
        </div>

        <div
          v-else-if="activePanel === 'body'"
          id="sketch36-panel-body"
          class="sketch36-tab-panel"
          role="tabpanel"
          aria-labelledby="sketch36-tab-body"
        >
          <section class="sketch36-gene-section">
            <header><div><span>Семя</span><small>исходная геометрия популяции</small></div><code>{{ activeSeed.formula }}</code></header>
            <div class="sketch36-gene-grid" role="group" aria-label="Форма семени">
              <button
                v-for="option in sketch36Seeds"
                :key="option.id"
                type="button"
                :aria-pressed="genome.seed === option.id"
                :aria-disabled="!isCompatible('seed', option.id)"
                @click="selectGene('seed', option.id, option.label)"
              >
                <span><b :class="{ mutation: option.origin === 'M' }">{{ option.origin }}</b>{{ option.label }}</span>
                <code>{{ option.formula }}</code>
                <small>{{ optionCost('seed', option.id) }}</small>
              </button>
            </div>
          </section>

          <section class="sketch36-gene-section">
            <header><div><span>Скрытая координата z</span><small>оставить, смешать или вращать</small></div><code>{{ activeDepth.formula }}</code></header>
            <div class="sketch36-gene-grid" role="group" aria-label="Роль глубины">
              <button
                v-for="option in sketch36Depths"
                :key="option.id"
                type="button"
                :aria-pressed="genome.depth === option.id"
                :aria-disabled="!isCompatible('depth', option.id)"
                @click="selectGene('depth', option.id, option.label)"
              >
                <span><b :class="{ mutation: option.origin === 'M' }">{{ option.origin }}</b>{{ option.label }}</span>
                <code>{{ option.formula }}</code>
                <small>{{ optionCost('depth', option.id) }}</small>
              </button>
            </div>
          </section>

          <section class="sketch36-gene-section compact">
            <header><div><span>Топология рисунка</span><small>отдельные точки или вычисляемые рёбра</small></div><code>{{ activeRender.formula }}</code></header>
            <div class="sketch36-gene-grid" role="group" aria-label="Топология рисунка">
              <button
                v-for="option in sketch36Renders"
                :key="option.id"
                type="button"
                :aria-pressed="genome.render === option.id"
                :aria-disabled="!isCompatible('render', option.id)"
                @click="selectGene('render', option.id, option.label)"
              >
                <span><b :class="{ mutation: option.origin === 'M' }">{{ option.origin }}</b>{{ option.label }}</span>
                <code>{{ option.formula }}</code>
                <small>{{ optionCost('render', option.id) }}</small>
              </button>
            </div>
          </section>

          <div class="sketch36-range-grid">
            <label class="range-field" for="sketch36-scale-x">
              <span>Ширина <b :class="{ mutation: originFor('scaleX') === 'M' }">{{ originFor('scaleX') }}</b><output>{{ genome.scaleX }}</output></span>
              <input id="sketch36-scale-x" :value="genome.scaleX" type="range" min="90" max="180" step="5" :style="fill(genome.scaleX, 90, 180)" @input="setNumeric('scaleX', $event.target.value, 'Ширина')">
            </label>
            <label class="range-field" for="sketch36-scale-y">
              <span>Высота <b :class="{ mutation: originFor('scaleY') === 'M' }">{{ originFor('scaleY') }}</b><output>{{ genome.scaleY }}</output></span>
              <input id="sketch36-scale-y" :value="genome.scaleY" type="range" min="90" max="180" step="5" :style="fill(genome.scaleY, 90, 180)" @input="setNumeric('scaleY', $event.target.value, 'Высота')">
            </label>
            <label class="range-field" for="sketch36-center-x">
              <span>Центр X <b :class="{ mutation: originFor('centerX') === 'M' }">{{ originFor('centerX') }}</b><output>{{ genome.centerX }}</output></span>
              <input id="sketch36-center-x" :value="genome.centerX" type="range" min="1" max="3" step="0.5" :style="fill(genome.centerX, 1, 3)" @input="setNumeric('centerX', $event.target.value, 'Центр X')">
            </label>
            <label class="range-field" for="sketch36-center-y">
              <span>Центр Y <b :class="{ mutation: originFor('centerY') === 'M' }">{{ originFor('centerY') }}</b><output>{{ genome.centerY }}</output></span>
              <input id="sketch36-center-y" :value="genome.centerY" type="range" min="1" max="2.2" step="0.1" :style="fill(genome.centerY, 1, 2.2)" @input="setNumeric('centerY', $event.target.value, 'Центр Y')">
            </label>
          </div>
        </div>

        <div
          v-else-if="activePanel === 'exchange'"
          id="sketch36-panel-exchange"
          class="sketch36-tab-panel"
          role="tabpanel"
          aria-labelledby="sketch36-tab-exchange"
        >
          <section class="sketch36-gene-section">
            <header><div><span>Жизненный цикл</span><small>какие части механизма исполняются</small></div><code>{{ activeMode.formula }}</code></header>
            <div class="sketch36-gene-grid three" role="group" aria-label="Жизненный цикл">
              <button
                v-for="option in sketch36Modes"
                :key="option.id"
                type="button"
                :aria-pressed="genome.mode === option.id"
                :aria-disabled="!isCompatible('mode', option.id)"
                @click="selectGene('mode', option.id, option.label)"
              >
                <span><b :class="{ mutation: option.origin === 'M' }">{{ option.origin }}</b>{{ option.label }}</span>
                <code>{{ option.formula }}</code>
                <small>{{ optionCost('mode', option.id) }}</small>
              </button>
            </div>
            <p>{{ activeMode.description }}</p>
          </section>

          <div class="sketch36-range-grid exchange">
            <label class="range-field wide" for="sketch36-memory">
              <span>Объём памяти <b :class="{ mutation: originFor('memory') === 'M' }">{{ originFor('memory') }}</b><output>{{ population }} точек</output></span>
              <input id="sketch36-memory" :value="genome.memory" type="range" min="1" max="5" step="1" :style="fill(genome.memory, 1, 5)" @input="setNumeric('memory', $event.target.value, 'Объём памяти')">
            </label>
            <label class="range-field" for="sketch36-birth" :class="{ inactive: genome.mode !== 'exchange' }">
              <span>Рождение <b :class="{ mutation: originFor('birth') === 'M' }">{{ originFor('birth') }}</b><output>+{{ genome.birth }}</output></span>
              <input id="sketch36-birth" :value="genome.birth" type="range" min="10" max="99" step="1" :style="fill(genome.birth, 10, 99)" :disabled="genome.mode !== 'exchange'" @input="setNumeric('birth', $event.target.value, 'Рождение')">
            </label>
            <label class="range-field" for="sketch36-death" :class="{ inactive: genome.mode !== 'exchange' }">
              <span>Смертность <b :class="{ mutation: originFor('death') === 'M' }">{{ originFor('death') }}</b><output>−{{ genome.death }}</output></span>
              <input id="sketch36-death" :value="genome.death" type="range" min="20" max="99" step="1" :style="fill(genome.death, 20, 99)" :disabled="genome.mode !== 'exchange'" @input="setNumeric('death', $event.target.value, 'Смертность')">
            </label>
          </div>

          <div class="sketch36-metabolism">
            <span>Ритм возникает из отношения рождения и смертности</span>
            <strong v-if="genome.mode === 'exchange'">импульс примерно раз в {{ exchangeRhythm }} кадра</strong>
            <strong v-else>обмен сейчас выключен жизненным циклом</strong>
          </div>
        </div>

        <div
          v-else
          id="sketch36-panel-trace"
          class="sketch36-tab-panel"
          role="tabpanel"
          aria-labelledby="sketch36-tab-trace"
        >
          <div class="sketch36-range-grid single">
            <label class="range-field" for="sketch36-trail">
              <span>Стирание экранного следа <b :class="{ mutation: originFor('trail') === 'M' }">{{ originFor('trail') }}</b><output>α {{ genome.trail }}</output></span>
              <input id="sketch36-trail" :value="genome.trail" type="range" min="3" max="9" step="1" :style="fill(genome.trail, 3, 9)" @input="setNumeric('trail', $event.target.value, 'Стирание следа')">
              <small><span>длинный след</span><span>быстрое стирание</span></small>
            </label>
          </div>

          <section class="sketch36-gene-section">
            <header><div><span>Цвет тоже формула</span><small>цвет получает переменные организма</small></div><code>{{ activeColor.formula }}</code></header>
            <div class="sketch36-gene-grid" role="group" aria-label="Формула цвета">
              <button
                v-for="option in sketch36Colors"
                :key="option.id"
                type="button"
                :aria-pressed="genome.color === option.id"
                :aria-disabled="!isCompatible('color', option.id)"
                @click="selectGene('color', option.id, option.label)"
              >
                <span><b :class="{ mutation: option.origin === 'M' }">{{ option.origin }}</b>{{ option.label }}</span>
                <code>{{ option.formula }}</code>
                <small>{{ optionCost('color', option.id) }}</small>
              </button>
            </div>
          </section>
        </div>

        <p v-if="budgetMessage" class="sketch36-budget-message" role="alert">{{ budgetMessage }}</p>

        <div class="sketch36-equation-readout">
          <code>{{ fieldFormula }}</code>
          <span>{{ activeMode.label }} · {{ activeDepth.label }} · {{ activeRender.label }} · {{ activeColor.label }}</span>
        </div>

        <div class="sketch36-actions">
          <button class="button primary" type="button" @click="mutate">Случайная сущность</button>
          <button class="button" type="button" @click="paused = !paused">{{ paused ? "Продолжить" : "Пауза" }}</button>
          <button class="button" type="button" @click="resetOriginal">Вернуть оригинал</button>
          <button class="button" type="button" @click="runner?.reload()">Перезапустить</button>
        </div>
      </aside>
    </div>

    <article class="code-panel sketch36-code">
      <header>
        <div>
          <span>{{ original ? "ORIGINAL" : "GENERATED" }} / p5.js · {{ code.length }} символов · {{ changedGenes }} мутаций</span>
          <h2>Код, который сейчас рисует</h2>
        </div>
        <button class="button" type="button" @click="copyCode">{{ copyLabel }}</button>
      </header>
      <pre><code>{{ code }}</code></pre>
    </article>

    <details class="sketch36-original-source">
      <summary>Сравнить с неизменённым исходником автора — 273 символа</summary>
      <pre><code>{{ sketch36Original.code }}</code></pre>
    </details>
  </section>
</template>
