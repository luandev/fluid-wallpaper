const FINE_EPSILON = 1e-6;

export function fineStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) {
    return FINE_EPSILON;
  }
  return Math.max(step / 10, FINE_EPSILON);
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function clampNumberField(raw: string, min: number, max: number, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return clampNumber(fallback, min, max);
  }
  return clampNumber(parsed, min, max);
}

export function nudgeNumber(
  value: number,
  direction: 1 | -1,
  step: number,
  min: number,
  max: number,
): number {
  const size = Number.isFinite(step) && step > 0 ? step : FINE_EPSILON;
  return clampNumber(value + direction * size, min, max);
}
