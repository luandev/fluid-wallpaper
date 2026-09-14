import { describe, expect, it } from "vitest";
import {
  EcoController,
  ECO_LEVELS,
  ecoDisplay,
  ecoGrid,
} from "../src/quality/eco";
import { cloneConfig, defaultConfig } from "../src/app/config";
import {
  LiquidClock,
  LiquidQualityController,
} from "../src/quality/liquidQuality";

describe("ECO adaptation", () => {
  it("ignores a spike, then lowers resolution and speed on sustained overload", () => {
    const q = new EcoController();
    q.observe(0, 1, 33);
    for (let frame = 1; frame <= 60; frame++)
      q.observe(frame * 34, frame === 5 ? 200 : 1, 34);
    expect(q.level).toBe(0);
    for (let frame = 61; frame <= 150; frame++) q.observe(frame * 34, 50, 60);
    expect(q.level).toBe(1);
    expect(q.budget.speed).toBeLessThan(1);
    expect(q.budget.scale).toBeLessThan(1);
  });
  it("respects cooldown and floors, and recovers slowly without exceeding ECO", () => {
    const q = new EcoController();
    for (let time = 0; time <= 3000; time += 1000) q.observe(time, 100, 100);
    expect(q.level).toBe(1);
    q.observe(4000, 100, 100);
    q.observe(5000, 100, 100);
    expect(q.level).toBe(1);
    for (let time = 6000; time <= 30000; time += 1000)
      q.observe(time, 100, 100);
    expect(q.level).toBe(ECO_LEVELS.length - 1);
    for (let time = 31000; time <= 37000; time += 1000) q.observe(time, 1, 50);
    expect(q.level).toBe(3);
    for (let time = 38000; time <= 100000; time += 1000)
      q.observe(time, 1, 1000 / q.budget.fps);
    expect(q.level).toBe(0);
  });
  it("uses pacing when GPU work is asynchronous and excludes suspension history", () => {
    const q = new EcoController();
    q.observe(0, 1, 80);
    q.observe(1000, 1, 80);
    q.suspend();
    q.observe(100000, 1, 33);
    q.observe(101000, 1, 33);
    expect(q.level).toBe(0);
    q.observe(102000, 1, 80);
    q.observe(103000, 1, 80);
    expect(q.level).toBe(1);
    expect(q.observe(NaN, 50, 60)).toBe(false);
  });
  it("keeps authored settings intact and caps pixels while preserving aspect", () => {
    const config = cloneConfig(defaultConfig),
      before = cloneConfig(config);
    expect(ecoGrid(config, 0)).toEqual({
      simResolution: 192,
      dyeResolution: 384,
      pressureIterations: 20,
    });
    expect(ecoGrid(config, 3)).toEqual({
      simResolution: 64,
      dyeResolution: 128,
      pressureIterations: 20,
    });
    expect(config).toEqual(before);
    const size = ecoDisplay(3840, 2160, 65536);
    expect(size.pixelWidth * size.pixelHeight).toBeLessThanOrEqual(65536);
    expect(size.pixelWidth / size.pixelHeight).toBeCloseTo(3840 / 2160, 1);
    expect(ecoDisplay(100, 50, 65536)).toEqual({
      pixelWidth: 100,
      pixelHeight: 50,
    });
  });
  it("adapts liquid ECO while balanced stays fixed and accounts for intentional slowdown", () => {
    const q = new LiquidQualityController();
    q.setPolicy("eco");
    for (let time = 0; time <= 15000; time += 1000)
      q.observe(time, 100, true, q.fps);
    expect(q.cellBudget).toBeLessThan(16384);
    expect(q.fps).toBe(20);
    expect(q.simulationSpeed).toBe(0.5);
    q.setPolicy("balanced");
    for (let time = 16000; time <= 25000; time += 1000)
      expect(q.observe(time, 100, true, 30)).toBe(false);
    expect(q.simulationSpeed).toBe(1);
    const clock = new LiquidClock();
    for (let i = 0; i < 60; i++) {
      clock.add(1 / 60, 0.5);
      clock.advance(1 / 30, () => {});
    }
    expect(clock.simulated).toBeCloseTo(0.5);
    expect(clock.dropped).toBeCloseTo(0.5);
  });
});
