export function formatNumber(value: number, step?: number): string {
  if (!Number.isFinite(value)) {
    return "–";
  }
  const digits = step === undefined ? 2 : step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
  return value.toFixed(digits);
}
