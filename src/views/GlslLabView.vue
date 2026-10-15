<script setup>
import { computed, ref } from "vue";
import GlslCanvas from "../components/GlslCanvas.vue";
import { GLSL_PRESETS } from "../data/glslPresets.js";
import { MAX_GLSL_CHARACTERS } from "../lib/glslRuntime.js";
import { SPHERICAL_FIELD_CONTROLS, SPHERICAL_FIELD_DEFAULT_PARAMETERS } from "../lib/glslParameters.js";
import {
  GLSL_SPEED_DEFAULT, GLSL_SPEED_MIN, GLSL_SPEED_MAX,
  GLSL_SPEED_STEP, GLSL_SPEED_PRESETS
} from "../lib/glslPlayback.js";

const selectedPreset = ref(GLSL_PRESETS[0].id);
const editor = ref(GLSL_PRESETS[0].code);
const activeSource = ref(editor.value);
const renderedPresetId = ref(selectedPreset.value);
// Keep parameter values for each parameterized preset when switching away and back.
const parametersByPreset = ref({
  "spherical-stable": { ...SPHERICAL_FIELD_DEFAULT_PARAMETERS }
});
const revision = ref(0);
const resolution = ref(320);
const speed = ref(GLSL_SPEED_DEFAULT);
const paused = ref(false);
const diagnostic = ref({ ok: null, message: "Инициализация WebGL2…" });
const copyMessage = ref("");

const activePreset = computed(() => GLSL_PRESETS.find(item => item.id === selectedPreset.value));
const length = computed(() => editor.value.length);
const isDirty = computed(() => editor.value !== activeSource.value);
const activeParameterSpecs = computed(() =>
  renderedPresetId.value === "spherical-stable" ? SPHERICAL_FIELD_CONTROLS : []
);
const activeParameters = computed(() =>
  parametersByPreset.value[renderedPresetId.value] || SPHERICAL_FIELD_DEFAULT_PARAMETERS
);

function setParameter(key, rawValue) {
  const id = renderedPresetId.value;
  const spec = activeParameterSpecs.value.find(control => control.key === key);
  if (!spec || !parametersByPreset.value[id]) return;
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return;
  parametersByPreset.value[id] = {
    ...parametersByPreset.value[id],
    [key]: Math.min(spec.max, Math.max(spec.min, numeric))
  };
}

function resetParameters() {
  const id = renderedPresetId.value;
  if (id === "spherical-stable") {
    parametersByPreset.value[id] = { ...SPHERICAL_FIELD_DEFAULT_PARAMETERS };
  }
}

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
  renderedPresetId.value = selectedPreset.value;
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
    <header class="view-head glsl-view-head">
      <div>
        <p class="eyebrow">Form / Field / GLSL</p>
        <h1 class="display-title">Shader Lab</h1>
      </div>
      <p class="view-lead">
        Исследуй формулы и меняй изображение прямо во время анимации.
        Редактор кода находится ниже: шейдеры исполняются в браузере через WebGL2.
        <RouterLink to="/lab">Вернуться к p5.js →</RouterLink>
      </p>
    </header>

    <div class="glsl-preset-toolbar">
      <p class="panel-kicker">Выбери шейдер</p>
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
        {{ activePreset?.description || "Пользовательский шейдер. В редакторе ниже код не меняется до запуска." }}
      </p>
    </div>

    <div class="glsl-workspace">
      <div class="glsl-stage">
        <div class="glsl-stage-label">
          <span><span class="live-dot raw"></span> LIVE · GLSL ES 3.00</span>
          <span>{{ paused ? "PAUSE" : "RUNNING" }}</span>
        </div>
        <GlslCanvas
          :source="activeSource"
          :revision="revision"
          :resolution="resolution"
          :speed="speed"
          :parameters="activeParameters"
          :paused="paused"
          @diagnostic="onDiagnostic"
        />
        <div class="glsl-stage-footer">
          <span>{{ resolution }} × {{ resolution }} px</span>
          <span>WebGL2 · {{ speed.toFixed(2) }}×</span>
        </div>
        <div class="glsl-stage-actions">
          <button class="button primary" type="button" :aria-pressed="paused" @click="paused = !paused">
            {{ paused ? "Продолжить" : "Пауза" }}
          </button>
          <label class="glsl-quality" for="glsl-resolution">
            Разрешение
            <select id="glsl-resolution" v-model.number="resolution">
              <option :value="240">240² · телефон</option>
              <option :value="320">320² · стандарт</option>
              <option :value="480">480² · детально</option>
              <option :value="640">640² · GPU</option>
            </select>
          </label>
        </div>
      </div>

      <aside class="glsl-panel" aria-label="Параметры изображения">
        <p class="panel-kicker">Настройка изображения</p>
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
            <span>0.05×</span>
            <span>4×</span>
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
          <p class="glsl-description">
            Управляет временем <code>t</code> и кадром <code>f</code>, не меняя RAW или FPS.
          </p>
        </div>

        <div v-if="activeParameterSpecs.length" class="glsl-param-section" aria-label="Параметры сферического поля">
          <div class="glsl-param-head">
            <strong>Форма / цвет</strong>
            <button class="button" type="button" @click="resetParameters">Сбросить параметры</button>
          </div>
          <div class="glsl-param-grid">
            <div v-for="control in activeParameterSpecs" :key="control.key" class="glsl-param-row">
              <label class="glsl-param-label" :for="'glsl-param-' + control.key">
                <span>{{ control.label }}</span>
                <output :for="'glsl-param-' + control.key">
                  {{ activeParameters[control.key].toFixed(control.digits) }}{{ control.suffix }}
                </output>
              </label>
              <input
                :id="'glsl-param-' + control.key"
                type="range"
                :min="control.min"
                :max="control.max"
                :step="control.step"
                :value="activeParameters[control.key]"
                :aria-label="control.label"
                @input="setParameter(control.key, $event.target.value)"
              />
            </div>
          </div>
          <p class="glsl-description">
            Ползунки меняют форму без перекомпиляции. На паузе остаётся тот же момент времени.
          </p>
        </div>
        <div v-else class="glsl-param-empty">
          <strong>Форма / цвет</strong>
          <p class="glsl-description">
            Ползунки формы доступны в «Сферическое поле · адаптация».
            Для этого примера можно менять скорость и разрешение.
          </p>
        </div>
      </aside>
    </div>

    <div class="glsl-editor-wrap">
      <details class="glsl-editor-details">
        <summary>
          <span class="glsl-editor-summary-title">
            <span class="glsl-editor-chevron" aria-hidden="true">⌄</span>
            Исходный код GLSL
          </span>
          <span class="glsl-editor-summary-action">
            <span class="glsl-when-closed">Показать код</span>
            <span class="glsl-when-open">Скрыть код</span>
          </span>
        </summary>
        <div class="glsl-editor-body">
          <p class="glsl-description">
            Синтаксис twigl geekest (GLSL ES 3.00):
            <code>FC</code> — пиксель, <code>r</code> — размер,
            <code>t</code> — время, <code>m</code> — курсор,
            <code>f</code> — кадр, <code>o</code> — цвет.
          </p>
          <label class="glsl-label" for="glsl-code">
            RAW / FRAGMENT BODY
            <span>{{ length }} / {{ MAX_GLSL_CHARACTERS }}</span>
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
            Холст показывает последнюю запущенную версию. Изменения применяются после «Запустить код».
            Хештег <code>#つぶやきGLSL</code> не входит в код.
          </p>
          <div class="glsl-controls">
            <button class="button primary" type="button" @click="run">
              {{ isDirty ? "Запустить изменения" : "Запустить код" }}
            </button>
            <button class="button" type="button" @click="copySource">Копировать RAW</button>
          </div>
          <p v-if="copyMessage" role="status" class="glsl-copy">{{ copyMessage }}</p>
          <p class="glsl-description">
            RAW хранится буквально, отдельно от адаптаций. Неизвестному автору он не приписывается.
            Для исполнения WebGL2 сервер и внешняя модель не нужны.
          </p>
        </div>
      </details>
      <div
        class="glsl-diagnostic"
        :class="{ error: diagnostic.ok === false }"
        :role="diagnostic.ok === false ? 'alert' : 'status'"
        aria-live="polite"
      >
        <strong>{{ diagnostic.ok === false ? "Ошибка компиляции / исполнения" : diagnostic.ok ? "Компиляция успешна" : "GLSL" }}</strong>
        <pre>{{ diagnostic.message }}</pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.glsl-view-head { margin-bottom: 19px; }
.glsl-view-head .display-title { font-size: clamp(2.65rem, 5vw, 4.5rem); }

.glsl-preset-toolbar {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  margin-bottom: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface);
}
.glsl-presets { display: flex; flex-wrap: wrap; gap: 7px; }
.glsl-presets button {
  min-height: 40px;
  padding: 8px 12px;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 9px;
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
  line-height: 1.55;
}
.glsl-description code { color: var(--cyan); }

.glsl-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  align-items: start;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow);
}
.glsl-stage {
  position: sticky;
  top: 82px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 13px;
  min-width: 0;
  padding: 19px 22px 24px;
  border-right: 1px solid var(--line);
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  background: radial-gradient(circle at 50% 42%, rgba(88,255,231,0.045), transparent 55%), var(--canvas);
}
.glsl-stage :deep(.glsl-surface) {
  width: min(100%, 600px, calc(100vh - 220px));
}
.glsl-stage-label, .glsl-stage-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: min(100%, 600px);
  color: var(--muted);
  font: 600 0.65rem "SFMono-Regular", Consolas, monospace;
  letter-spacing: 0.075em;
}
.glsl-stage-footer { color: var(--quiet); }
.glsl-stage-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  width: min(100%, 600px);
  padding-top: 3px;
}
.glsl-stage-actions .button { min-height: 44px; padding-inline: 19px; }
.glsl-quality {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  color: var(--muted);
  font-size: 0.75rem;
}
.glsl-quality select {
  max-width: 180px;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 9px;
  color: var(--ink);
  background: #151a15;
}

.glsl-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 17px 15px 19px;
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
  background: linear-gradient(180deg, rgba(27,31,27,0.97), rgba(15,18,15,0.99));
}
.glsl-speed-control, .glsl-param-section, .glsl-param-empty {
  display: grid;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(8, 11, 9, 0.45);
}
.glsl-speed-label, .glsl-param-head, .glsl-param-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
}
.glsl-speed-label { color: var(--ink); font-size: 0.8rem; font-weight: 650; }
.glsl-speed-label output, .glsl-param-label output {
  color: var(--cyan);
  font: 650 0.8rem "SFMono-Regular", Consolas, monospace;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.glsl-speed-control input[type="range"], .glsl-param-row input[type="range"] {
  width: 100%;
  min-height: 32px;
  margin: 0;
  accent-color: var(--acid);
  cursor: pointer;
}
.glsl-speed-endpoints {
  display: flex;
  justify-content: space-between;
  color: var(--quiet);
  font-size: 0.65rem;
}
.glsl-speed-presets { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.glsl-speed-presets button {
  min-height: 34px;
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--muted);
  background: rgba(255,255,255,0.035);
  font: 650 0.72rem "SFMono-Regular", Consolas, monospace;
}
.glsl-speed-presets button[aria-pressed="true"] {
  border-color: var(--acid);
  color: var(--acid-ink);
  background: var(--acid);
}
.glsl-param-head strong, .glsl-param-empty strong { color: var(--ink); font-size: 0.8rem; }
.glsl-param-head .button { min-height: 36px; padding: 6px 9px; font-size: 0.7rem; }
.glsl-param-grid { display: grid; gap: 11px; }
.glsl-param-row { display: grid; gap: 3px; }
.glsl-param-label { color: var(--ink); font-size: 0.77rem; }

.glsl-editor-wrap {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}
.glsl-editor-details {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface);
}
.glsl-editor-details > summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 15px 20px;
  list-style: none;
  cursor: pointer;
}
.glsl-editor-details > summary::-webkit-details-marker { display: none; }
.glsl-editor-summary-title { display: flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 700; }
.glsl-editor-chevron { display: inline-block; color: var(--acid); font-size: 1.15rem; transition: transform 150ms ease; }
.glsl-editor-details[open] .glsl-editor-chevron { transform: rotate(180deg); }
.glsl-editor-summary-action { color: var(--cyan); font-size: 0.74rem; }
.glsl-editor-details:not([open]) .glsl-when-open,
.glsl-editor-details[open] .glsl-when-closed { display: none; }
.glsl-editor-body {
  display: grid;
  gap: 12px;
  padding: 18px 20px 21px;
  border-top: 1px solid var(--line);
}
.glsl-label {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--ink);
  font: 650 0.68rem "SFMono-Regular", Consolas, monospace;
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
  font: 0.75rem/1.6 "SFMono-Regular", Consolas, monospace;
  tab-size: 2;
}
textarea:focus-visible { outline: 2px solid var(--focus); }
.glsl-controls { display: flex; flex-wrap: wrap; gap: 8px; }
.glsl-controls .button { min-height: 44px; padding-inline: 12px; }
.glsl-copy { margin: 0; color: var(--cyan); font-size: 0.75rem; }
.glsl-diagnostic {
  padding: 13px 17px;
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
@media (max-width: 760px) {
  .glsl-workspace { grid-template-columns: minmax(0, 1fr); }
  .glsl-stage {
    position: static;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  .glsl-panel { border-radius: 0 0 var(--radius-lg) var(--radius-lg); }
}
@media (max-width: 620px) {
  .glsl-view-head { gap: 12px; }
  .glsl-preset-toolbar { padding: 14px; }
  .glsl-stage { padding: 16px 12px 18px; }
  .glsl-panel { padding: 13px; }
  .glsl-editor-details > summary { padding-inline: 14px; }
  .glsl-editor-body { padding: 14px; }
  .glsl-stage-actions { gap: 8px; }
  .glsl-quality select { max-width: 160px; }
}
</style>
