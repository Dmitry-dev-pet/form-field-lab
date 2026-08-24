export const LAB_VIEW_MODE = Object.freeze({
  bare: "bare",
  spa: "spa"
});

export function readLabViewMode(value) {
  const mode = Array.isArray(value) ? value[0] : value;
  return mode === LAB_VIEW_MODE.bare ? LAB_VIEW_MODE.bare : LAB_VIEW_MODE.spa;
}

export function mergeLabViewModeQuery(query, mode) {
  const next = { ...query };
  if (mode === LAB_VIEW_MODE.bare) next.view = LAB_VIEW_MODE.bare;
  else delete next.view;
  return next;
}
