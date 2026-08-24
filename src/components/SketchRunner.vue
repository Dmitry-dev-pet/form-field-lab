<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { runnerDocument } from "../lib/runnerDocument.js";

const props = defineProps({
  sketch: { type: Object, required: true },
  label: { type: String, default: "Скетч @yuruyurau" },
  paused: { type: Boolean, default: false },
  frameDriven: { type: Boolean, default: false }
});

const host = ref(null);
const frame = ref(null);
let observer;
let driverFrame;
let visible = true;

function syncMotion() {
  frame.value?.contentWindow?.postMessage({
    type: "sketch-motion",
    paused: props.paused || !visible,
    driven: props.frameDriven
  }, "*");
}

function driveFrame() {
  if (!props.frameDriven) return;
  if (visible && !props.paused) {
    frame.value?.contentWindow?.postMessage({ type: "sketch-frame" }, "*");
  }
  driverFrame = requestAnimationFrame(driveFrame);
}

function syncDriver() {
  if (driverFrame) cancelAnimationFrame(driverFrame);
  driverFrame = props.frameDriven ? requestAnimationFrame(driveFrame) : undefined;
}

function reload() {
  if (frame.value) frame.value.srcdoc = runnerDocument(props.sketch.code);
}

watch(() => props.sketch.id, reload);
watch(() => props.paused, syncMotion);
watch(() => props.frameDriven, () => {
  syncMotion();
  syncDriver();
});

onMounted(() => {
  reload();
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      syncMotion();
    }, { rootMargin: "160px 0px", threshold: 0.01 });
    observer.observe(host.value);
  }
  syncDriver();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (driverFrame) cancelAnimationFrame(driverFrame);
});

defineExpose({ reload });
</script>

<template>
  <div ref="host" class="runner-frame">
    <iframe
      ref="frame"
      sandbox="allow-scripts"
      allow="accelerometer; gyroscope"
      :title="label"
      @load="syncMotion"
    ></iframe>
  </div>
</template>
