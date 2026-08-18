import { describe, expect, it } from "vitest";
import { RESEED_KEYS, controlSchema } from "../src/app/config";

describe("field help", () => {
  it("gives every controlSchema row a non-empty help string", () => {
    for (const control of controlSchema) {
      expect(control.help.trim().length).toBeGreaterThan(8);
    }
  });

  it("keeps reseed keys out of bindable help paths", () => {
    expect(RESEED_KEYS.has("simResolution")).toBe(true);
    expect(controlSchema.find((control) => control.key === "simResolution")?.help).toMatch(/rebuild/i);
  });
});
