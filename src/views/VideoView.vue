<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  findVideoOriginal,
  videoAssetPath,
  videoOriginals
} from "../data/videoOriginals.js";

const route = useRoute();
const player = ref(null);
const playerStatus = ref("Загрузка видео");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const selected = computed(() => findVideoOriginal(route.params.id));
const selectedIndex = computed(() => videoOriginals.findIndex(item => item.id === selected.value.id));

function publicAsset(path) {
  return `${import.meta.env.BASE_URL}${path}`;
}

function videoUrl(original) {
  return publicAsset(videoAssetPath(original, `${original.id}.mp4`));
}

function posterUrl(original) {
  return publicAsset(videoAssetPath(original, "cover.png"));
}

function formatPoints(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function onLoaded() {
  playerStatus.value = reduceMotion ? "Готово к воспроизведению" : "Бесшовный повтор включён";
}

function onPlay() {
  playerStatus.value = "Воспроизведение · LOOP";
}

function onPause() {
  playerStatus.value = "Пауза";
}

async function restart() {
  if (!player.value) return;
  player.value.currentTime = 0;
  try {
    await player.value.play();
  } catch {
    playerStatus.value = "Нажмите Play в плеере";
  }
}

watch(
  () => selected.value.id,
  async () => {
    playerStatus.value = "Загрузка видео";
    await nextTick();
    if (!reduceMotion && player.value) {
      try {
        await player.value.play();
      } catch {
        playerStatus.value = "Нажмите Play в плеере";
      }
    }
  }
);
</script>

<template>
  <section class="view video-view">
    <header class="view-head video-view-head">
      <div>
        <p class="eyebrow">Video / Form / Field Originals</p>
        <h1 class="display-title">Живые формулы</h1>
      </div>
      <p class="view-lead">Пять вертикальных постановок показывают не готовые модели, а исполняемые геномы. Плеер повторяет выбранную историю без разрыва; исходный MP4 остаётся доступен отдельно.</p>
    </header>

    <div class="video-workspace">
      <article class="video-player-panel" :style="{ '--episode': `'00${selected.number}'` }">
        <div class="video-stage">
          <div class="video-stage-head" aria-hidden="true">
            <span>FORM / FIELD</span>
            <span>ORIGINAL {{ String(selected.number).padStart(3, "0") }}</span>
          </div>
          <div class="video-film">
            <video
              :key="selected.id"
              ref="player"
              data-video-player
              :data-video-id="selected.id"
              data-loop="true"
              :src="videoUrl(selected)"
              :poster="posterUrl(selected)"
              :aria-label="`${selected.title}: ${selected.thesis}`"
              :autoplay="!reduceMotion"
              muted
              loop
              playsinline
              controls
              preload="metadata"
              @loadedmetadata="onLoaded"
              @play="onPlay"
              @pause="onPause"
            >
              Ваш браузер не поддерживает видео. <a :href="videoUrl(selected)">Открыть MP4</a>.
            </video>
            <span class="video-loop-badge" aria-hidden="true"><i></i> LOOP</span>
          </div>
          <div class="video-stage-foot">
            <span>{{ selected.characters }} / 280 CHARACTERS</span>
            <span>15 SEC · 9:16</span>
          </div>
        </div>
        <p class="video-status" aria-live="polite">{{ playerStatus }}</p>
      </article>

      <aside class="video-context">
        <header class="video-copy">
          <p class="panel-kicker">Original {{ String(selected.number).padStart(3, "0") }} · {{ selected.render === "frame-indexed" ? "deterministic" : "realtime master" }}</p>
          <h2>{{ selected.title }}</h2>
          <strong>{{ selected.thesis }}</strong>
          <p>{{ selected.description }}</p>
        </header>

        <dl class="video-facts">
          <div><dt>RAW</dt><dd>{{ selected.characters }} символов</dd></div>
          <div><dt>Поле</dt><dd>{{ formatPoints(selected.particles) }} точек</dd></div>
          <div><dt>Формат</dt><dd>1080 × 1920 · без звука</dd></div>
          <div><dt>Повтор</dt><dd>первый кадр = последнему</dd></div>
        </dl>

        <div class="video-actions">
          <RouterLink class="button primary" :to="{ name: 'lab', query: { form: selected.labForm } }">Открыть сущность</RouterLink>
          <button class="button" type="button" @click="restart">С начала</button>
          <a class="button" :href="videoUrl(selected)" :download="`${selected.id}.mp4`">Скачать MP4</a>
        </div>

        <nav class="video-catalog" aria-label="Form / Field Originals">
          <div class="video-catalog-head">
            <span>Выпуски</span>
            <span>{{ selectedIndex + 1 }} / {{ videoOriginals.length }}</span>
          </div>
          <ol>
            <li v-for="original in videoOriginals" :key="original.id">
              <RouterLink
                class="video-episode"
                :class="{ active: original.id === selected.id }"
                :to="{ name: 'video', params: { id: original.id } }"
                :aria-current="original.id === selected.id ? 'page' : undefined"
              >
                <img :src="posterUrl(original)" alt="" loading="lazy">
                <span>
                  <small>{{ String(original.number).padStart(3, "0") }}</small>
                  <strong>{{ original.title }}</strong>
                  <em>{{ original.characters }} chars</em>
                </span>
              </RouterLink>
            </li>
          </ol>
        </nav>
      </aside>
    </div>
  </section>
</template>
