<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import SketchRunner from "../components/SketchRunner.vue";
import { sketches } from "../data/sketches.js";

const route = useRoute();
const copyLabel = ref("Копировать код");
const index = computed(() => sketches.findIndex(sketch => sketch.id === route.params.id));
const sketch = computed(() => sketches[index.value]);
const previous = computed(() => index.value > 0 ? sketches[index.value - 1] : sketches.at(-1));
const next = computed(() => index.value >= 0 && index.value < sketches.length - 1 ? sketches[index.value + 1] : sketches[0]);

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});

async function copyCode() {
  try {
    await navigator.clipboard.writeText(sketch.value.code);
    copyLabel.value = "Скопировано ✓";
  } catch {
    copyLabel.value = "Не удалось";
  }
  window.setTimeout(() => { copyLabel.value = "Копировать код"; }, 1500);
}
</script>

<template>
  <section v-if="sketch" class="view sketch-view">
    <header class="detail-head">
      <div>
        <RouterLink class="back-link" to="/archive">← Вернуться в архив</RouterLink>
        <p class="eyebrow">Sketch / {{ String(index + 1).padStart(2, "0") }}</p>
        <h1 class="display-title">Формула № {{ String(index + 1).padStart(2, "0") }}</h1>
      </div>
      <div class="detail-meta">
        <span>{{ dateFormatter.format(new Date(sketch.createdAt)) }}</span>
        <span>{{ sketch.code.length }} символов</span>
        <a :href="sketch.source" target="_blank" rel="noopener noreferrer">Оригинальный пост ↗</a>
      </div>
    </header>

    <div class="detail-stage">
      <SketchRunner :sketch="sketch" :label="`Скетч ${index + 1} автора @yuruyurau`" />
    </div>

    <div v-if="sketch.id === '1588062547315679232'" class="detail-special-action">
      <RouterLink class="button primary" to="/lab/36">Разобрать механику и мутировать №36</RouterLink>
    </div>

    <article class="code-panel">
      <header>
        <div><span>ORIGINAL / p5.js</span><h2>Полный исходный код</h2></div>
        <button class="button" type="button" @click="copyCode">{{ copyLabel }}</button>
      </header>
      <pre><code>{{ sketch.code }}</code></pre>
    </article>

    <nav class="detail-pagination" aria-label="Соседние скетчи">
      <RouterLink :to="`/sketch/${previous.id}`">← № {{ String((index || sketches.length) ).padStart(2, "0") }}</RouterLink>
      <RouterLink :to="`/evolution?a=${index + 1}&b=${(index + 1) % sketches.length + 1}&mix=0.5`">Скрестить эту формулу</RouterLink>
      <RouterLink :to="`/sketch/${next.id}`">№ {{ String((index + 1) % sketches.length + 1).padStart(2, "0") }} →</RouterLink>
    </nav>
  </section>

  <section v-else class="view empty-state">
    <p class="eyebrow">404 / Sketch</p>
    <h1 class="display-title">Формула не найдена</h1>
    <RouterLink class="button primary" to="/archive">Открыть архив</RouterLink>
  </section>
</template>
