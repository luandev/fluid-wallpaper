import { describe, expect, it } from "vitest";
import {
  LOG_BAND_COUNT,
  logBandEnergies,
  onsetUpdate,
  sampleLogBand,
} from "../src/inputs/audioMath";
import { cloneConfig, defaultConfig, sanitizeConfig } from "../src/app/config";
import { applyDrivers, evaluateEmitter } from "../src/app/drivers";

describe("log spectrum", () => {
  it("puts low FFT bins in bass and high bins in treble", () => {
    const bins = new Array(1024).fill(0);
    bins[2] = 255;
    bins[700] = 255;
    const bands = logBandEnergies(bins, 44100, 2048);
    expect(bands).toHaveLength(LOG_BAND_COUNT);
    expect(Math.max(...bands.slice(0, 8))).toBeGreaterThan(0);
    expect(Math.max(...bands.slice(24))).toBeGreaterThan(0);
  });

  it("interpolates a band pick in [0,1]", () => {
    const bands = [0, 0.5, 1];
    expect(sampleLogBand(bands, 0)).toBe(0);
    expect(sampleLogBand(bands, 1)).toBe(1);
    expect(sampleLogBand(bands, 0.5)).toBeCloseTo(0.5, 5);
  });
});

describe("beat pulse", () => {
  it("fires when energy jumps above the running average", () => {
    let average = 0.05;
    let pulse = 0;
    const quiet = onsetUpdate(0.04, average, pulse, 1 / 60);
    average = quiet.average;
    pulse = quiet.pulse;
    const hit = onsetUpdate(0.9, average, pulse, 1 / 60);
    expect(hit.pulse).toBeGreaterThan(0.5);
    const decayed = onsetUpdate(0.04, hit.average, hit.pulse, 0.5);
    expect(decayed.pulse).toBeLessThan(hit.pulse);
  });
});

describe("audio value emitters", () => {
  it("maps legacy mic to audioPulse and fills band", () => {
    const next = sanitizeConfig({
      valueEmitters: [
        { id: "wave-1", name: "Mic", kind: "mic", from: 0, to: 1 },
      ],
    });
    expect(next.valueEmitters[0]?.kind).toBe("audioPulse");
    expect(next.valueEmitters[0]?.band).toBe(0.15);
  });

  it("keeps silent audio at From when scale is 1", () => {
    const emitter = {
      id: "kick-1",
      name: "Kick",
      enabled: true,
      kind: "audioPulse" as const,
      rate: 0,
      phase: 0,
      from: 4250,
      to: 7200,
      scale: 1,
      band: 0.12,
    };
    expect(evaluateEmitter(emitter, 1)).toBeCloseTo(4250, 5);
    const loud = {
      bands: Array.from({ length: 32 }, () => 0),
      pulses: Array.from({ length: 32 }, () => 1),
    };
    expect(evaluateEmitter(emitter, 1, loud)).toBeCloseTo(7200, 5);
  });

  it("drives splatForce from an audio pulse frame", () => {
    const base = cloneConfig(defaultConfig);
    base.valueEmitters = [
      {
        id: "kick-1",
        name: "Kick",
        enabled: true,
        kind: "audioPulse",
        rate: 0,
        phase: 0,
        from: 4250,
        to: 7200,
        scale: 1,
        band: 0.12,
      },
    ];
    base.valueBindings = [
      { id: "bind-kick", emitterId: "kick-1", path: "splatForce", amount: 1 },
    ];
    const silent = applyDrivers(base, 0);
    expect(silent.splatForce).toBeCloseTo(4250, 5);
    const live = applyDrivers(base, 0, {
      bands: Array.from({ length: 32 }, () => 0),
      pulses: Array.from({ length: 32 }, () => 1),
    });
    expect(live.splatForce).toBeCloseTo(7200, 5);
    expect(base.splatForce).toBe(defaultConfig.splatForce);
  });
});
