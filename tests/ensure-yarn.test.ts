import { describe, expect, it } from "vitest";
import {
  assertYarn,
  isYarnUserAgent,
  yarnRequiredMessage,
} from "../scripts/ensure-yarn.js";

describe("isYarnUserAgent", () => {
  it("accepts Yarn Classic and Berry user agents", () => {
    expect(isYarnUserAgent("yarn/1.22.22 npm/? node/v24.15.0 win32 x64")).toBe(true);
    expect(isYarnUserAgent("yarn/4.9.2 npm/? node/v24.15.0 win32 x64")).toBe(true);
  });

  it("rejects npm, pnpm, and bun", () => {
    expect(isYarnUserAgent("npm/10.9.2 node/v24.15.0 win32 x64")).toBe(false);
    expect(isYarnUserAgent("pnpm/9.12.0 npm/? node/v24.15.0 win32 x64")).toBe(false);
    expect(isYarnUserAgent("bun/1.2.0 npm/? node/v24.15.0 win32 x64")).toBe(false);
    expect(isYarnUserAgent("")).toBe(false);
  });
});

describe("assertYarn", () => {
  it("throws the no-npm message for npm", () => {
    expect(() => assertYarn("npm/10.9.2 node/v24.15.0")).toThrow(yarnRequiredMessage());
  });

  it("allows Yarn", () => {
    expect(() => assertYarn("yarn/1.22.22 npm/? node/v24.15.0")).not.toThrow();
  });
});
