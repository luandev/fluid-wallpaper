import assert from "node:assert/strict";

/** Validate a tag and extract exactly one nonempty version section. */
export function releasePolicy(version, ref, changelog) {
  const number = "(?:0|[1-9]\\d*)";
  const identifier = "(?:0|[1-9]\\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)";
  assert(
    new RegExp(
      `^${number}\\.${number}\\.${number}(?:-${identifier}(?:\\.${identifier})*)?$`,
    ).test(version),
    "Invalid version (build metadata is not supported)",
  );
  assert.equal(ref, `refs/tags/v${version}`, "Tag must match package version");
  const parts = changelog.replace(/\r\n/g, "\n").split(`## ${version}\n`);
  assert.equal(
    parts.length,
    2,
    "Expected exactly one version changelog section",
  );
  const notes = parts[1].split(/\n## /)[0].trim();
  assert(notes, "Missing version changelog notes");
  return { notes, channel: version.includes("-") ? "next" : "latest" };
}
