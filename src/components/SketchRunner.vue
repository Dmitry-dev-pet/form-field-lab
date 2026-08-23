<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { runnerDocument } from "../lib/runnerDocument.js";

const props = defineProps({
  sketch: { type: Object, required: true },
  label: { type: String, default: "Скетч @yuruyurau" }
});

const host = ref(null);
const frame = ref(null);
let observer;
let visible = true;

function syncMotion() {
  frame.value?.contentWindow?.postMessage({ type: "sketch-motion", paused: !visible }, "*");
}

function reload() {
  if (frame.value) frame.value.srcdoc = runnerDocument(props.sketch.code);
}

watch(() => props.sketch.id, reload);

onMounted(() => {
  reload();
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      syncMotion();
    }, { rootMargin: "160px 0px", threshold: 0.01 });
    observer.observe(host.value);
  }
});

onBeforeUnmount(() => observer?.disconnect());

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
