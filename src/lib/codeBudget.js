export const RAW_CODE_BUDGET_MIN = 280;
export const RAW_CODE_BUDGET_MAX = 900;
export const RAW_CODE_BUDGET_PRESETS = Object.freeze([280, 512, 768]);

export function readRawCodeBudget(value, fallback = RAW_CODE_BUDGET_MIN) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(RAW_CODE_BUDGET_MIN, Math.min(RAW_CODE_BUDGET_MAX, parsed));
}

export function selectRawBudgetVariant(variants, requestedBudget) {
  const budget = readRawCodeBudget(requestedBudget);
  const measured = [...variants]
    .map((variant, index) => ({
      ...variant,
      rank: Number.isFinite(variant.rank) ? variant.rank : index,
      characters: variant.sketch.code.length
    }))
    .sort((first, second) => first.rank - second.rank);
  const fitting = measured.filter(variant => variant.characters <= budget);
  const variant = fitting.at(-1) || measured[0] || null;
  const richest = measured.at(-1) || null;
  const activeFeatures = variant?.features || [];
  const omittedFeatures = (richest?.features || []).filter(
    feature => !activeFeatures.includes(feature)
  );

  return Object.freeze({
    budget,
    variant,
    characters: variant?.characters || 0,
    withinLimit: Boolean(variant && variant.characters <= budget),
    activeFeatures: Object.freeze([...activeFeatures]),
    omittedFeatures: Object.freeze(omittedFeatures)
  });
}
