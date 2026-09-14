import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  fluidPresets,
  getFluidPreset,
  getFluidPresetDocument,
  validateCatalogEntry,
} from "../src/presets";
import { reference } from "../src/docs/reference";
import { defaultConfig, sanitizeConfig } from "../src/app/config";
import { defaultLiquidScene } from "../src/app/liquidScene";
import { parsePresetJson } from "../src/app/presets";

describe("public presets and docs", () => {
  it("round-trips every curated preset with independent ownership", () => {
    expect(fluidPresets.length).toBeGreaterThanOrEqual(6);
    for (const info of fluidPresets) {
      const image = readFileSync(
        new URL(`../presets/${info.id}/preview.png`, import.meta.url),
      );
      expect(image.subarray(1, 4).toString()).toBe("PNG");
      expect(image.readUInt32BE(16)).toBe(640);
      expect(image.readUInt32BE(20)).toBe(400);
    }
    for (const info of fluidPresets) {
      const doc = getFluidPresetDocument(info.id);
      expect(parsePresetJson(JSON.stringify(doc)).ok).toBe(true);
      const a = getFluidPreset(info.id);
      a.materials[0].color = "#000000";
      expect(getFluidPreset(info.id).materials[0].color).not.toBe("#000000");
    }
  });

  it("rejects malformed contributions instead of silently sanitizing them", () => {
    const info = fluidPresets[0];
    const doc = getFluidPresetDocument(info.id);
    doc.presets[0].config.emitters[0].materialId = "missing";
    expect(() => validateCatalogEntry(info.id, info, doc)).toThrow();
    expect(() => getFluidPreset("missing")).toThrow();
  });

  it("covers all public config and scene keys, with unique reference anchors", () => {
    for (const key of Object.keys(defaultConfig))
      expect(reference.some((r) => r.path === key)).toBe(true);
    for (const key of Object.keys(defaultLiquidScene()))
      expect(reference.some((r) => r.path === "scene." + key)).toBe(true);
    expect(new Set(reference.map((r) => r.path)).size).toBe(reference.length);
  });

  it("preserves explicit transparency through portable config", () => {
    const config = sanitizeConfig({
      ...defaultConfig,
      backgroundMode: "transparent",
      videoReveal: 0,
    });
    expect(config.backgroundMode).toBe("transparent");
    expect(config.videoReveal).toBe(0);
  });
});
