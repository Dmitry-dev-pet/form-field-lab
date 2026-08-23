<script setup>
import { computed } from "vue";
import { COLOR_PRESETS } from "../lib/colorFormula.js";

defineProps({
  error: { type: String, default: "" },
  includeBackground: { type: Boolean, default: false },
  contextNote: { type: String, default: "" }
});

const mode = defineModel("mode", { type: String, required: true });
const preset = defineModel("preset", { type: String, required: true });
const expression = defineModel("expression", { type: String, required: true });
const colorA = defineModel("colorA", { type: String, required: true });
const colorB = defineModel("colorB", { type: String, required: true });
const background = defineModel("background", { type: String, default: "#090909" });

const gradientStyle = computed(() => ({
  background: `linear-gradient(90deg, ${colorA.value}, ${colorB.value})`
}));

function choosePreset(event) {
  const next = event.target.value;
  preset.value = next;
  if (next !== "custom") {
    expression.value = COLOR_PRESETS.find(item => item.id === next)?.expression || expression.value;
  }
}

function editExpression(event) {
  expression.value = event.target.value;
  preset.value = "custom";
}
</script>

<template>
  <div class="color-formula-controls">
    <div class="color-mode-grid" role="group" aria-label="Режим цвета">
      <button class="layer-toggle mode-button" type="button" :aria-pressed="mode === 'solid'" @click="mode = 'solid'">Однотонный</button>
      <button class="layer-toggle mode-button" type="button" :aria-pressed="mode === 'formula'" @click="mode = 'formula'">Формула</button>
    </div>

    <div class="color-grid formula-colors" :class="{ single: mode === 'solid' && !includeBackground }">
      <label>{{ mode === "formula" ? "Цвет A" : "Точки" }} <input v-model="colorA" type="color"></label>
      <label v-if="mode === 'formula'">Цвет B <input v-model="colorB" type="color"></label>
      <label v-if="includeBackground" :class="{ wide: mode === 'formula' }">Фон <input v-model="background" type="color"></label>
    </div>

    <template v-if="mode === 'formula'">
      <div class="formula-gradient" :style="gradientStyle" aria-hidden="true"></div>

      <label class="select-field formula-preset">
        <span>Распределение цвета <b>u ∈ [0, 1]</b></span>
        <select :value="preset" @change="choosePreset">
          <option v-for="item in COLOR_PRESETS" :key="item.id" :value="item.id">{{ item.label }}</option>
          <option value="custom">Своя формула</option>
        </select>
      </label>

      <label class="formula-field">
        <span>u(i,t)</span>
        <textarea
          :value="expression"
          rows="2"
          inputmode="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          maxlength="220"
          :aria-invalid="error ? 'true' : undefined"
          aria-describedby="color-formula-help"
          @input="editExpression"
        ></textarea>
      </label>

      <p v-if="error" class="error-message" role="alert">{{ error }}</p>
      <p id="color-formula-help" class="formula-help">
        Переменные: <code>i y k e d c t branch forms x Y u r angle mix</code>.<br>
        Функции: <code>sin cos tan abs sqrt min max atan2 mag fract smoothstep clamp lerp</code>; константы: <code>PI TAU</code>.
        <template v-if="contextNote"><br>{{ contextNote }}</template>
      </p>
    </template>
  </div>
</template>
