import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { releasePolicy } from "./release-policy.mjs";

const mode = process.argv[2];
const manifest = JSON.parse(
  await readFile("package-dist/package.json", "utf8"),
);
const version = manifest.version;
const tag = `v${version}`;
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (mode === "validate") {
  const policy = releasePolicy(
    version,
    process.env.GITHUB_REF,
    await readFile("CHANGELOG.md", "utf8"),
  );
  assert.equal(git("rev-parse", `${tag}^{commit}`), git("rev-parse", "HEAD"));
  git("merge-base", "--is-ancestor", "HEAD", "origin/main");
  await writeFile("release-notes.md", policy.notes + "\n");
} else if (mode === "publish") {
  const tarball = process.argv[3];
  const bytes = await readFile(tarball);
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  const response = await fetch(
    `https://registry.npmjs.org/${manifest.name}/${version}`,
  );
  if (response.ok) {
    assert.equal(
      (await response.json()).dist.integrity,
      integrity,
      "Published artifact differs; never overwrite a version",
    );
    console.log(
      "Identical version already published; completing GitHub release.",
    );
  } else {
    assert.equal(response.status, 404, "Registry lookup failed");
    execFileSync(
      "npm",
      [
        "publish",
        tarball,
        "--access",
        "public",
        "--tag",
        version.includes("-") ? "next" : "latest",
      ],
      { stdio: "inherit" },
    );
  }
  await writeFile(
    `${tarball}.sha256`,
    `${createHash("sha256").update(bytes).digest("hex")}  ${tarball}\n`,
  );
} else throw new Error("Expected validate or publish");
