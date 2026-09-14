import { describe, expect, it } from "vitest";
import { releasePolicy } from "../scripts/release-policy.mjs";

describe("release policy", () => {
  it("routes previews and stable versions and extracts only their notes", () => {
    expect(releasePolicy("0.1.0-next.0", "refs/tags/v0.1.0-next.0", "# Log\r\n## 0.1.0-next.0\r\nPreview\r\n## 0.0.1\r\nOld")).toEqual({ channel: "next", notes: "Preview" });
    expect(releasePolicy("1.0.0", "refs/tags/v1.0.0", "## 1.0.0\nStable").channel).toBe("latest");
  });
  it("rejects mismatched tags and non-tag refs", () => {
    for (const ref of ["refs/heads/main", "refs/tags/v0.2.0", "v0.1.0"]) expect(() => releasePolicy("0.1.0", ref, "## 0.1.0\nNotes")).toThrow();
  });
  it("rejects ambiguous versions and missing or duplicate release notes", () => {
    for (const version of ["01.0.0", "1.0.0-next.01", "1.0.0+build", "1.0", "1.0.0-"]) expect(() => releasePolicy(version, `refs/tags/v${version}`, `## ${version}\nNotes`)).toThrow();
    for (const notes of ["# Empty", "## 1.0.0\n\n", "## 1.0.0\nOne\n## 1.0.0\nTwo"]) expect(() => releasePolicy("1.0.0", "refs/tags/v1.0.0", notes)).toThrow();
  });
});
