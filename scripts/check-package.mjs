import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2] || "package-dist");
const manifest = JSON.parse(await readFile(`${root}/package.json`, "utf8"));
assert(
  !manifest.private &&
    !manifest.scripts &&
    !manifest.dependencies &&
    !manifest.engines,
);
for (const target of Object.values(manifest.exports)) {
  for (const file of typeof target === "string"
    ? [target]
    : Object.values(target))
    await access(resolve(root, file));
}
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      assert.equal(entry.name, dir === root ? "types" : entry.name);
      await check(file);
    } else {
      assert(
        /\.(js|css|ts)$/.test(file) ||
          ["package.json", "README.md", "LICENSE"].includes(entry.name),
        `Unexpected package file: ${file}`,
      );
      if (/\.(js|ts)$/.test(file)) {
        const text = await readFile(file, "utf8");
        assert(!text.includes("?raw"), `Raw shader import: ${file}`);
        assert(
          !/from\s*["'][^"']*\/src\//.test(text),
          `Source import: ${file}`,
        );
        if (file.endsWith(".d.ts")) {
          for (const match of text.matchAll(
            /(?:from\s*|import\s*\(?)["'](\.[^"']+)["']/g,
          )) {
            const target = resolve(file, "..", match[1]).replace(
              /\.js$/i,
              ".d.ts",
            );
            await access(target).catch(() => {
              throw new Error(
                `Missing declaration import ${match[1]} from ${file}`,
              );
            });
          }
        }
      }
    }
  }
}
await check(root);
// Walk the standalone graph: it may only load packaged relative JavaScript.
const visited = new Set();
async function graph(file) {
  if (visited.has(file)) return;
  visited.add(file);
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(
    /(?:from\s*|import\s*\(?)["']([^"']+)["']/g,
  )) {
    assert(match[1].startsWith("."), `Standalone dependency: ${match[1]}`);
    await graph(resolve(file, "..", match[1]));
  }
}
await graph(`${root}/element-auto.js`);
await graph(`${root}/hero-auto.js`);
for (const name of ["config", "engine", "element", "hero", "presets", "react"])
  await import(pathToFileURL(`${root}/${name}.js`).href);
console.log(
  "Package exports, allowlist, standalone graph and SSR imports passed.",
);
