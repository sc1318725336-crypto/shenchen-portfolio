import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");

const rootFiles = [
  "index.html",
  "project.html",
  "douyin-page.html",
  "styles.css",
  "script.js",
  "project.css",
  "project.js",
  "brand-project.css",
  "event-archive.css",
  "event-project.css",
  "space-project.css",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of rootFiles) {
  await cp(resolve(root, file), resolve(output, file));
}

for (const directory of ["assets", "projects"]) {
  await cp(resolve(root, directory), resolve(output, directory), {
    recursive: true,
  });
}

const requiredOutputs = [
  "assets/lanyard-plugin.js",
  "assets/logo-dome-plugin.js",
];

for (const file of requiredOutputs) {
  const info = await stat(resolve(output, file));
  if (!info.isFile() || info.size === 0) {
    throw new Error(`Missing required build output: ${file}`);
  }
}

console.log(`Cloudflare Pages output created at ${output}`);