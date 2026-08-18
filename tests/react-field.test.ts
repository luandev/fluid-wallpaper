import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/app/config";
import { resolveFieldConfig, resolveFieldOptions } from "../src/react/resolveFieldOptions";

describe("FluidField options", () => {
  it("defaults dashboard, perf, and persist off", () => {
    expect(resolveFieldOptions()).toEqual({ dashboard: false, perf: false, persist: false });
  });

  it("treats missing flags as off", () => {
    expect(resolveFieldOptions({ dashboard: true })).toEqual({
      dashboard: true,
      perf: false,
      persist: false,
    });
  });

  it("clones defaults when no patch is given", () => {
    const next = resolveFieldConfig();
    expect(next).toEqual(defaultConfig);
    expect(next).not.toBe(defaultConfig);
  });

  it("merges a scalar onto defaults without wiping emitters", () => {
    const next = resolveFieldConfig({ vorticity: 12 });
    expect(next.vorticity).toBe(12);
    expect(next.emitters).toHaveLength(defaultConfig.emitters.length);
    expect(next.windStations).toHaveLength(defaultConfig.windStations.length);
  });
});
