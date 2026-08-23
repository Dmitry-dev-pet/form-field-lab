import { onBeforeUnmount, reactive, ref, shallowRef, watch } from "vue";
import {
  DEFAULT_COLOR_STATE,
  compileColorFormula,
  mergeColorQuery,
  readColorState
} from "../lib/colorFormula.js";

export function useColorFormula(route, router) {
  const color = reactive(readColorState(route.query));
  const evaluator = shallowRef(() => 0.5);
  const error = ref("");
  let queryTimer;
  const colorQuerySignature = query => ["cm", "cp", "ce", "ca", "cb"]
    .map(key => Array.isArray(query[key]) ? query[key][0] : query[key] || "")
    .join("|");
  let lastRouteColorSignature = colorQuerySignature(route.query);

  function compile(expression) {
    try {
      evaluator.value = compileColorFormula(expression);
      error.value = "";
    } catch (formulaError) {
      evaluator.value = () => 0.5;
      error.value = formulaError.message;
    }
  }

  function resetColor() {
    Object.assign(color, DEFAULT_COLOR_STATE);
  }

  watch(() => color.expression, compile, { immediate: true });

  watch(
    color,
    () => {
      window.clearTimeout(queryTimer);
      queryTimer = window.setTimeout(() => {
        const query = mergeColorQuery(route.query, color);
        lastRouteColorSignature = colorQuerySignature(query);
        router.replace({ query }).catch(() => undefined);
      }, 100);
    },
    { deep: true }
  );

  watch(
    () => route.query,
    query => {
      const signature = colorQuerySignature(query);
      if (signature === lastRouteColorSignature) return;
      lastRouteColorSignature = signature;
      const incoming = readColorState(query);
      const changed = Object.keys(incoming).some(key => incoming[key] !== color[key]);
      if (changed) Object.assign(color, incoming);
    }
  );

  onBeforeUnmount(() => window.clearTimeout(queryTimer));

  return { color, evaluator, error, resetColor };
}
