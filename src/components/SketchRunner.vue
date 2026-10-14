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
let snapshotRequest = 0;
let launchTimer = null;
let runtimeState = "loading";
const pendingSnapshots = new Map();

function syncMotion() {
  frame.value?.contentWindow?.postMessage({
    type: "sketch-motion",
    paused: props.paused || !visible
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

function reload() {
  if (!frame.value) return;
  window.clearTimeout(launchTimer);
  runtimeState = "loading";
  emit("runtime-status", { state: "loading", message: "" });
  frame.value.srcdoc = runnerDocument(props.sketch.code, {
    viewModel: props.sketch.viewModel,
    initialViewState: props.viewState
  });
  // Parent-side watchdog still fires if a p5 sketch blocks its own event loop.
  launchTimer = window.setTimeout(() => {
    if (runtimeState === "loading") {
      runtimeState = "timeout";
      emit("runtime-status", {
        state: "timeout",
        message: "Нет подтверждения первого кадра. Возможно, устройство перегружено или заблокирована загрузка p5.js."
      });
    }
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
    if (runtimeState !== "error" || event.data.state === "running") {
      runtimeState = event.data.state;
      window.clearTimeout(launchTimer);
      emit("runtime-status", {
        state: runtimeState,
        message: String(event.data.message || "").slice(0, 350)
      });
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

watch(() => [props.sketch.id, props.sketch.code, props.sketch.viewModel], reload);
watch(() => props.paused, syncMotion);
watch(() => props.viewState, syncView, { deep: true });
watch(() => props.invertY, syncViewControls);

onMounted(() => {
  reload();
  window.addEventListener("message", receiveMessage);
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
