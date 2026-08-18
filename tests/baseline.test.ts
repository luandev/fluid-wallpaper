import { describe, expect, it } from "vitest";
import {
  CHARCOAL_MATERIAL_ID,
  CRIMSON_MATERIAL_ID,
  MAX_EMITTERS,
  MAX_MATERIALS,
  MAX_VALUE_BINDINGS,
  MAX_VALUE_EMITTERS,
  MAX_WIND_STATIONS,
  assertConfig,
  clampConfig,
  cloneConfig,
  controlSchema,
  decayFactor,
  defaultConfig,
  isBindablePath,
  mergeConfig,
  sanitizeConfig,
  scatterWindStations,
} from "../src/app/config";
import { CHARCOAL, CRIMSON, hexToRgb, rgbToHex } from "../src/app/colors";
import { BINDABLE_PATHS, applyDrivers, evaluateEmitter, getPath, setPath, wave01 } from "../src/app/drivers";
import { padLiveMaterials, triangleWave, tweenAmount, tweenMaterials } from "../src/app/colorTween";
import { dyeLooksAllBlack, dyeStatsFromRgba8, fieldMask } from "../src/app/dyeMix";
import { luma, mixRgb } from "../src/app/palette";
import { heightNormal, mixLooks, shadeLook, viscosityDamp, type MixedLook } from "../src/app/shade";
import type { LiveMaterial } from "../src/app/colorTween";
import { perlin3, wiggleMotion } from "../src/app/wiggle";
import {
  deletePresetFromList,
  getPresetFromList,
  MAX_PRESETS,
  mergeImportedPresets,
  parsePresetDocument,
  parsePresetJson,
  PRESET_DOCUMENT_KIND,
  sanitizePresetList,
  serializePresetDocument,
  upsertPresetInList,
} from "../src/app/presets";
import { GL, selectSimTextureFormat, type GpuCaps } from "../src/sim/capabilities";
import { phase1Budgets } from "../src/quality/budgets";
import { windForceAt } from "../src/app/wind";
import { clampPanelPos, sanitizePanelLayout } from "../src/app/panelLayout";

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
    expect(defaultConfig.materials[0]?.color).toBe("#FF0000");
    expect(defaultConfig.materials[1]?.color).toBe(CHARCOAL);
    expect(defaultConfig.materials).toHaveLength(2);
    expect(defaultConfig.emitters.map((emitter) => emitter.id)).toEqual([
      "emit-field-crimson",
      "emit-field-charcoal",
      "emit-corner-crimson",
      "emit-corner-charcoal",
    ]);
    expect(defaultConfig.emitters[0]?.materialId).toBe(CRIMSON_MATERIAL_ID);
    expect(defaultConfig.emitters[1]?.materialId).toBe(CHARCOAL_MATERIAL_ID);
    expect(defaultConfig.emitters[1]?.noiseOffset).toBe(1);
    expect(defaultConfig.emitters.every((emitter) => emitter.kind === "point")).toBe(true);
    expect(defaultConfig.emitters.map((emitter) => [emitter.uvX, emitter.uvY])).toEqual([
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ]);
    expect(defaultConfig.composerStrength).toBeGreaterThan(0);
    expect(defaultConfig.dyeInject).toBeGreaterThan(0);
    expect(defaultConfig.noiseTime).toBeLessThan(1);
    expect(defaultConfig.warmupSteps).toBeGreaterThan(0);
    expect(defaultConfig.windStations).toHaveLength(4);
    expect(defaultConfig.valueEmitters).toHaveLength(1);
    expect(defaultConfig.valueEmitters[0]?.kind).toBe("triangle");
    expect(defaultConfig.valueBindings).toEqual([
      { id: "bind-1", emitterId: "wave-1", path: "noiseTime", amount: 0.87 },
    ]);
    expect(defaultConfig.windStrength).toBeGreaterThan(0);
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
      if (control.kind === "select") {
        expect(typeof value).toBe("string");
        expect(control.options?.some((option) => option.value === value)).toBe(true);
      }
    }
    expect(controlSchema.filter((control) => control.key === "noiseType")).toHaveLength(1);
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
    expect(next.materials[0]?.color).toBe(defaultConfig.materials[0]?.color);
  });

  it("falls unknown noise types back to perlin", () => {
    expect(sanitizeConfig({ noiseType: "banana" }).noiseType).toBe("perlin");
    expect(sanitizeConfig({ noiseType: "worley" }).noiseType).toBe("worley");
  });

  it("caps material and emitter lists and deep-clones them", () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({
      id: `mat-${i}`,
      name: `M${i}`,
      enabled: true,
      color: "#112233",
      colorB: "red",
      viscosity: 4,
      roughness: 0.2,
      metallic: 0.2,
      sheen: 0.2,
      glow: 0.2,
    }));
    const next = sanitizeConfig({ materials: nine, emitters: nine.map((item) => ({ ...item, kind: "orb", materialId: item.id })) });
    expect(next.materials).toHaveLength(MAX_MATERIALS);
    expect(next.emitters.length).toBeLessThanOrEqual(MAX_EMITTERS);
    expect(next.materials[0]?.colorB).toBe(defaultConfig.materials[0]?.colorB);
    expect(next.materials.every((material) => material.viscosity <= 1)).toBe(true);
    const cloned = cloneConfig(next);
    expect(cloned.materials).not.toBe(next.materials);
    expect(cloned.emitters).not.toBe(next.emitters);
    cloned.materials[0] = { ...cloned.materials[0], glow: 0.9 };
    expect(next.materials[0]?.glow).not.toBe(0.9);
  });

  it("migrates v7 crimson/charcoal keys into the first two materials", () => {
    const next = sanitizeConfig({
      crimson: "#FF0000",
      charcoal: "#111111",
      crimsonB: "#AA0000",
      charcoalB: "#222222",
    });
    expect(next.materials[0]?.color.toLowerCase()).toBe("#ff0000");
    expect(next.materials[0]?.colorB.toLowerCase()).toBe("#aa0000");
    expect(next.materials[1]?.color.toLowerCase()).toBe("#111111");
    expect(next.materials[1]?.colorB.toLowerCase()).toBe("#222222");
    expect(next.emitters).toHaveLength(defaultConfig.emitters.length);
    expect(next.windStations).toEqual([]);
  });

  it("caps wind stations at 8 and ignores missing lists", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `wind-${i}`,
      uvX: 2,
      spin: 9,
    }));
    const next = sanitizeConfig({ windStations: many });
    expect(next.windStations).toHaveLength(MAX_WIND_STATIONS);
    expect(next.windStations.every((station) => station.uvX <= 1)).toBe(true);
    expect(next.windStations.every((station) => station.spin <= 1)).toBe(true);
    expect(cloneConfig(next).windStations).not.toBe(next.windStations);
    expect(cloneConfig(next).valueEmitters).not.toBe(next.valueEmitters);
  });

  it("caps value emitters and bindings and drops invalid driver paths", () => {
    const waves = Array.from({ length: 12 }, (_, i) => ({
      id: `wave-${i}`,
      name: `Wave ${i}`,
      enabled: true,
      kind: i === 0 ? "orb" : "sine",
      rate: 0.2,
      phase: 0,
      from: 0,
      to: 4,
    }));
    const next = sanitizeConfig({
      valueEmitters: waves,
      valueBindings: [
        { id: "b1", emitterId: "wave-0", path: "vorticity", amount: 0.5 },
        { id: "b2", emitterId: "missing", path: "vorticity", amount: 1 },
        { id: "b3", emitterId: "wave-0", path: "simResolution", amount: 1 },
        { id: "b4", emitterId: "wave-0", path: "materials.mat-crimson.color", amount: 1 },
        { id: "b5", emitterId: "wave-0", path: "materials.mat-crimson.glow", amount: 2 },
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `extra-${i}`,
          emitterId: "wave-0",
          path: "dyeInject",
          amount: 0.25,
        })),
      ],
    });
    expect(next.valueEmitters).toHaveLength(MAX_VALUE_EMITTERS);
    expect(next.valueEmitters[0]?.kind).toBe("sine");
    expect(next.valueEmitters.every((emitter) => emitter.scale === 1)).toBe(true);
    expect(next.valueBindings).toHaveLength(MAX_VALUE_BINDINGS);
    expect(next.valueBindings.every((binding) => binding.emitterId === "wave-0")).toBe(true);
    expect(next.valueBindings.some((binding) => binding.path === "simResolution")).toBe(false);
    expect(next.valueBindings.some((binding) => binding.path.endsWith(".color"))).toBe(false);
    expect(next.valueBindings.find((binding) => binding.path.endsWith(".glow"))?.amount).toBe(1);
    const cloned = cloneConfig(next);
    expect(cloned.valueEmitters).not.toBe(next.valueEmitters);
    expect(cloned.valueBindings).not.toBe(next.valueBindings);
    cloned.valueEmitters[0] = { ...cloned.valueEmitters[0], rate: 7 };
    expect(next.valueEmitters[0]?.rate).not.toBe(7);
  });
});

describe("clampConfig", () => {
  it("keeps pressure iterations in 20–40", () => {
    expect(clampConfig({ ...defaultConfig, pressureIterations: 12 }).pressureIterations).toBe(20);
    expect(clampConfig({ ...defaultConfig, pressureIterations: 80 }).pressureIterations).toBe(40);
  });
});

describe("mergeConfig", () => {
  it("deep-clones value emitters and bindings", () => {
    const base = cloneConfig(defaultConfig);
    base.valueEmitters = [
      {
        id: "wave-1",
        name: "Pulse",
        enabled: true,
        kind: "sine",
        rate: 0.2,
        phase: 0,
        from: 0,
        to: 1,
        scale: 1,
      },
    ];
    base.valueBindings = [{ id: "bind-1", emitterId: "wave-1", path: "vorticity", amount: 1 }];
    const next = mergeConfig(base, {
      valueEmitters: base.valueEmitters,
      valueBindings: base.valueBindings,
    });
    expect(next.valueEmitters).not.toBe(base.valueEmitters);
    expect(next.valueBindings).not.toBe(base.valueBindings);
    next.valueEmitters[0] = { ...next.valueEmitters[0], rate: 7 };
    next.valueBindings[0] = { ...next.valueBindings[0], amount: 0.1 };
    expect(base.valueEmitters[0]?.rate).toBe(0.2);
    expect(base.valueBindings[0]?.amount).toBe(1);
  });
});

describe("isBindablePath", () => {
  it("rejects reseed keys and hex color paths", () => {
    expect(isBindablePath(defaultConfig, "vorticity")).toBe(true);
    expect(isBindablePath(defaultConfig, "simResolution")).toBe(false);
    expect(isBindablePath(defaultConfig, `materials.${CRIMSON_MATERIAL_ID}.color`)).toBe(false);
    expect(isBindablePath(defaultConfig, `materials.${CRIMSON_MATERIAL_ID}.glow`)).toBe(true);
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
  it("maps positive potential to the 0-offset lobe and negative to the inverted lobe", () => {
    expect(fieldMask(-1, 0)).toBe(0);
    expect(fieldMask(-0.55, 0)).toBe(0);
    expect(fieldMask(0.55, 0)).toBe(1);
    expect(fieldMask(1, 0)).toBe(1);
    expect(fieldMask(1, 1)).toBe(0);
    expect(fieldMask(-1, 1)).toBe(1);
  });

  it("blends around zero instead of snapping", () => {
    const mid = fieldMask(0, 0);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it("flags an all-black readback and accepts mixed channel energy", () => {
    const black = new Uint8Array(16);
    expect(dyeLooksAllBlack(dyeStatsFromRgba8(black))).toBe(true);

    const mixed = new Uint8Array([
      232, 8, 24, 255, 232, 8, 24, 255, 5, 5, 6, 255, 5, 5, 6, 255,
    ]);
    const stats = dyeStatsFromRgba8(mixed);
    expect(stats.filledFrac).toBeGreaterThan(0);
    expect(stats.meanEnergy).toBeGreaterThan(0.05);
    expect(dyeLooksAllBlack(stats)).toBe(false);
  });
});

describe("shade", () => {
  const crimson = hexToRgb(CRIMSON);
  const charcoal = hexToRgb(CHARCOAL);

  function slot(overrides: Partial<LiveMaterial> = {}): LiveMaterial {
    return {
      id: "slot",
      enabled: true,
      albedo: crimson,
      viscosity: 0.1,
      roughness: 0.5,
      metallic: 0,
      sheen: 0,
      glow: 0,
      ...overrides,
    };
  }

  function mixAt(conc: [number, number, number, number], looks: LiveMaterial[], contrast = 0.75): MixedLook {
    return mixLooks(conc, padLiveMaterials(looks), contrast);
  }

  it("mixes albedo by concentration and ignores disabled slots", () => {
    const mixed = mixAt([1, 1, 0, 0], [slot({ albedo: crimson }), slot({ albedo: charcoal, enabled: false })]);
    expect(mixed.albedo).toEqual(crimson);
    expect(mixed.height).toBe(1);
  });

  it("raises luma when glow is high", () => {
    const looks = [slot({ albedo: crimson, glow: 0 })];
    const dim = shadeLook(mixAt([1, 0, 0, 0], looks), [0, 0, 1]);
    const bright = shadeLook(mixAt([1, 0, 0, 0], [slot({ albedo: crimson, glow: 1 })]), [0, 0, 1]);
    expect(luma(bright)).toBeGreaterThan(luma(dim));
  });

  it("raises spec vs Lambert when metallic is high", () => {
    const lambert = shadeLook(mixAt([1, 0, 0, 0], [slot({ albedo: [0.5, 0.5, 0.5], metallic: 0, roughness: 0.1 })]), [0, 0, 1]);
    const metal = shadeLook(mixAt([1, 0, 0, 0], [slot({ albedo: [0.5, 0.5, 0.5], metallic: 1, roughness: 0.1 })]), [0, 0, 1]);
    expect(luma(metal)).toBeGreaterThan(luma(lambert));
  });

  it("tilts the fake normal toward the lower neighbor", () => {
    const n = heightNormal(1, 0.2, 1);
    expect(n[0]).toBeGreaterThan(0);
    expect(n[2]).toBeGreaterThan(0);
  });

  it("damps faster where viscous concentration is high", () => {
    const looks = padLiveMaterials([slot({ viscosity: 0.8 })]);
    const thin = viscosityDamp([0, 0, 0, 0], looks, 0.5, 0.1);
    const thick = viscosityDamp([1, 0, 0, 0], looks, 0.5, 0.1);
    expect(thick).toBeLessThan(thin);
    expect(thin).toBeLessThan(1);
  });
});

describe("colorTween", () => {
  it("triangle wave goes 0 → 1 → 0 over a period of 2", () => {
    expect(triangleWave(0)).toBe(0);
    expect(triangleWave(1)).toBe(1);
    expect(triangleWave(2)).toBe(0);
    expect(triangleWave(0.5)).toBeCloseTo(0.5);
    expect(triangleWave(1.5)).toBeCloseTo(0.5);
  });

  it("speed 0 freezes at endpoint A", () => {
    expect(tweenAmount(10, 0)).toBe(0);
    const live = tweenMaterials({ ...defaultConfig, colorTweenSpeed: 0 }, 100);
    expect(live.t).toBe(0);
    expect(live.slots[0]?.albedo).toEqual(hexToRgb(defaultConfig.materials[0]?.color ?? CRIMSON));
    expect(live.slots[1]?.albedo).toEqual(hexToRgb(defaultConfig.materials[1]?.color ?? CHARCOAL));
  });

  it("mixes A and B at the midpoint of the ping-pong", () => {
    const config = cloneConfig(defaultConfig);
    config.colorTweenSpeed = 1;
    config.materials[0] = { ...config.materials[0], color: "#000000", colorB: "#FFFFFF" };
    config.materials[1] = { ...config.materials[1], color: "#000000", colorB: "#808080" };
    const mid = tweenMaterials(config, 0.5);
    expect(mid.t).toBeCloseTo(0.5);
    expect(mid.slots[0]?.albedo).toEqual(mixRgb(hexToRgb("#000000"), hexToRgb("#FFFFFF"), 0.5));
    expect(mid.slots[1]?.albedo).toEqual(mixRgb(hexToRgb("#000000"), hexToRgb("#808080"), 0.5));
  });
});

describe("windForce", () => {
  it("streams east from a heading-0 station at its own location", () => {
    const force = windForceAt(0.5, 0.5, 1, [
      { uvX: 0.5, uvY: 0.5, heading: 0, speed: 1, spin: 0, radius: 0.2 },
    ], 1);
    expect(force[0]).toBeGreaterThan(0.9);
    expect(Math.abs(force[1])).toBeLessThan(0.05);
  });

  it("spins counterclockwise for positive vorticity at a point to the east", () => {
    const force = windForceAt(0.6, 0.5, 1, [
      { uvX: 0.5, uvY: 0.5, heading: 0, speed: 0, spin: 1, radius: 0.25 },
    ], 1);
    expect(force[1]).toBeGreaterThan(0);
  });

  it("scatters a bounded random field", () => {
    let t = 0;
    const random = () => {
      t += 0.173;
      return (t * 1.19) % 1;
    };
    const stations = scatterWindStations(9, random);
    expect(stations).toHaveLength(MAX_WIND_STATIONS);
    expect(stations.every((station) => station.uvX >= 0 && station.uvX <= 1)).toBe(true);
    expect(new Set(stations.map((station) => station.id)).size).toBe(stations.length);
  });
});

describe("wiggleMotion", () => {
  it("leaves timescale and noise scale alone when amount is 0", () => {
    const live = wiggleMotion({ ...defaultConfig, wiggleAmount: 0 }, 3.5);
    expect(live.noiseTime).toBe(defaultConfig.noiseTime);
    expect(live.noiseScale).toBe(defaultConfig.noiseScale);
  });

  it("modulates intensity from Perlin when amount is positive", () => {
    const base = { ...defaultConfig, wiggleAmount: 0.5, noiseTime: 0.5, noiseScale: 2 };
    const a = wiggleMotion(base, 1.25);
    const b = wiggleMotion(base, 4.8);
    expect(a.noiseTime).not.toBe(b.noiseTime);
    expect(a.noiseScale).not.toBe(b.noiseScale);
    expect(a.noiseTime).toBeGreaterThan(0);
    expect(a.noiseScale).toBeGreaterThanOrEqual(0.2);
    expect(perlin3(0.1, 0.2, 0.3)).not.toBe(perlin3(1.1, 2.2, 3.3));
  });
});

describe("drivers", () => {
  it("maps wave kinds into [0,1] and stubs stay at 0.5", () => {
    expect(wave01("sine", 0)).toBeCloseTo(0.5, 5);
    expect(wave01("sine", 0.25)).toBeCloseTo(1, 5);
    expect(wave01("sine", 0.75)).toBeCloseTo(0, 5);
    expect(wave01("triangle", 0)).toBeCloseTo(0, 5);
    expect(wave01("triangle", 0.5)).toBeCloseTo(1, 5);
    expect(wave01("saw", 0.25)).toBeCloseTo(0.25, 5);
    expect(wave01("square", 0.2)).toBe(0);
    expect(wave01("square", 0.7)).toBe(1);
    expect(wave01("mic", 12)).toBe(0.5);
    expect(wave01("camera", 3)).toBe(0.5);
    expect(wave01("tilt", 8)).toBe(0.5);
    expect(() => wave01("noise", 1.25)).not.toThrow();
  });

  it("evaluates an A-to-B sine tween", () => {
    const emitter = {
      id: "wave-1",
      name: "Wave",
      enabled: true,
      kind: "sine" as const,
      rate: 1,
      phase: 0.25,
      from: 2,
      to: 8,
      scale: 1,
    };
    expect(evaluateEmitter(emitter, 0)).toBeCloseTo(8, 5);
    expect(evaluateEmitter({ ...emitter, enabled: false }, 0)).toBe(2);
  });

  it("gets and sets nested numeric paths", () => {
    const config = cloneConfig(defaultConfig);
    expect(getPath(config, "vorticity")).toBe(config.vorticity);
    expect(setPath(config, "vorticity", 11)).toBe(true);
    expect(config.vorticity).toBe(11);
    const glowPath = `materials.${CRIMSON_MATERIAL_ID}.glow`;
    expect(setPath(config, glowPath, 0.4)).toBe(true);
    expect(getPath(config, glowPath)).toBe(0.4);
    expect(setPath(config, "materials.missing.glow", 0.2)).toBe(false);
    expect(getPath(config, "crimson")).toBeUndefined();
  });

  it("excludes reseed keys from the bindable registry", () => {
    const paths = BINDABLE_PATHS(defaultConfig).map((item) => item.path);
    expect(paths).toContain("vorticity");
    expect(paths).toContain(`materials.${CRIMSON_MATERIAL_ID}.glow`);
    expect(paths).not.toContain("simResolution");
    expect(paths).not.toContain("dyeResolution");
    expect(paths).not.toContain("pressureIterations");
    expect(paths).not.toContain("warmupSteps");
    expect(paths).not.toContain("viewZoom");
  });

  it("mixes driven values onto a cloned live config", () => {
    const base = cloneConfig(defaultConfig);
    base.vorticity = 4;
    base.valueEmitters = [
      {
        id: "wave-1",
        name: "Pulse",
        enabled: true,
        kind: "sine",
        rate: 1,
        phase: 0.25,
        from: 0,
        to: 20,
        scale: 1,
      },
    ];
    base.valueBindings = [{ id: "bind-1", emitterId: "wave-1", path: "vorticity", amount: 1 }];
    const live = applyDrivers(base, 0);
    expect(live.vorticity).toBeCloseTo(20, 5);
    expect(base.vorticity).toBe(4);
    expect(live.valueEmitters).not.toBe(base.valueEmitters);
  });

  it("mixes by binding amount instead of replacing the base", () => {
    const base = cloneConfig(defaultConfig);
    base.vorticity = 4;
    base.valueEmitters = [
      {
        id: "wave-1",
        name: "Pulse",
        enabled: true,
        kind: "sine",
        rate: 1,
        phase: 0.25,
        from: 0,
        to: 20,
        scale: 1,
      },
    ];
    base.valueBindings = [{ id: "bind-1", emitterId: "wave-1", path: "vorticity", amount: 0.5 }];
    expect(applyDrivers(base, 0).vorticity).toBeCloseTo(12, 5);
  });

  it("leaves base unchanged when the emitter is disabled or the path is not bindable", () => {
    const base = cloneConfig(defaultConfig);
    base.vorticity = 4;
    base.simResolution = 384;
    base.valueEmitters = [
      {
        id: "wave-1",
        name: "Pulse",
        enabled: false,
        kind: "sine",
        rate: 1,
        phase: 0.25,
        from: 0,
        to: 20,
        scale: 1,
      },
    ];
    base.valueBindings = [{ id: "bind-1", emitterId: "wave-1", path: "vorticity", amount: 1 }];
    expect(applyDrivers(base, 0).vorticity).toBe(4);
    base.valueEmitters[0] = { ...base.valueEmitters[0], enabled: true };
    base.valueBindings = [{ id: "bind-2", emitterId: "wave-1", path: "simResolution", amount: 1 }];
    expect(applyDrivers(base, 0).simResolution).toBe(384);
  });
});

describe("presets", () => {
  it("upserts by name while keeping a stable id", () => {
    let ids = 0;
    const createId = () => `id-${(ids += 1)}`;
    const first = upsertPresetInList([], " Calm Look ", defaultConfig, 100, createId);
    expect(first.preset.name).toBe("Calm Look");
    expect(first.preset.id).toBe("id-1");
    const second = upsertPresetInList(
      first.list,
      "calm look",
      { ...defaultConfig, vorticity: 12 },
      200,
      createId,
    );
    expect(second.list).toHaveLength(1);
    expect(second.preset.id).toBe("id-1");
    expect(second.preset.config.vorticity).toBe(12);
    expect(second.preset.updatedAt).toBe(200);
  });

  it("keeps the driver graph on save", () => {
    const config = cloneConfig(defaultConfig);
    config.valueEmitters = [
      {
        id: "wave-1",
        name: "Pulse",
        enabled: true,
        kind: "triangle",
        rate: 0.5,
        phase: 0.1,
        from: 0,
        to: 12,
        scale: 1,
      },
    ];
    config.valueBindings = [{ id: "bind-1", emitterId: "wave-1", path: "vorticity", amount: 0.4 }];
    const saved = upsertPresetInList([], "Driven", config, 1, () => "p-drive");
    expect(saved.preset.config.valueEmitters).toHaveLength(1);
    expect(saved.preset.config.valueEmitters[0]?.kind).toBe("triangle");
    expect(saved.preset.config.valueBindings).toEqual([
      { id: "bind-1", emitterId: "wave-1", path: "vorticity", amount: 0.4 },
    ]);
  });

  it("sanitizes bad entries and fills missing config fields", () => {
    const cleaned = sanitizePresetList([
      null,
      { id: "a", name: "  Ok  ", config: { vorticity: 999 } },
      { id: "b", name: "", config: defaultConfig },
      { id: "a", name: "Dup", config: defaultConfig },
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0]?.name).toBe("Ok");
    expect(cleaned[0]?.config.vorticity).toBeLessThanOrEqual(40);
    expect(cleaned[0]?.config.materials[0]?.color).toBe(defaultConfig.materials[0]?.color);
  });

  it("deletes by id", () => {
    const created = upsertPresetInList([], "One", defaultConfig, 1, () => "p1");
    const withTwo = upsertPresetInList(created.list, "Two", defaultConfig, 2, () => "p2");
    const next = deletePresetFromList(withTwo.list, "p1");
    expect(next.map((preset) => preset.id)).toEqual(["p2"]);
    expect(getPresetFromList(next, "p1")).toBeUndefined();
  });

  it("round-trips a pack through serialize and parse, keeping the driver graph", () => {
    const config = cloneConfig(defaultConfig);
    config.valueEmitters = [
      {
        id: "wave-1",
        name: "Pulse",
        enabled: true,
        kind: "saw",
        rate: 0.2,
        phase: 0,
        from: 1,
        to: 8,
        scale: 1,
      },
    ];
    config.valueBindings = [{ id: "bind-1", emitterId: "wave-1", path: "dyeInject", amount: 0.75 }];
    const saved = upsertPresetInList([], "Pack", config, 1, () => "p-pack");
    const document = serializePresetDocument(saved.list);
    expect(document.kind).toBe(PRESET_DOCUMENT_KIND);
    const parsed = parsePresetDocument(document);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.presets).toHaveLength(1);
      expect(parsed.presets[0]?.config.valueEmitters[0]?.kind).toBe("saw");
      expect(parsed.presets[0]?.config.valueBindings[0]?.path).toBe("dyeInject");
    }
  });

  it("rejects unknown kinds, non-objects, and truncated JSON", () => {
    expect(parsePresetDocument(null).ok).toBe(false);
    expect(parsePresetDocument({ kind: "other", presets: [] }).ok).toBe(false);
    const truncated = parsePresetJson('{"kind":"fluid-wallpaper.preset.v1","presets":');
    expect(truncated.ok).toBe(false);
  });

  it("merges imported presets by name, keeps ids, and caps the library", () => {
    const first = upsertPresetInList([], "Calm", { ...defaultConfig, vorticity: 3 }, 1, () => "keep-me");
    const incoming = upsertPresetInList([], "Calm", { ...defaultConfig, vorticity: 9 }, 2, () => "ignored");
    const second = upsertPresetInList([], "Other", defaultConfig, 3, () => "p-other");
    const merged = mergeImportedPresets(first.list, [...incoming.list, ...second.list], 4);
    expect(merged.find((preset) => preset.name === "Calm")?.id).toBe("keep-me");
    expect(merged.find((preset) => preset.name === "Calm")?.config.vorticity).toBe(9);
    expect(merged.some((preset) => preset.id === "p-other")).toBe(true);
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: `p-${i}`,
      name: `Look ${i}`,
      updatedAt: i,
      config: defaultConfig,
    }));
    expect(mergeImportedPresets([], many)).toHaveLength(MAX_PRESETS);
  });

  it("clamps garbage config fields on import the same as sanitizeConfig", () => {
    const parsed = parsePresetDocument({
      kind: PRESET_DOCUMENT_KIND,
      presets: [{ id: "x", name: "Wild", config: { vorticity: 999, simResolution: 12 } }],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.presets[0]?.config.vorticity).toBeLessThanOrEqual(40);
      expect(parsed.presets[0]?.config.simResolution).toBeGreaterThanOrEqual(128);
    }
  });
});

describe("panelLayout", () => {
  it("drops unknown keys and non-finite positions", () => {
    const layout = sanitizePanelLayout({
      dash: { left: 12.6, top: 40.2 },
      extra: { left: 1, top: 1 },
      perf: { left: Number.NaN, top: 8 },
      dashFab: { left: "12", top: 9 },
    });
    expect(layout).toEqual({ dash: { left: 13, top: 40 } });
  });

  it("keeps overlays on screen when the viewport shrinks", () => {
    expect(
      clampPanelPos(2000, 2000, { width: 420, height: 200 }, { width: 1280, height: 720 }),
    ).toEqual({ left: 852, top: 512 });
    expect(
      clampPanelPos(-40, -40, { width: 420, height: 200 }, { width: 1280, height: 720 }),
    ).toEqual({ left: 8, top: 8 });
    expect(
      clampPanelPos(-1000, -1000, { width: 800, height: 600 }, { width: 400, height: 300 }),
    ).toEqual({ left: -408, top: -308 });
  });
});
