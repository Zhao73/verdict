#!/usr/bin/env node
import { main } from "../src/cli/main.mjs";

main().catch((error) => {
  if (process.stdout.isTTY) process.stdout.write("\x1b[?25h");
  process.stderr.write(`\x1b[31m✕\x1b[39m ${error.message}\n`);
  process.exit(1);
});
