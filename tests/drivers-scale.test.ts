import { describe, expect, it } from "vitest";
import { cloneConfig, sanitizeConfig } from "../src/app/config";
import { evaluateEmitter, wave01 } from "../src/app/drivers";

function sineEmitter(overrides: Partial<Parameters<typeof evaluateEmitter>[0]> = {}) {
  return {
    id: "wave-1",
    name: "Wave",
    enabled: true,
    kind: "sine" as const,
    rate: 1,
    phase: 0.25,
    from: 2,
    to: 8,
    scale: 1,
    ...overrides,
  };
}

describe("value emitter scale", () => {
  it("matches the old A-to-B tween when scale is 1", () => {
    const emitter = sineEmitter({ scale: 1 });
    const w = wave01("sine", 0.25);
    expect(evaluateEmitter(emitter, 0)).toBeCloseTo(emitter.from + (emitter.to - emitter.from) * w, 5);
    expect(evaluateEmitter(emitter, 0)).toBeCloseTo(8, 5);
  });

  it("sits at the From/To midpoint when scale is 0", () => {
    expect(evaluateEmitter(sineEmitter({ scale: 0 }), 0)).toBeCloseTo(5, 5);
  });

  it("fills missing scale as 1 on sanitize", () => {
    const next = sanitizeConfig({
      valueEmitters: [{ id: "wave-1", name: "Pulse", kind: "sine", from: 0, to: 4 }],
    });
    expect(next.valueEmitters[0]?.scale).toBe(1);
    expect(cloneConfig(next).valueEmitters[0]?.scale).toBe(1);
  });
});
