import { normalizeSpatialSnapshot } from "./genomeImprint.js";

export const VIEW_STATE_STORAGE_KEY = "form-field-lab:view-states:v1";

function readViewStateMap(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(VIEW_STATE_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function readViewState(formId, storage = globalThis.localStorage) {
  const value = readViewStateMap(storage)[formId];
  return value && typeof value === "object" ? normalizeSpatialSnapshot(value) : null;
}

export function writeViewState(formId, snapshot, storage = globalThis.localStorage) {
  if (!formId || !snapshot) return false;
  try {
    const states = readViewStateMap(storage);
    states[formId] = normalizeSpatialSnapshot(snapshot);
    storage?.setItem(VIEW_STATE_STORAGE_KEY, JSON.stringify(states));
    return true;
  } catch {
    return false;
  }
}

export function clearViewState(formId, storage = globalThis.localStorage) {
  if (!formId) return false;
  try {
    const states = readViewStateMap(storage);
    delete states[formId];
    storage?.setItem(VIEW_STATE_STORAGE_KEY, JSON.stringify(states));
    return true;
  } catch {
    return false;
  }
}
