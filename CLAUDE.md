# Verdict — notes for Claude

Verdict is stock research with a clear verdict, delivered three ways from one engine:
the terminal (`bin/verdict.mjs`), a Claude Code plugin and a Codex plugin.

## Layout

- `src/engine/` — research engine, no dependencies: `data` (keyless sources), `snapshot`,
  `prompts` + `schemas` + `normalize`, `pipeline` (terminal runs), `host` (plugin runs where the
  host does the model work), `compare`, `watch` (watchlist + track record), `intent`, `target`.
- `src/models/` — engines: `api.mjs` (the only file that imports `@anthropic-ai/sdk`) and
  `claude.mjs` (headless `claude -p`).
- `src/tui/` — full-screen app: `theme`, `frame` (cell buffer + row diffs), `keys`, `views`, `app`.
- `src/cli/` — commands and stream mode. `src/render/` — Markdown, HTML and terminal rendering.
- `src/mcp/server.mjs` — plugin MCP server. `skills/verdict/`, `agents/` — plugin surface.
- `src/demo.mjs` — offline demo on a fictional company (also used by `npm run shots`).
- `src/i18n/` — one file per language (en, zh-CN, zh-TW, ja, ko, fr, de, es, it, pt, nl) with
  report labels, UI strings, desk titles, ratings and stances; `index.mjs` normalizes codes and
  detects the language from what people type. A new label must be added to every locale (tested).
- `src/engine/markets.mjs` + `names.mjs` — exchange suffixes, local codes (600519, 0700, 2330,
  7203, 005930, TYO:7203), currencies, filing sources, news editions and local company names.
- `src/engine/methods.mjs` — the Verdict methods (docs/METHODS.md): priced-in growth, options-implied
  move and tape in the snapshot (`method:<id>`); zone odds, payoff, evidence balance, audit and the
  Verdict Score in `run.analytics`, computed by `finishRun`. `src/render/methods.mjs` turns them
  into display rows for every surface. They audit the verdict; they never change the rating.
- `src/engine/config.mjs` — saved settings (`~/.verdict/config.json`: language, engine, mode) behind
  `verdict lang`, `verdict config` and `/lang`. Flags win over settings; a saved language wins over
  detection.
- Windows is a first-class target: no shell spawning (`resolveClaude` finds claude.exe or reads
  the claude.cmd shim), paths through `node:path`, CI runs Windows on Node 20/22/24.

## Rules

- Research flow: snapshot → desks (`business`, `street`, `news`, `risk`; fast: `all`) → `bull` +
  `bear` → `decision`. Every model output has a schema; normalization fixes, it does not retry.
- Reports are assembled by code. States: `complete`, `degraded`, `incomplete` — never present the
  last two as complete. Never fill missing data from memory.
- Anything the MCP server imports must stay dependency-free (plugins run without `npm install`).
- Runtime data lives in `~/.verdict/` (`VERDICT_HOME`); never commit it.
- Screenshots and examples use the fictional ACME demo, never invented numbers for real companies.
- Before committing: `npm test` (offline). Regenerate README images with `npm run shots`.
