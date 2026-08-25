<script setup>
import { computed, reactive, ref } from "vue";
import SketchRunner from "../components/SketchRunner.vue";
import {
  SKETCH_36_LIMIT,
  compileSketch36Genome,
  isOriginalSketch36Genome,
  sketch36Colors,
  sketch36Defaults,
  sketch36Original,
  sketch36Signature,
  sketch36Stages
} from "../data/sketch36Genome.js";

const genome = reactive({ ...sketch36Defaults });
const paused = ref(false);
const runner = ref(null);
const copyLabel = ref("Копировать RAW");

const code = computed(() => compileSketch36Genome(genome));
const original = computed(() => isOriginalSketch36Genome(genome));
const activeStage = computed(() => sketch36Stages.find(stage => stage.id === genome.stage));
const activeColor = computed(() => sketch36Colors.find(color => color.id === genome.color));
const population = computed(() => genome.memory * 1000);
const survivors = computed(() => population.value - genome.birth);
const mutationSketch = computed(() => ({
  id: `sketch-36-${sketch36Signature(genome)}`,
  code: code.value
}));
const fieldFormula = computed(() => genome.stage === "memory"
  ? `r = (v.x × ${genome.cell} + 2.5 + v.y + 2) × ${genome.field}`
  : `r = (v.x × ${genome.cell} + 2.5 XOR v.y + 2) × ${genome.field}`);

function fill(value, minimum, maximum) {
  return { "--fill": `${(value - minimum) / (maximum - minimum) * 100}%` };
}

function resetOriginal() {
  Object.assign(genome, sketch36Defaults);
  paused.value = false;
}

function mutate() {
  const pick = values => values[Math.floor(Math.random() * values.length)];
  Object.assign(genome, {
    stage: pick(sketch36Stages).id,
    color: pick(sketch36Colors).id,
    trail: pick([3, 4, 5, 6, 7, 8, 9]),
    cell: pick([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    field: pick([2, 3, 4, 5, 6, 7, 8, 9]),
    step: pick([30, 40, 50, 60, 70, 80, 90, 99]),
    memory: pick([1, 2, 3, 4, 5]),
    birth: pick([10, 20, 30, 40, 50, 60, 70, 80, 90, 99])
  });
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
        <p class="eyebrow">Sketch 36 / executable microscope</p>
        <h1 class="display-title">Поле, память, обмен</h1>
      </div>
      <p class="view-lead">Разбираем организм автора по слоям. Любая настройка здесь меняет сам короткий p5.js-код; исходник всегда можно вернуть одним касанием.</p>
    </header>

    <div class="sketch36-workspace">
      <article class="sketch36-stage">
        <div class="sketch36-seal" aria-live="polite">
          <span>{{ original ? "ORIGINAL" : "MUTATION" }}</span>
          <strong>{{ code.length }} / {{ SKETCH_36_LIMIT }}</strong>
        </div>
        <SketchRunner
          ref="runner"
          class="sketch36-runner"
          :sketch="mutationSketch"
          :paused="paused"
          label="Интерактивная мутация скетча №36"
        />
        <div class="sketch36-stage-caption">
          <span><i class="live-dot" aria-hidden="true"></i>{{ paused ? "Пауза" : "Код исполняется" }}</span>
          <strong>{{ activeStage.label }} · {{ activeColor.label }}</strong>
        </div>
      </article>

      <aside class="sketch36-controls" aria-label="Параметры скетча №36">
        <div class="panel-title-row">
          <div>
            <p class="panel-kicker">Pipeline / 04 stages</p>
            <h2>Механика</h2>
          </div>
          <span class="status-badge">{{ original ? "RAW" : "LIVE" }}</span>
        </div>

        <div class="sketch36-stage-switch" role="group" aria-label="Стадия механики">
          <button
            v-for="stage in sketch36Stages"
            :key="stage.id"
            type="button"
            :aria-pressed="genome.stage === stage.id"
            @click="genome.stage = stage.id"
          >
            <small>{{ stage.index }}</small>
            <strong>{{ stage.label }}</strong>
            <span>{{ stage.hint }}</span>
          </button>
        </div>

        <p class="sketch36-stage-note">{{ activeStage.description }}</p>

        <div class="sketch36-primary-axes">
          <label class="sketch36-axis" for="sketch36-cell">
            <span><strong>Течение ↔ решётка</strong><output>s = {{ genome.cell }}</output></span>
            <input id="sketch36-cell" v-model.number="genome.cell" type="range" min="1" max="9" step="1" :style="fill(genome.cell, 1, 9)">
            <small><b>широкое поле</b><b>мелкие XOR-ячейки</b></small>
          </label>

          <label class="sketch36-axis" for="sketch36-memory">
            <span><strong>Короткая ↔ длинная память</strong><output>{{ population }} точек</output></span>
            <input id="sketch36-memory" v-model.number="genome.memory" type="range" min="1" max="5" step="1" :style="fill(genome.memory, 1, 5)">
            <small><b>1 000</b><b>5 000</b></small>
          </label>
        </div>

        <details class="sketch36-detail-controls">
          <summary>Точная настройка поля</summary>
          <div class="control-list">
            <label class="range-field" for="sketch36-field">
              <span>Множитель поля <output>{{ genome.field }}</output></span>
              <input id="sketch36-field" v-model.number="genome.field" type="range" min="2" max="9" step="1" :style="fill(genome.field, 2, 9)">
            </label>
            <label class="range-field" for="sketch36-step">
              <span>Делитель шага <output>1 / {{ genome.step }}</output></span>
              <input id="sketch36-step" v-model.number="genome.step" type="range" min="30" max="99" step="1" :style="fill(genome.step, 30, 99)">
            </label>
            <label class="range-field" for="sketch36-trail">
              <span>Стирание следа <output>α {{ genome.trail }}</output></span>
              <input id="sketch36-trail" v-model.number="genome.trail" type="range" min="3" max="9" step="1" :style="fill(genome.trail, 3, 9)">
            </label>
            <label class="range-field" for="sketch36-birth">
              <span>Новых точек за такт <output>{{ genome.birth }}</output></span>
              <input id="sketch36-birth" v-model.number="genome.birth" type="range" min="10" max="99" step="1" :style="fill(genome.birth, 10, 99)">
            </label>
          </div>
        </details>

        <div class="sketch36-color-field">
          <span>Цвет тоже формула</span>
          <div class="sketch36-color-grid" role="group" aria-label="Формула цвета">
            <button
              v-for="color in sketch36Colors"
              :key="color.id"
              type="button"
              :aria-pressed="genome.color === color.id"
              @click="genome.color = color.id"
            >
              <strong>{{ color.label }}</strong>
              <code>{{ color.formula }}</code>
            </button>
          </div>
        </div>

        <div class="sketch36-equation-readout">
          <code>{{ fieldFormula }}</code>
          <span v-if="genome.stage === 'exchange'">{{ genome.birth }} рождаются · {{ survivors }} остаются</span>
          <span v-else>{{ population }} точек остаются в памяти</span>
        </div>

        <div class="sketch36-actions">
          <button class="button primary" type="button" @click="mutate">Случайная мутация</button>
          <button class="button" type="button" @click="paused = !paused">{{ paused ? "Продолжить" : "Пауза" }}</button>
          <button class="button" type="button" @click="resetOriginal">Вернуть оригинал</button>
          <button class="button" type="button" @click="runner?.reload()">Перезапустить</button>
        </div>
      </aside>
    </div>

    <article class="code-panel sketch36-code">
      <header>
        <div>
          <span>{{ original ? "ORIGINAL" : "GENERATED" }} / p5.js · {{ code.length }} символов</span>
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
