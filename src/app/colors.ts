const HEX6 = /^#?[0-9a-fA-F]{6}$/;

export const CRIMSON = "#C41628";
export const CHARCOAL = "#161618";

export function hexToRgb(hex: string): [number, number, number] {
  if (!HEX6.test(hex)) {
    throw new Error(`Expected a 6-digit hex color, got "${hex}"`);
  }
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  const n = Number.parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex(rgb: readonly [number, number, number]): string {
  const toByte = (c: number) =>
    Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toByte(rgb[0])}${toByte(rgb[1])}${toByte(rgb[2])}`;
}
