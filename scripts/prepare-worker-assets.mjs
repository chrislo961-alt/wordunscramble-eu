#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const out = join(root, "dist", "client");
rmSync(join(root, "dist"), { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const excluded = new Set([
  ".git",
  ".github",
  "dist",
  "node_modules",
  ".wrangler",
  "functions",
  "scripts",
  "README.md",
  "indexnow.config.json",
  "wrangler.jsonc",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "_headers",
  "_redirects",
]);

for (const name of readdirSync(root)) {
  if (excluded.has(name)) continue;
  const source = join(root, name);
  if (!existsSync(source)) continue;
  const target = join(out, name);
  cpSync(source, target, { recursive: statSync(source).isDirectory() });
}

console.log(`Prepared Workers static assets in ${out}`);
