#!/usr/bin/env node
// Write the sample reports in examples/ from the offline demo (a fictional company), so anyone can
// read what Verdict produces on GitHub without installing it.

import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.VERDICT_HOME = mkdtempSync(join(tmpdir(), "verdict-examples-"));
process.env.VERDICT_OFFLINE = "1";

const out = fileURLToPath(new URL("../examples/", import.meta.url));
const { research, reportPath, htmlPath } = await import("../src/engine/pipeline.mjs");
const { createDemoBackend } = await import("../src/demo.mjs");

mkdirSync(out, { recursive: true });
const backend = createDemoBackend({ speed: 0 });
for (const language of ["en", "zh-CN"]) {
  const run = await research({ symbol: "ACME", backend, language });
  // The demo runs instantly; a real run's timing would only confuse a reader here.
  const md = readFileSync(reportPath(run.run_id), "utf8").replace(/ · (elapsed|用时|elapsed time) \d+s/, "");
  writeFileSync(join(out, `ACME.${language}.md`), md);
  copyFileSync(htmlPath(run.run_id), join(out, `ACME.${language}.html`));
}
console.log(out);
