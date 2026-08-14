import { describe, expect, it } from "vitest";
import { assertConfig, decayFactor, defaultConfig } from "../src/app/config";
import { CHARCOAL, CRIMSON, hexToRgb, rgbToHex } from "../src/app/colors";
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

describe("phase1Budgets", () => {
  it("mirrors config", () => {
    const budgets = phase1Budgets();
    expect(budgets.simResolution).toBe(defaultConfig.simResolution);
    expect(budgets.dyeResolution).toBe(defaultConfig.dyeResolution);
    expect(budgets.pressureIterations).toBe(defaultConfig.pressureIterations);
  });
});
