import { describe, expect, it } from "vitest";
import { createLandingConfig, LANDING_SCENES, selectLandingScene } from "../src/landing/scenes";
import { sanitizeConfig } from "../src/app/config";

describe("landing compositions", () => {
  it("supports direct links and all three random outcomes", () => {
    expect([.01, .5, .99].map(n => selectLandingScene(null, n))).toEqual(["aurora", "obsidian", "porcelain"]);
    expect(selectLandingScene("obsidian", 0)).toBe("obsidian");
    expect(selectLandingScene("unknown", .8)).toBe("porcelain");
  });
  it("supplies valid independent configs with autonomous pigment and motion", () => {
    for (const { id } of LANDING_SCENES) {
      const config = createLandingConfig(id);
      expect(sanitizeConfig(config)).toEqual(config);
      expect(config.noiseTime).toBeGreaterThan(0);
      expect(config.emitters.filter(e => e.kind === "field")).toHaveLength(2);
      expect(config.materials).toHaveLength(4);
      expect(config.emitters.every(e => config.materials.some(m => m.id === e.materialId))).toBe(true);
      expect(config.valueEmitters.every(e => e.kind === "sine")).toBe(true);
      config.materials[0]!.color = "#000000";
      expect(createLandingConfig(id).materials[0]!.color).not.toBe("#000000");
    }
  });
});
