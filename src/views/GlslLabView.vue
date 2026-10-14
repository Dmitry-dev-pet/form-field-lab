<script setup>
import { computed, ref } from "vue";
import GlslCanvas from "../components/GlslCanvas.vue";
import { GLSL_PRESETS } from "../data/glslPresets.js";
import { MAX_GLSL_CHARACTERS } from "../lib/glslRuntime.js";
import {
  GLSL_SPEED_DEFAULT, GLSL_SPEED_MIN, GLSL_SPEED_MAX,
  GLSL_SPEED_STEP, GLSL_SPEED_PRESETS
} from "../lib/glslPlayback.js";

const selectedPreset = ref(GLSL_PRESETS[0].id);
const editor = ref(GLSL_PRESETS[0].code);
const activeSource = ref(editor.value);
const revision = ref(0);
const resolution = ref(320);
const speed = ref(GLSL_SPEED_DEFAULT);
const paused = ref(false);
const diagnostic = ref({ ok: null, message: "Инициализация WebGL2…" });
const copyMessage = ref("");

const activePreset = computed(() => GLSL_PRESETS.find(item => item.id === selectedPreset.value));
const length = computed(() => editor.value.length);
const isDirty = computed(() => editor.value !== activeSource.value);

function selectPreset(preset) {
  selectedPreset.value = preset.id;
  editor.value = preset.code;
  run();
}

function edited() {
  selectedPreset.value = "custom";
}

function run() {
  if (!editor.value.trim()) {
    diagnostic.value = { ok: false, message: "Вставь GLSL-код перед запуском." };
    return;
  }
  if (editor.value.length > MAX_GLSL_CHARACTERS) {
    diagnostic.value = { ok: false, message: "Максимальная длина — 12 000 символов." };
    return;
  }
  diagnostic.value = { ok: null, message: "Компиляция…" };
  activeSource.value = editor.value;
  revision.value += 1;
  paused.value = false;
}

function onDiagnostic(result) {
  diagnostic.value = result;
}

async function copySource() {
  try {
    await navigator.clipboard.writeText(editor.value);
    copyMessage.value = "Исходный текст скопирован.";
  } catch {
    copyMessage.value = "Не удалось скопировать. Выдели код в редакторе.";
  }
}
</script>

<template>
  <section class="view glsl-view">
    <header class="view-head">
      <div>
        <p class="eyebrow">Form / Field / GLSL</p>
        <h1 class="display-title">Shader Lab</h1>
      </div>
      <p class="view-lead">
        Фрагментный WebGL2-шейдер из видимого RAW-кода. Синтаксис twigl
        <strong>geekest (300 es)</strong>: <code>FC</code> — координата пикселя,
        <code>r</code> — размер, <code>t</code> — время, <code>m</code> — мышь,
        <code>f</code> — виртуальный номер кадра, <code>o</code> — цвет.
        <RouterLink to="/lab">Вернуться к p5.js →</RouterLink>
      </p>
    </header>

    <div class="glsl-workspace">
      <div class="glsl-stage">
        <div class="glsl-stage-label"><span class="live-dot raw"></span>LIVE · GLSL ES 3.00</div>
        <GlslCanvas
          :source="activeSource"
          :revision="revision"
          :resolution="resolution"
          :speed="speed"
          :paused="paused"
          @diagnostic="onDiagnostic"
        />
        <div class="glsl-stage-footer">
          <span>{{ resolution }} × {{ resolution }} px</span>
          <span>{{ paused ? "PAUSE" : "RUNNING" }}</span>
        </div>
      </div>

      <aside class="glsl-panel" aria-label="GLSL редактор и управление">
        <p class="panel-kicker">Источник / сохранение исходника</p>
        <div class="glsl-presets" role="group" aria-label="Примеры шейдеров">
          <button
            v-for="preset in GLSL_PRESETS"
            :key="preset.id"
            type="button"
            :aria-pressed="selectedPreset === preset.id"
            @click="selectPreset(preset)"
          >{{ preset.name }}</button>
        </div>
        <p class="glsl-description">
          {{ activePreset?.description || "Пользовательский шейдер. Его текст не меняется при компиляции." }}
        </p>
        <label class="glsl-label" for="glsl-code">
          RAW / FRAGMENT BODY <span>{{ length }} / {{ MAX_GLSL_CHARACTERS }}</span>
        </label>
        <textarea
          id="glsl-code"
          v-model="editor"
          rows="14"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          :maxlength="MAX_GLSL_CHARACTERS + 1"
          aria-describedby="glsl-editor-note"
          @input="edited"
        ></textarea>
        <p id="glsl-editor-note" class="glsl-description">
          Холст показывает последнюю запущенную версию. Изменения в редакторе вступают в силу после «Запустить код».
          Строка <code>#つぶやきGLSL</code> — хештег, не часть GLSL.
        </p>

        <div class="glsl-controls">
          <button class="button primary" type="button" @click="run">
            {{ isDirty ? "Запустить изменения" : "Запустить код" }}
          </button>
          <button class="button" type="button" :aria-pressed="paused" @click="paused = !paused">
            {{ paused ? "Продолжить" : "Пауза" }}
          </button>
          <button class="button" type="button" @click="copySource">Копировать RAW</button>
        </div>

        <div class="glsl-speed-control">
          <label class="glsl-speed-label" for="glsl-speed">
            <span>Скорость анимации</span>
            <output for="glsl-speed">{{ speed.toFixed(2) }}×</output>
          </label>
          <input
            id="glsl-speed"
            v-model.number="speed"
            type="range"
            :min="GLSL_SPEED_MIN"
            :max="GLSL_SPEED_MAX"
            :step="GLSL_SPEED_STEP"
            aria-label="Скорость анимации"
          />
          <div class="glsl-speed-endpoints" aria-hidden="true">
            <span>Медленно · 0.05×</span>
            <span>Быстро · 4×</span>
          </div>
          <div class="glsl-speed-presets" role="group" aria-label="Быстрый выбор скорости">
            <button
              v-for="presetSpeed in GLSL_SPEED_PRESETS"
              :key="presetSpeed"
              type="button"
              :aria-pressed="speed === presetSpeed"
              @click="speed = presetSpeed"
            >{{ presetSpeed }}×</button>
          </div>
          <p class="glsl-description">Меняет ход времени <code>t</code> и виртуального кадра <code>f</code>,
            не FPS и не исходный RAW. Скорость сохраняется при смене шейдера.</p>
        </div>

        <label class="glsl-quality" for="glsl-resolution">
          Разрешение
          <select id="glsl-resolution" v-model.number="resolution">
            <option :value="240">240² · телефон</option>
            <option :value="320">320² · стандарт</option>
            <option :value="480">480² · детально</option>
            <option :value="640">640² · GPU</option>
          </select>
        </label>
        <p v-if="copyMessage" role="status" class="glsl-copy">{{ copyMessage }}</p>
        <div
          class="glsl-diagnostic"
          :class="{ error: diagnostic.ok === false }"
          :role="diagnostic.ok === false ? 'alert' : 'status'"
          aria-live="polite"
        >
          <strong>{{ diagnostic.ok === false ? "Ошибка компиляции / исполнения" : diagnostic.ok ? "Компиляция успешна" : "GLSL" }}</strong>
          <pre>{{ diagnostic.message }}</pre>
        </div>
        <p class="glsl-description">
          Оригинальный фрагмент хранится буквально и не приписывается неизвестному автору.
          Исправленная версия — отдельная адаптация. WebGL2 выполняется в браузере; никаких моделей или серверного GPU не требуется.
        </p>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.glsl-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(310px, 0.9fr);
  min-height: 680px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow);
}
.glsl-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 25px;
  min-width: 0;
  padding: 28px;
  background: radial-gradient(circle at 50% 42%, rgba(88,255,231,0.045), transparent 55%), var(--canvas);
}
.glsl-stage-label, .glsl-stage-footer {
  width: min(100%, 600px);
  color: var(--muted);
  font: 600 0.65rem "SFMono-Regular", Consolas, monospace;
  letter-spacing: 0.09em;
}
.glsl-stage-footer { display: flex; justify-content: space-between; }
.glsl-panel {
  display: flex;
  flex-direction: column;
  gap: 13px;
  min-width: 0;
  padding: 25px;
  border-left: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(27,31,27,0.97), rgba(15,18,15,0.99));
}
.glsl-presets { display: flex; flex-wrap: wrap; gap: 8px; }
.glsl-presets button {
  min-height: 44px;
  padding: 8px 12px;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(255,255,255,0.035);
  font-size: 0.7rem;
  cursor: pointer;
}
.glsl-presets button[aria-pressed="true"] {
  color: var(--acid-ink);
  border-color: var(--acid);
  background: var(--acid);
}
.glsl-description {
  margin: 0;
  color: var(--muted);
  font-size: 0.74rem;
  line-height: 1.6;
}
.glsl-description code { color: var(--cyan); }
.glsl-label {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--ink);
  font: 650 0.65rem "SFMono-Regular", Consolas, monospace;
}
.glsl-label span { color: var(--quiet); }
textarea {
  display: block;
  width: 100%;
  min-height: 245px;
  padding: 13px;
  resize: vertical;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  outline: none;
  color: var(--cyan);
  background: #080b09;
  font: 0.74rem/1.6 "SFMono-Regular", Consolas, monospace;
  tab-size: 2;
}
textarea:focus-visible { outline: 2px solid var(--focus); }
.glsl-controls { display: flex; flex-wrap: wrap; gap: 8px; }
.glsl-controls .button { min-height: 44px; padding-inline: 12px; }
.glsl-speed-control {
  display: grid;
  gap: 11px;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(8, 11, 9, 0.45);
}
.glsl-speed-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--ink);
  font-size: 0.8rem;
  font-weight: 650;
}
.glsl-speed-label output {
  color: var(--cyan);
  font: 650 0.9rem "SFMono-Regular", Consolas, monospace;
  font-variant-numeric: tabular-nums;
}
.glsl-speed-control input[type="range"] {
  width: 100%;
  min-height: 28px;
  margin: 0;
  accent-color: var(--acid);
  cursor: pointer;
}
.glsl-speed-endpoints {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--quiet);
  font-size: 0.66rem;
}
.glsl-speed-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.glsl-speed-presets button {
  flex: 1 0 55px;
  min-height: 39px;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--muted);
  background: rgba(255,255,255,0.035);
  font: 650 0.72rem "SFMono-Regular", Consolas, monospace;
}
.glsl-speed-presets button[aria-pressed="true"] {
  border-color: var(--acid);
  color: var(--acid-ink);
  background: var(--acid);
}
.glsl-speed-control .glsl-description code { color: var(--cyan); }
.glsl-quality {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted);
  font-size: 0.77rem;
}
.glsl-quality select {
  max-width: 65%;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 9px;
  color: var(--ink);
  background: #151a15;
}
.glsl-copy { margin: 0; color: var(--cyan); font-size: 0.75rem; }
.glsl-diagnostic {
  padding: 13px;
  overflow-wrap: anywhere;
  border: 1px solid rgba(88,255,231,0.25);
  border-radius: 11px;
  background: rgba(88,255,231,0.04);
}
.glsl-diagnostic.error { border-color: rgba(255,179,179,0.5); background: rgba(255,179,179,0.05); }
.glsl-diagnostic strong { display: block; margin-bottom: 5px; color: var(--cyan); font-size: 0.75rem; }
.glsl-diagnostic.error strong { color: var(--danger); }
.glsl-diagnostic pre {
  margin: 0;
  overflow-x: auto;
  color: var(--muted);
  white-space: pre-wrap;
  font: 0.73rem/1.5 "SFMono-Regular", Consolas, monospace;
}
@media (max-width: 880px) {
  .glsl-workspace { grid-template-columns: 1fr; }
  .glsl-stage { padding: 32px 18px; }
  .glsl-panel { border-left: 0; border-top: 1px solid var(--line); }
}
@media (max-width: 620px) {
  .glsl-workspace { border-radius: 16px; }
  .glsl-stage { padding: 20px 12px; gap: 14px; }
  .glsl-panel { padding: 16px; }
}
</style>
