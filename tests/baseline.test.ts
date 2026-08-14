import { describe, expect, it } from "vitest";
import {
  assertConfig,
  clampConfig,
  controlSchema,
  decayFactor,
  defaultConfig,
  sanitizeConfig,
} from "../src/app/config";
import { CHARCOAL, CRIMSON, hexToRgb, rgbToHex } from "../src/app/colors";
import { dyeLooksAllBlack, dyeMix, dyeStatsFromRgba8 } from "../src/app/dyeMix";
import {
  blendWeights,
  derivePalette,
  gradePigment,
  luma,
} from "../src/app/palette";
import { GL, selectSimTextureFormat, type GpuCaps } from "../src/sim/capabilities";
import { phase1Budgets } from "../src/quality/budgets";

function caps(overrides: Partial<GpuCaps> = {}): GpuCaps {
  return {
    webgl2: true,
    colorBufferFloat: false,
    colorBufferHalfFloat: false,
    textureFloatLinear: false,
    textureHalfFloatLinear: false,
    ...overrides,
  };
}

describe("defaultConfig", () => {
  it("keeps Phase 1 budgets in range", () => {
    expect(defaultConfig.dyeResolution).toBeGreaterThanOrEqual(defaultConfig.simResolution);
    expect(defaultConfig.pressureIterations).toBeGreaterThanOrEqual(20);
    expect(defaultConfig.pressureIterations).toBeLessThanOrEqual(40);
    expect(defaultConfig.crimson).toBe(CRIMSON);
    expect(defaultConfig.charcoal).toBe(CHARCOAL);
    expect(defaultConfig.composerStrength).toBeGreaterThan(0);
    expect(defaultConfig.dyeInject).toBeGreaterThan(0);
    expect(defaultConfig.noiseTime).toBeLessThan(1);
    expect(defaultConfig.warmupSteps).toBeGreaterThan(0);
    expect(defaultConfig.pointerEnabled).toBe(true);
    expect(() => assertConfig(defaultConfig)).not.toThrow();
  });

  it("rejects a dye grid smaller than velocity", () => {
    expect(() =>
      assertConfig({ ...defaultConfig, simResolution: 512, dyeResolution: 128 }),
    ).toThrow(/dyeResolution/);
  });
});

describe("decayFactor", () => {
  it("is 1 when decay or dt is 0", () => {
    expect(decayFactor(0, 0.016)).toBe(1);
    expect(decayFactor(0.2, 0)).toBe(1);
  });

  it("falls with larger dt", () => {
    expect(decayFactor(0.2, 0.05)).toBeLessThan(decayFactor(0.2, 0.01));
  });
});

describe("colors", () => {
  it("converts the default crimson and charcoal", () => {
    const crimson = hexToRgb(CRIMSON);
    expect(crimson[0]).toBeGreaterThan(crimson[1]);
    expect(crimson[0]).toBeGreaterThan(crimson[2]);
    expect(hexToRgb(CHARCOAL).every((c) => c < 0.12)).toBe(true);
  });

  it("round-trips hex", () => {
    expect(rgbToHex(hexToRgb("#C41628")).toLowerCase()).toBe("#c41628");
  });

  it("rejects bad hex", () => {
    expect(() => hexToRgb("red")).toThrow(/hex/);
  });
});

describe("selectSimTextureFormat", () => {
  it("fails without WebGL2", () => {
    const result = selectSimTextureFormat(caps({ webgl2: false }));
    expect(result.ok).toBe(false);
  });

  it("prefers half-float when renderable", () => {
    const result = selectSimTextureFormat(
      caps({ colorBufferFloat: true, textureHalfFloatLinear: true }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.format.internalFormat).toBe(GL.RGBA16F);
      expect(result.format.filter).toBe(GL.LINEAR);
      expect(result.format.manualBilinear).toBe(false);
    }
  });

  it("uses nearest and manual bilinear without linear filtering", () => {
    const result = selectSimTextureFormat(caps({ colorBufferHalfFloat: true }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.format.filter).toBe(GL.NEAREST);
      expect(result.format.manualBilinear).toBe(true);
    }
  });

  it("fails without floating-point render targets", () => {
    const result = selectSimTextureFormat(caps());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/floating-point/);
    }
  });
});

describe("controlSchema", () => {
  it("covers unique keys with defaults in range", () => {
    const keys = controlSchema.map((control) => control.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const control of controlSchema) {
      const value = defaultConfig[control.key];
      if (control.kind === "range") {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThanOrEqual(control.min ?? -Infinity);
        expect(value).toBeLessThanOrEqual(control.max ?? Infinity);
      }
      if (control.kind === "toggle") {
        expect(typeof value).toBe("boolean");
      }
      if (control.kind === "color") {
        expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});

describe("sanitizeConfig", () => {
  it("fills from defaults and clamps dye above sim", () => {
    const next = sanitizeConfig({
      simResolution: 512,
      dyeResolution: 128,
      vorticity: 999,
    });
    expect(next.dyeResolution).toBeGreaterThanOrEqual(next.simResolution);
    expect(next.vorticity).toBeLessThanOrEqual(40);
    expect(next.crimson).toBe(defaultConfig.crimson);
  });
});

describe("clampConfig", () => {
  it("keeps pressure iterations in 20–40", () => {
    expect(clampConfig({ ...defaultConfig, pressureIterations: 12 }).pressureIterations).toBe(20);
    expect(clampConfig({ ...defaultConfig, pressureIterations: 80 }).pressureIterations).toBe(40);
  });
});

describe("phase1Budgets", () => {
  it("mirrors config", () => {
    const budgets = phase1Budgets();
    expect(budgets.simResolution).toBe(defaultConfig.simResolution);
    expect(budgets.dyeResolution).toBe(defaultConfig.dyeResolution);
    expect(budgets.pressureIterations).toBe(defaultConfig.pressureIterations);
  });
});

describe("dyeMix", () => {
  const charcoal = hexToRgb(CHARCOAL);
  const crimson = hexToRgb(CRIMSON);

  it("maps negative potential to charcoal and positive to crimson", () => {
    expect(dyeMix(-1, charcoal, crimson)).toEqual(charcoal);
    expect(dyeMix(-0.55, charcoal, crimson)).toEqual(charcoal);
    expect(dyeMix(0.55, charcoal, crimson)).toEqual(crimson);
    expect(dyeMix(1, charcoal, crimson)).toEqual(crimson);
  });

  it("blends around zero into maroon midtones instead of snapping", () => {
    const mid = dyeMix(0, charcoal, crimson);
    expect(mid[0]).toBeGreaterThan(charcoal[0]);
    expect(mid[0]).toBeLessThan(crimson[0]);
    expect(mid).not.toEqual(charcoal);
    expect(mid).not.toEqual(crimson);
  });

  it("flags an all-black readback and accepts mixed crimson/charcoal", () => {
    const black = new Uint8Array(16);
    expect(dyeLooksAllBlack(dyeStatsFromRgba8(black))).toBe(true);

    const mixed = new Uint8Array([
      232, 8, 24, 255, 232, 8, 24, 255, 5, 5, 6, 255, 5, 5, 6, 255,
    ]);
    const stats = dyeStatsFromRgba8(mixed);
    expect(stats.crimsonFrac).toBeGreaterThan(0);
    expect(stats.charcoalFrac).toBeGreaterThan(0);
    expect(dyeLooksAllBlack(stats)).toBe(false);
  });
});

describe("palette", () => {
  const charcoal = hexToRgb(CHARCOAL);
  const crimson = hexToRgb(CRIMSON);

  it("derives wine, ember, slate, and plum from the two primaries", () => {
    const palette = derivePalette(charcoal, crimson);
    expect(luma(palette.wine)).toBeLessThan(luma(palette.crimson));
    expect(luma(palette.ember)).toBeGreaterThan(luma(palette.crimson) * 0.98);
    expect(palette.ember[0]).toBeGreaterThan(palette.ember[1]);
    expect(palette.ember[0]).toBeGreaterThan(palette.ember[2]);
    expect(palette.wine[0]).toBeGreaterThan(palette.wine[1]);
    expect(palette.slate[2]).toBeGreaterThan(palette.charcoal[2]);
    expect(palette.plum[0]).toBeGreaterThan(palette.plum[2]);
  });

  it("shifts from additive to multiply to burn as concentration rises", () => {
    const thin = blendWeights(0.12);
    const mid = blendWeights(0.5);
    const dense = blendWeights(0.9);
    expect(thin.add).toBeGreaterThan(thin.mul);
    expect(thin.add).toBeGreaterThan(thin.burn);
    expect(mid.mul).toBeGreaterThan(mid.add);
    expect(dense.burn).toBeGreaterThan(dense.add);
  });

  it("keeps extreme filaments and overshoot inside the family", () => {
    const thin = gradePigment(0.12, 0, charcoal, crimson);
    const pooled = gradePigment(0.9, 0, charcoal, crimson);
    const bloom = gradePigment(1.4, 0, charcoal, crimson);
    const filament = gradePigment(0.18, 0.4, charcoal, crimson);
    expect(luma(thin)).toBeGreaterThan(luma(charcoal));
    expect(luma(pooled)).toBeLessThan(luma(crimson));
    expect(luma(bloom)).toBeGreaterThan(luma(gradePigment(1, 0, charcoal, crimson)));
    expect(filament[2]).toBeGreaterThan(thin[2]);
    expect(bloom[0]).toBeGreaterThan(bloom[1]);
    expect(gradePigment(1, 0.08, charcoal, crimson)[0]).toBeGreaterThan(0.35);
  });

  it("grades mid concentration as wine rather than a binary snap", () => {
    const mid = gradePigment(0.45, 0.08, charcoal, crimson);
    expect(mid[0]).toBeGreaterThan(charcoal[0]);
    expect(mid[0]).toBeLessThan(crimson[0]);
    expect(luma(mid)).toBeLessThan(luma(crimson));
    expect(luma(mid)).toBeGreaterThan(luma(charcoal));
  });
});
