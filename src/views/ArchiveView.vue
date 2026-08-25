<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import SketchRunner from "../components/SketchRunner.vue";
import { sketches } from "../data/sketches.js";

const route = useRoute();
const router = useRouter();
const studiedId = "2091191600814907612";
const initialIndex = sketches.findIndex(sketch => sketch.id === route.query.s)
  ?? sketches.findIndex(sketch => sketch.id === studiedId);
const selectedIndex = ref(initialIndex >= 0 ? initialIndex : sketches.findIndex(sketch => sketch.id === studiedId));
const selected = computed(() => sketches[selectedIndex.value]);
const runner = ref(null);
const copyLabel = ref("Копировать код");

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});

function choose(index) {
  selectedIndex.value = index;
  router.replace({ name: "archive", query: { s: sketches[index].id } });
}

function move(direction) {
  choose((selectedIndex.value + direction + sketches.length) % sketches.length);
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(selected.value.code);
    copyLabel.value = "Скопировано ✓";
  } catch {
    copyLabel.value = "Не удалось";
  }
  window.setTimeout(() => { copyLabel.value = "Копировать код"; }, 1500);
}
</script>

<template>
  <section class="view">
    <header class="view-head">
      <div>
        <p class="eyebrow">Archive / @yuruyurau</p>
        <h1 class="display-title">Все {{ sketches.length }} скетчей</h1>
      </div>
      <p class="view-lead">Подтверждённая подборка однотвитовых p5.js-работ. Исторические номера №01–34 сохранены; свежая найденная работа добавлена как №35. Выбранная формула запускается в изолированном контейнере.</p>
    </header>

    <div class="archive-workspace">
      <article class="archive-player">
        <SketchRunner ref="runner" :sketch="selected" :label="`Скетч ${selectedIndex + 1} автора @yuruyurau`" />
        <div class="runner-toolbar">
          <button class="round-button" type="button" aria-label="Предыдущий скетч" @click="move(-1)">←</button>
          <div>
            <strong>Скетч {{ String(selectedIndex + 1).padStart(2, "0") }} / {{ sketches.length }}</strong>
            <span>{{ dateFormatter.format(new Date(selected.createdAt)) }} · {{ selected.code.length }} символов</span>
          </div>
          <button class="round-button" type="button" aria-label="Следующий скетч" @click="move(1)">→</button>
        </div>
        <div class="inline-actions">
          <button class="button" type="button" @click="runner?.reload()">Перезапустить</button>
          <RouterLink class="button primary" :to="`/sketch/${selected.id}`">Открыть отдельно</RouterLink>
          <a class="button" :href="selected.source" target="_blank" rel="noopener noreferrer">Оригинал ↗</a>
        </div>
      </article>

      <aside class="archive-index" aria-label="Каталог скетчей">
        <div class="panel-title-row">
          <h2>Каталог</h2>
          <span class="count-label">{{ sketches.length }} / p5.js</span>
        </div>
        <ol class="sketch-grid">
          <li v-for="(sketch, index) in sketches" :key="sketch.id">
            <button class="sketch-card" type="button" :aria-pressed="index === selectedIndex" @click="choose(index)">
              <strong>№ {{ String(index + 1).padStart(2, "0") }}</strong>
              <span>{{ dateFormatter.format(new Date(sketch.createdAt)) }}</span>
            </button>
          </li>
        </ol>
        <p class="attribution">Автор всех работ — <a href="https://x.com/yuruyurau" target="_blank" rel="noopener noreferrer">ア / @yuruyurau</a>. Исходники сохранены без изменений.</p>
      </aside>
    </div>

    <article class="code-panel archive-code">
      <header>
        <div><span>{{ String(selectedIndex + 1).padStart(2, "0") }} / SOURCE</span><h2>Код выбранного скетча</h2></div>
        <button class="button" type="button" @click="copyCode">{{ copyLabel }}</button>
      </header>
      <pre><code>{{ selected.code }}</code></pre>
    </article>
  </section>
</template>
