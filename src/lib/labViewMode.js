export const LAB_VIEW_MODE = Object.freeze({
  bare: "bare"
});

export function readLabViewMode() {
  return LAB_VIEW_MODE.bare;
}

export function mergeLabViewModeQuery(query) {
  const next = { ...query };
  delete next.view;
  return next;
}
