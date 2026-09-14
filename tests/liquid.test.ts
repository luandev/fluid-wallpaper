import { describe, expect, it } from "vitest";
import {
  assertSameCarriers,
  defaultLiquidScene,
  validateLiquidScene,
} from "../src/app/liquidScene";
import { absorptionColor } from "../src/render/absorption";
import {
  areaGrid,
  carrierRates,
  conservativeResample,
  transportLimit,
} from "../src/sim/liquidNumerics";
import {
  LiquidClock,
  LiquidQualityController,
} from "../src/quality/liquidQuality";

describe("two-liquid scene boundary", () => {
  it("clones and rejects legacy, nonfinite, and duplicate identities", () => {
    const a = defaultLiquidScene(),
      b = validateLiquidScene(a);
    b.phases[0].absorption[0] = 10;
    expect(a.phases[0].absorption[0]).not.toBe(10);
    expect(() => validateLiquidScene({})).toThrow();
    a.phases[0].viscosity = NaN;
    expect(() => validateLiquidScene(a)).toThrow();
    const c = defaultLiquidScene();
    c.pigments[1].id = c.pigments[0].id;
    expect(() => validateLiquidScene(c)).toThrow();
  });
  it("permits palette changes but rejects slot reordering and carrier changes", () => {
    const a = defaultLiquidScene(),
      b = defaultLiquidScene();
    b.pigments[0].absorption = [1, 2, 3];
    expect(() => assertSameCarriers(a, b)).not.toThrow();
    b.pigments[0].phase = 1;
    expect(() => assertSameCarriers(a, b)).toThrow();
  });
});
describe("absorption", () => {
  it("reveals substrate on dilution and preserves equal optical depth", () => {
    const a = defaultLiquidScene();
    a.phases.forEach((p) => {
      p.absorption = [0, 0, 0];
    });
    const dilute = absorptionColor(a, 0.5, [0.1, 0, 0, 0]),
      dense = absorptionColor(a, 0.5, [1, 0, 0, 0]);
    dilute.forEach((v, i) => expect(v).toBeGreaterThan(dense[i]));
    const b = structuredClone(a);
    b.opticalPath = 2;
    absorptionColor(b, 0.5, [0.5, 0, 0, 0]).forEach((v, i) =>
      expect(v).toBeCloseTo(dense[i], 12),
    );
    absorptionColor(a, 0.5, [0, 0, 0, 0]).forEach((v, i) =>
      expect(v).toBeCloseTo(a.substrate[i], 12),
    );
  });
});
describe("conservative numerical reference", () => {
  it("preserves each channel mean and bounds across noninteger portrait resizes", () => {
    const a = Float32Array.from(
      { length: 7 * 9 * 4 },
      (_, i) => ((i * 13) % 31) / 31,
    );
    const b = conservativeResample(a, 7, 9, 13, 5, 4);
    for (let c = 0; c < 4; c++) {
      const sum = (v: Float32Array) =>
        v.reduce((s, n, i) => s + (i % 4 === c ? n : 0), 0) / (v.length / 4);
      expect(sum(b)).toBeCloseTo(sum(a), 6);
    }
    expect(Math.min(...b)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...b)).toBeLessThanOrEqual(1);
  });
  it("has nonnegative directional carrier coefficients under the stated speed limit", () => {
    for (const speed of [0, 0.01, 0.1]) {
      const { gamma, dt, epsilon } = transportLimit(1 / 64, speed);
      expect(epsilon).toBe(1 / 64);
      expect(dt).toBeLessThanOrEqual((1 / 64) ** 2 / (4 * gamma * epsilon));
      for (const p of [0, 0.2, 1])
        for (const n of [-1, 0, 1]) {
          const rates = carrierRates(speed, p, 1 - p, n, -n, gamma);
          rates.forEach((r) => expect(r).toBeGreaterThanOrEqual(0));
        }
    }
  });
  it("keeps area within budget for portrait and landscape", () => {
    for (const aspect of [0.2, 0.5, 1, 2, 5]) {
      const g = areaGrid(65536, aspect);
      expect(g.width * g.height).toBeLessThanOrEqual(65536);
    }
  });
});
describe("runtime policy", () => {
  it("simulates equal time and source dose at 30/60/120 Hz without overload", () => {
    for (const hz of [30, 60, 120]) {
      const clock = new LiquidClock();
      let dose = 0;
      for (let i = 0; i < 60 * hz; i++) {
        clock.add(1 / hz);
        clock.advance(1 / 30, (dt) => {
          dose += dt * 0.2;
        });
      }
      expect(clock.simulated).toBeCloseTo(60, 7);
      expect(dose).toBeCloseTo(12, 7);
      expect(clock.dropped).toBe(0);
    }
  });
  it("caps substeps and reports discarded time; suspend prevents catchup", () => {
    const clock = new LiquidClock();
    clock.add(1);
    expect(clock.advance(0.001, () => {})).toBe(4);
    expect(clock.dropped).toBeGreaterThan(0.8);
    clock.suspend();
    expect(clock.pending).toBe(0);
  });
  it("downgrades after two windows with cooldown; upgrades require ten comfortable windows", () => {
    const q = new LiquidQualityController();
    expect(q.observe(0, 30, false, 30)).toBe(false);
    expect(q.observe(1000, 30, false, 30)).toBe(true);
    expect(q.tier).toBe(3);
    for (let t = 2000; t <= 5000; t += 1000)
      expect(q.observe(t, 30, false, 30)).toBe(false);
    expect(q.observe(6000, 30, false, 30)).toBe(true);
    expect(q.tier).toBe(2);
    for (let t = 7000; t <= 15000; t += 1000)
      expect(q.observe(t, 1, false, 30)).toBe(false);
    expect(q.observe(16000, 1, false, 30)).toBe(true);
    expect(q.tier).toBe(3);
    q.setPolicy("eco");
    expect(q.observe(20000, 100, true, 30)).toBe(false);
  });
  it("uses a window percentile instead of a single cheap final frame", () => {
    const q = new LiquidQualityController();
    for (let second = 0; second < 2; second++) {
      for (let frame = 0; frame < 30; frame++)
        q.sample(frame < 20 ? 40 : 1, false);
      q.observe(second * 1000, 1, false, 30);
    }
    expect(q.tier).toBe(3);
  });
});
