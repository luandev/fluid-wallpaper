import { describe, expect, it } from "vitest";
import { clampNumberField, fineStep } from "../src/ui/rangeMath";

describe("range math", () => {
  it("uses a tenth of the coarse step", () => {
    expect(fineStep(0.1)).toBeCloseTo(0.01, 10);
    expect(fineStep(1)).toBe(0.1);
  });

  it("clamps typed numbers and keeps the fallback on NaN", () => {
    expect(clampNumberField("0.4", 0, 1, 0.2)).toBe(0.4);
    expect(clampNumberField("9", 0, 1, 0.2)).toBe(1);
    expect(clampNumberField("nope", 0, 1, 0.2)).toBe(0.2);
  });
});
