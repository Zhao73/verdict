#!/usr/bin/env node
// Build the GitHub Pages site into _site/: the landing page, the demo videos and two full sample
// reports rendered from the offline demo (a fictional company — no network, no model calls).

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

process.env.VERDICT_HOME = mkdtempSync(join(tmpdir(), "verdict-site-"));
process.env.VERDICT_OFFLINE = "1";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = resolve(root, process.argv[2] || "_site");
const { research, htmlPath } = await import("../src/engine/pipeline.mjs");
const { createDemoBackend } = await import("../src/demo.mjs");

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "reports"), { recursive: true });
copyFileSync(join(root, "site", "index.html"), join(out, "index.html"));
for (const f of ["logo.svg", "icon.png", "social.png", "social.zh-CN.png", "verdict-demo.mp4", "verdict-demo.zh-CN.mp4", "verdict-motion.mp4", "verdict-motion.zh-CN.mp4"]) {
  const src = join(root, "assets", f);
  if (existsSync(src)) copyFileSync(src, join(out, f));
  else console.log(`skipped ${f} (not in assets/)`);
}
const backend = createDemoBackend({ speed: 0 });
for (const language of ["en", "zh-CN"]) {
  const run = await research({ symbol: "ACME", backend, language });
  copyFileSync(htmlPath(run.run_id), join(out, "reports", `acme.${language}.html`));
}
console.log(out);
