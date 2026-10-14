<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { runnerDocument } from "../lib/runnerDocument.js";

const emit = defineEmits(["update:view-state", "runtime-status"]);

const props = defineProps({
  sketch: { type: Object, required: true },
  label: { type: String, default: "Скетч @yuruyurau" },
  paused: { type: Boolean, default: false },
  viewState: { type: Object, default: null },
  invertY: { type: Boolean, default: true }
});

const host = ref(null);
const frame = ref(null);
let observer;
let visible = true;
let firstFrameSeen = false;
let retryCount = 0;
let frameGeneration = 0;
let snapshotRequest = 0;
let launchTimer = null;
let retryTimer = null;
let runtimeState = "loading";
const pendingSnapshots = new Map();

function publishStatus(state, message = "") {
  runtimeState = state;
  emit("runtime-status", { state, message });
}

function syncMotion() {
  // An offscreen frame must draw ONCE before auto-pause. Sending noLoop()
  // during p5's startup can leave the initial canvas blank until a reload.
  frame.value?.contentWindow?.postMessage({
    type: "sketch-motion",
    paused: props.paused || (firstFrameSeen && !visible)
  }, "*");
}

function syncView() {
  if (!props.sketch.viewModel) return;
  frame.value?.contentWindow?.postMessage({
    type: "sketch-view",
    state: {
      ...(props.viewState || {}),
      invertY: props.invertY
    }
  }, "*");
}

function syncViewControls() {
  if (!props.sketch.viewModel) return;
  frame.value?.contentWindow?.postMessage({
    type: "sketch-view",
    state: { invertY: props.invertY }
  }, "*");
}

function scheduleRetry(reason) {
  if (firstFrameSeen || props.paused || retryCount >= 1 || !frame.value) return false;
  retryCount += 1;
  const expectedGeneration = frameGeneration;
  window.clearTimeout(launchTimer);
  publishStatus("loading", reason + " Пробую автоматически ещё раз…");
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    if (frameGeneration === expectedGeneration) reload(false);
  }, 250);
  return true;
}

function reload(resetRetry = true) {
  if (!frame.value) return;
  window.clearTimeout(launchTimer);
  window.clearTimeout(retryTimer);
  retryTimer = null;
  if (resetRetry) retryCount = 0;
  firstFrameSeen = false;
  const frameToken = String(++frameGeneration);
  publishStatus("loading");
  frame.value.srcdoc = runnerDocument(props.sketch.code, {
    viewModel: props.sketch.viewModel,
    initialViewState: props.viewState,
    frameToken
  });
  // Fallback for blocked requests or missed load events: one automatic retry,
  // then a visible actionable timeout. No unbounded reload loop.
  launchTimer = window.setTimeout(() => {
    if (runtimeState !== "loading") return;
    if (scheduleRetry("Не дождались первого кадра.")) return;
    publishStatus("timeout",
      "Не удалось получить первый кадр после повторного запуска. Проверь соединение и нажми «Повторить запуск».");
  }, 12000);
}

function resetView() {
  frame.value?.contentWindow?.postMessage({ type: "sketch-view-reset" }, "*");
}

function snapshot() {
  if (!props.sketch.viewModel || !frame.value?.contentWindow) {
    return Promise.resolve(props.viewState || null);
  }
  const requestId = ++snapshotRequest;
  return new Promise(resolve => {
    const timeout = window.setTimeout(() => {
      pendingSnapshots.delete(requestId);
      resolve(props.viewState || null);
    }, 500);
    pendingSnapshots.set(requestId, state => {
      window.clearTimeout(timeout);
      resolve(state);
    });
    frame.value.contentWindow.postMessage({
      type: "sketch-view-snapshot",
      requestId
    }, "*");
  });
}

function receiveMessage(event) {
  if (event.source !== frame.value?.contentWindow) return;
  if (event.data?.type === "sketch-runtime-status") {
    // WindowProxy is reused across iframe navigations; reject a late event
    // from the *previous* RAW sketch or a previous automatic retry.
    if (event.data.frameToken !== String(frameGeneration)) return;
    const state = event.data.state;
    if (state === "running") {
      firstFrameSeen = true;
      window.clearTimeout(launchTimer);
      window.clearTimeout(retryTimer);
      publishStatus("running", String(event.data.message || "").slice(0, 350));
      syncMotion(); // Now offscreen auto-pause is safe.
    } else if (state === "error") {
      // One failed <script> may emit both resource-error and inline onerror.
      // Do not let the second report cancel an already scheduled retry.
      if (retryTimer !== null) return;
      if (!firstFrameSeen
        && /Не удалось загрузить p5\.js|Не загрузилась внешняя библиотека/.test(String(event.data.message))
        && scheduleRetry("Не загрузилась библиотека p5.js.")) return;
      window.clearTimeout(launchTimer);
      window.clearTimeout(retryTimer);
      publishStatus("error", String(event.data.message || "").slice(0, 350));
    }
    return;
  }
  if (event.data?.type !== "sketch-view-state") return;
  const resolve = pendingSnapshots.get(event.data.requestId);
  if (resolve) {
    pendingSnapshots.delete(event.data.requestId);
    resolve(event.data.state);
  }
  emit("update:view-state", event.data.state);
}

watch(() => [props.sketch.id, props.sketch.code, props.sketch.viewModel], () => reload());
watch(() => props.paused, syncMotion);
watch(() => props.viewState, syncView, { deep: true });
watch(() => props.invertY, syncViewControls);

onMounted(() => {
  window.addEventListener("message", receiveMessage);
  reload();
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      syncMotion();
    }, { rootMargin: "160px 0px", threshold: 0.01 });
    observer.observe(host.value);
  }
});

onBeforeUnmount(() => {
  window.clearTimeout(launchTimer);
  window.clearTimeout(retryTimer);
  observer?.disconnect();
  window.removeEventListener("message", receiveMessage);
  for (const resolve of pendingSnapshots.values()) resolve(props.viewState || null);
  pendingSnapshots.clear();
});

defineExpose({ reload, resetView, snapshot });
</script>

<template>
  <div ref="host" class="runner-frame">
    <iframe
      ref="frame"
      sandbox="allow-scripts"
      allow="accelerometer; gyroscope"
      :title="label"
      @load="syncMotion(); syncView()"
    ></iframe>
  </div>
</template>
