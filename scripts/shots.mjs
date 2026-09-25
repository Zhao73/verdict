#!/usr/bin/env node
// Regenerate README images from the real renderers: the full-screen app and the stream-mode card
// become SVGs (ANSI → SVG); the HTML report and the icon become PNGs when playwright-core and a
// Chromium are available. Uses the fictional ACME demo — no network, no model calls.

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.VERDICT_HOME = mkdtempSync(join(tmpdir(), "verdict-shots-"));
process.env.FORCE_COLOR = "1";
process.env.VERDICT_TRUECOLOR = "1";
process.env.VERDICT_OFFLINE = "1";

const root = fileURLToPath(new URL("..", import.meta.url));
const assets = join(root, "assets");
const { research, htmlPath } = await import("../src/engine/pipeline.mjs");
const { createDemoBackend } = await import("../src/demo.mjs");
const { addWatch } = await import("../src/engine/watch.mjs");
const { App } = await import("../src/tui/app.mjs");
const { verdictLines, liveLines } = await import("../src/tui/views.mjs");
const { toSvg } = await import("./lib/term-svg.mjs");

const backend = createDemoBackend({ speed: 0 });
const run = await research({ symbol: "ACME", backend, question: "" });
addWatch("ACME");

// 1. full-screen app, verdict tab
const clock = () => new Date("2026-09-24T14:32:00");
const app = new App({ cols: 118, rows: 40, language: "en", backendFactory: async () => backend, clock });
app.quotes.set("ACME", run.snapshot.quote);
app.stdin = {};
app.backend = backend;
app.openRun(run.run_id);
app.focus = "main";
let f = app.buildFrame();
writeFileSync(join(assets, "app.svg"), toSvg(Array.from({ length: f.h }, (_, y) => f.rowString(y)), { cols: f.w, title: "verdict" }));

// 2. full-screen app, evidence tab with a finding opened
app.switchTab(2);
app.evidence = { selected: 1, open: 1 };
f = app.buildFrame();
writeFileSync(join(assets, "evidence.svg"), toSvg(Array.from({ length: f.h }, (_, y) => f.rowString(y)), { cols: f.w, title: "verdict — evidence" }));

// 3. live research mid-run (stream mode)
const t0 = Date.now() - 83_000;
const job = {
  symbol: "ACME", mode: "deep", language: "en", startedAt: t0, cost: 0.61, snapshot: run.snapshot,
  tasks: {
    business: { status: "done", startedAt: t0, endedAt: t0 + 64_000, note: "bullish" },
    street: { status: "done", startedAt: t0, endedAt: t0 + 71_000, note: "mixed" },
    news: { status: "done", startedAt: t0, endedAt: t0 + 52_000, note: "bullish" },
    risk: { status: "done", startedAt: t0, endedAt: t0 + 69_000, note: "mixed" },
    bull: { status: "done", startedAt: t0 + 71_000, endedAt: t0 + 80_000 },
    bear: { status: "done", startedAt: t0 + 71_000, endedAt: t0 + 82_000 },
    decision: { status: "running", startedAt: t0 + 82_000, activity: "" },
  },
  draft: run.decision.conclusion.slice(0, 190),
  draftRating: "Overweight",
};
const live = liveLines(job, 100, { tick: 3 }).map((l) => ` ${l}`);
const head = `\x1b[38;2;27;20;0;48;2;245;165;36;1m ◆ VERDICT \x1b[0m \x1b[38;2;139;135;128mACME · deep · claude sonnet/opus · en\x1b[0m`;
writeFileSync(join(assets, "live.svg"), toSvg([head, "", ...live], { cols: 104, title: "verdict ACME" }));

// 4. stream-mode verdict card
const card = verdictLines(run, 100).map((l) => ` ${l}`);
writeFileSync(join(assets, "card.svg"), toSvg(card.slice(0, 44), { cols: 104, title: "verdict ACME — result" }));

// 5. the Verdict methods: score, price levels with odds, and the method rows
const plainOf = (l) => l.replace(/\x1b\[[0-9;]*m/g, "");
const at = (re) => card.findIndex((l) => re.test(plainOf(l)));
const scoreRow = at(/Verdict Score/);
const levelsRow = at(/PRICE LEVELS/);
const bullRow = at(/BULL CASE/);
writeFileSync(join(assets, "methods.svg"), toSvg([card[0], "", card[scoreRow], "", ...card.slice(levelsRow, bullRow - 1)], { cols: 104, title: "verdict ACME — Verdict methods" }));

// 6. the language picker (/lang)
const picker = new App({ cols: 100, rows: 22, language: "en", backendFactory: async () => backend, clock });
picker.stdin = {};
await picker.command("/lang");
for (let i = 0; i < 4; i += 1) picker.handleKey({ name: "down" });
f = picker.buildFrame();
writeFileSync(join(assets, "language.svg"), toSvg(Array.from({ length: f.h }, (_, y) => f.rowString(y)), { cols: f.w, title: "verdict — /lang" }));

// 7. PNGs: HTML report and icon (optional)
try {
  const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 960, height: 1400 }, deviceScaleFactor: 2, colorScheme: "dark" });
  await page.goto(`file://${htmlPath(run.run_id)}`);
  await page.screenshot({ path: join(assets, "report.png"), clip: { x: 0, y: 0, width: 960, height: 1250 } });
  await page.setViewportSize({ width: 512, height: 512 });
  await page.goto(`file://${join(assets, "logo.svg")}`);
  await page.screenshot({ path: join(assets, "icon.png"), omitBackground: true, clip: { x: 0, y: 0, width: 512, height: 512 } });
  await browser.close();
  console.log("png: report.png icon.png");
} catch (error) {
  console.log(`png skipped: ${error.message.split("\n")[0]}`);
}
console.log("svg: app.svg evidence.svg live.svg card.svg methods.svg language.svg");
