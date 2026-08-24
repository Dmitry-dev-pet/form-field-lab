<script setup>
import { computed, ref } from "vue";
import SketchRunner from "../components/SketchRunner.vue";
import {
  COMMUNITY_AUTHOR_MAP,
  COMMUNITY_AUTHORS,
  COMMUNITY_GENES,
  COMMUNITY_SCAN,
  PELAGION_LINEAGE
} from "../data/communityDna.js";
import {
  PELAGION_LIVING_GENOME,
  PELAGION_LIVING_GENOME_CHARACTERS,
  PELAGION_LIVING_GENOME_SKETCH,
  PELAGION_GENOME_LIMIT,
  PELAGION_MICRO_VARIANTS,
} from "../data/pelagionGenome.js";

const copyLabel = ref("Копировать геном");
const remainingCharacters = PELAGION_GENOME_LIMIT - PELAGION_LIVING_GENOME_CHARACTERS;
const coverage = computed(() => new Set(
  COMMUNITY_GENES.flatMap(gene => gene.authors)
).size);

function author(handle) {
  return COMMUNITY_AUTHOR_MAP[handle];
}

function signalStyle(value) {
  return { "--signal": `${Math.max(1.2, value / COMMUNITY_SCAN.sketches * 100)}%` };
}

async function copyGenome() {
  try {
    await navigator.clipboard.writeText(PELAGION_LIVING_GENOME);
    copyLabel.value = "Скопировано ✓";
  } catch {
    copyLabel.value = "Не удалось скопировать";
  }
  window.setTimeout(() => { copyLabel.value = "Копировать геном"; }, 1500);
}
</script>

<template>
  <section class="view community-view">
    <header class="view-head">
      <div>
        <p class="eyebrow">Community DNA / 845 sketches</p>
        <h1 class="display-title">Карта идей</h1>
      </div>
      <p class="view-lead">Кодовый снимок сообщества превращён в карту механизмов. Мы берём не чужие строки, а независимо реализуем совместимые принципы — тело, среду, глубину, память и отклик.</p>
    </header>

    <section class="dna-overview" aria-labelledby="census-title">
      <div class="dna-census">
        <p class="panel-kicker">Снимок · 24 августа 2026</p>
        <div class="census-lead">
          <strong>{{ COMMUNITY_SCAN.sketches }}</strong>
          <span>проверяемых работ<br>{{ COMMUNITY_SCAN.authors }} авторов</span>
        </div>
        <h2 id="census-title">Что повторяется в коде</h2>
        <div class="signal-list">
          <div
            v-for="signal in COMMUNITY_SCAN.signals"
            :key="signal.key"
            class="signal-row"
            :style="signalStyle(signal.value)"
          >
            <span>{{ signal.label }}</span>
            <strong>{{ signal.value }}</strong>
            <i aria-hidden="true"></i>
          </div>
        </div>
        <p class="method-note">Это синтаксический обзор текущих исходников, а не оценка качества. Один скетч может содержать несколько механизмов.</p>
      </div>

      <div class="seed-lab">
        <div class="seed-stage">
          <SketchRunner :sketch="PELAGION_LIVING_GENOME_SKETCH" label="Цельный Пелагион 274 — неизменное основание линии" />
          <div class="seed-counter"><strong>{{ PELAGION_LIVING_GENOME_CHARACTERS }}</strong> / {{ PELAGION_GENOME_LIMIT }} · запас {{ remainingCharacters }}</div>
        </div>
        <div class="seed-copy">
          <div>
            <p class="panel-kicker">Pelagion / embryo</p>
            <h2>Геном помещается в твит</h2>
            <p>Это точный цельный «Живой гребок RAW» из версии <code>34fe67e</code>: единый профиль оболочки, формульный цвет, движение и настоящая координата <code>z</code>. Он остаётся каноном, рядом с которым лаборатория выращивает три проверяемых микрогенома внутри того же лимита 280. Любой выбранный корень затем получает орган при 512, сетку при 768 и автономный нервный импульс при 900, не меняя свой исходный слой.</p>
            <ul class="topology-genome-counts" aria-label="Микроэволюция Пелагиона">
              <li v-for="variant in PELAGION_MICRO_VARIANTS" :key="variant.id">
                <span>{{ variant.title }}</span><code>{{ variant.sketch.code.length }}</code>
              </li>
            </ul>
          </div>
          <div class="seed-actions">
            <RouterLink class="button primary" :to="{ name: 'lab', query: { form: 'pelagion' } }">Разбудить сущность</RouterLink>
            <button class="button" type="button" @click="copyGenome">{{ copyLabel }}</button>
          </div>
          <details class="source-details seed-source">
            <summary>Показать {{ PELAGION_LIVING_GENOME_CHARACTERS }} символов</summary>
            <pre><code>{{ PELAGION_LIVING_GENOME }}</code></pre>
          </details>
        </div>
      </div>
    </section>

    <section class="dna-section" aria-labelledby="genes-title">
      <header class="section-heading">
        <div>
          <p class="eyebrow">Mechanism inventory</p>
          <h2 id="genes-title">Восемь семейств идей</h2>
        </div>
        <p>{{ coverage }} авторов покрыты картой; повторения оставлены намеренно, потому что сильные работы соединяют несколько механизмов.</p>
      </header>

      <div class="gene-list">
        <article v-for="gene in COMMUNITY_GENES" :key="gene.id" class="gene-row">
          <div class="gene-index">{{ gene.index }}</div>
          <div class="gene-copy">
            <h3>{{ gene.title }}</h3>
            <p>{{ gene.description }}</p>
            <p class="gene-inheritance"><strong>В Пелагионе:</strong> {{ gene.inheritance }}</p>
          </div>
          <div class="gene-authors" :aria-label="`Авторы направления ${gene.title}`">
            <a
              v-for="handle in gene.authors"
              :key="handle"
              :href="author(handle).archive"
              target="_blank"
              rel="noopener noreferrer"
            >@{{ handle }} <small>{{ author(handle).count }}</small></a>
          </div>
        </article>
      </div>
    </section>

    <section id="pelagion" class="pelagion-lineage" aria-labelledby="lineage-title">
      <header class="section-heading">
        <div>
          <p class="eyebrow">Synthesis / not a collage</p>
          <h2 id="lineage-title">Как собрана новая сущность</h2>
        </div>
        <p>Каждая идея занимает отдельный биологический уровень. Поэтому результат остаётся организмом, а не набором включённых эффектов.</p>
      </header>

      <ol class="lineage-rail">
        <li v-for="(item, index) in PELAGION_LINEAGE" :key="item.gene">
          <span>{{ String(index + 1).padStart(2, "0") }}</span>
          <div><strong>{{ item.gene }}</strong><p>{{ item.contribution }}</p></div>
          <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.source }} ↗</a>
        </li>
      </ol>

      <div class="lineage-note">
        <p><strong>Граница авторства.</strong> Пелагион — новая синтетическая модель Form / Field, а не работа одного из перечисленных художников. Исходные выражения не копируются; ссылки фиксируют происхождение исследованных приёмов.</p>
        <div class="lineage-links">
          <a href="https://tsubuyaki.art/" target="_blank" rel="noopener noreferrer">Открыть полный архив ↗</a>
          <a href="https://tsubuyaki.art/about.html" target="_blank" rel="noopener noreferrer">Политика атрибуции ↗</a>
        </div>
      </div>
    </section>

    <details class="author-roster">
      <summary>Все {{ COMMUNITY_AUTHORS.length }} авторов снимка</summary>
      <div class="author-roster-grid">
        <a
          v-for="item in COMMUNITY_AUTHORS"
          :key="item.handle"
          :href="item.archive"
          target="_blank"
          rel="noopener noreferrer"
        ><strong>@{{ item.handle }}</strong><span>{{ item.name }} · {{ item.count }}</span></a>
      </div>
    </details>
  </section>
</template>
