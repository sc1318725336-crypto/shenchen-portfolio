import { spawn } from "node:child_process";
import { resolve } from "node:path";

const env = { ...process.env };

for (const key of [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy",
]) {
  delete env[key];
}

env.NO_PROXY = [env.NO_PROXY, "api.cloudflare.com", ".pages.dev"]
  .filter(Boolean)
  .join(",");

const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
const args = [
  wrangler,
  "pages",
  "deploy",
  "dist",
  "--project-name=shenchen-portfolio",
  "--branch=main",
];

const child = spawn(process.execPath, args, {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});