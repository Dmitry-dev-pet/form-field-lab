<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { runnerDocument } from "../lib/runnerDocument.js";

const emit = defineEmits(["update:view-state"]);

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
  if (frame.value) {
    frame.value.srcdoc = runnerDocument(props.sketch.code, {
      viewModel: props.sketch.viewModel,
      initialViewState: props.viewState
    });
  }
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
  if (event.source !== frame.value?.contentWindow || event.data?.type !== "sketch-view-state") return;
  const resolve = pendingSnapshots.get(event.data.requestId);
  if (resolve) {
    pendingSnapshots.delete(event.data.requestId);
    resolve(event.data.state);
  }
  emit("update:view-state", event.data.state);
}

watch(() => props.sketch.id, reload);
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
