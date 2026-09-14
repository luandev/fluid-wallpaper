import { describe, expect, it } from "vitest";
import { sanitizeConfig, defaultConfig } from "../src/app/config";

// Backgrounds share portable config sanitization and must reject arbitrary CSS.
describe("background config", () => {
  it("round-trips colors and rejects invalid imported values", () => {
    const valid = sanitizeConfig({...defaultConfig, backgroundMode:"gradient", backgroundColor:"#ff8800", backgroundColorB:"#001122"});
    expect(valid.backgroundMode).toBe("gradient");
    expect(valid.backgroundColor).toBe("#ff8800");
    const bad = sanitizeConfig({...valid, backgroundMode:"url(x)", backgroundColor:"red;display:none"});
    expect(bad.backgroundMode).toBe(defaultConfig.backgroundMode);
    expect(bad.backgroundColor).toBe(defaultConfig.backgroundColor);
  });
});
