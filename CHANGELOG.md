# Changelog

All notable changes to Verdict. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/).

## [1.1.1] — 2026-09-25

### Added
- A product motion video in English and Chinese (`assets/verdict-motion.mp4`,
  `assets/verdict-motion.zh-CN.mp4`, 60 fps). It is one continuous shape: a button becomes the
  input, a data card, four analyst tiles, a bull-vs-bear bar, the verdict, a price chart, the
  methods, a language pill, the terminal and the Star button. Every move is a damped spring.
  `npm run motion` rebuilds it from the offline demo's numbers.
- A 50-second walkthrough of the real app in English and Chinese (`assets/verdict-demo.mp4`,
  `assets/verdict-demo.zh-CN.mp4`) and README GIFs. Every terminal frame is the real app drawing
  the offline demo. `npm run video` rebuilds them.
- The offline demo speaks Simplified Chinese: `verdict demo --lang zh-CN` gives the same
  fictional company and the same numbers, in Chinese.
- A landing page for GitHub Pages (`site/`, `npm run site`) with the videos and two full sample
  reports, deployed by `.github/workflows/pages.yml` once Pages is enabled.
- Social preview cards (`assets/social.png`, `assets/social.zh-CN.png`) and README badges.

### Fixed
- Chinese and Japanese text no longer wraps with closing punctuation (，。、) at the start of a
  line.

## [1.1.0] — 2026-09-24

### Verdict methods
- Seven deterministic methods, documented in [docs/METHODS.md](https://github.com/Zhao73/verdict/blob/main/docs/METHODS.md):
  - **Priced-in growth** (reverse DCF): the 10-year growth the price already assumes, compared
    with what the business delivered.
  - **Options-implied move**, and whether options price more movement than recent history.
  - **Tape**: trend × volatility regime, with a note on what it means for timing.
  - **Zone odds**: the chance the price reaches each price level within three months.
  - **Payoff**: scenario-weighted value and reward-to-risk.
  - **Evidence balance**: each desk finding weighted by source quality.
  - **Audit**: flags a rating that contradicts the evidence, the value or the payoff.
- The **Verdict Score** (0-100) combines them to cross-check the rating. It never changes the
  rating.
- The snapshot methods are citable (`method:implied_growth` …) and steer the desks and the
  portfolio manager.
- The audit results appear in the verdict card, the app, the Markdown and HTML reports and the
  plugin summary.
- `verdict methods NVDA` shows the snapshot methods without any model call.

### Language
- Pick the language once: `verdict lang` (numbered list), `verdict lang ja`, or `/lang` in the
  app (a picker). The choice is saved and used everywhere; `auto` follows what you type and
  `--lang` overrides it for one run.
- `verdict config` saves defaults for the engine and the research depth.
- On Windows, the system language is detected without `LANG`.

### Windows
- Claude Code is found as `claude.exe` (native installer, even when it is not on `PATH`) or
  through the npm `claude.cmd` shim, with no shell involved.
- Windows Terminal and VS Code get truecolor. `verdict doctor` shows platform tips.
- A Windows path in `VERDICT_BACKEND_MODULE` loads correctly, and `--json` output stays clean when
  a run fails.
- CI runs Windows on Node 20, 22 and 24, plus an end-to-end offline demo on every platform.
- Releases are published automatically from `CHANGELOG.md` when the version changes.

## [1.0.0] — 2026-09-24

First release.

### Research
- Snapshot first: price, history, SEC fundamentals and multiples, filings, options, dated news and
  eight deterministic method screens, fetched in parallel with a disk cache before any model runs.
- Deep research (default): four research desks in parallel → bull and bear in parallel →
  portfolio-manager verdict. `--fast`: one research pass → verdict.
- Question-aware: earnings, valuation, short-term trade, long-term and risk questions steer what
  the desks prioritise and how the verdict is framed.
- The verdict streams while it is written.
- Every model output has a JSON schema; code resolves citations, fixes dates and orders the value
  range instead of re-running models. Reports are assembled by code.
- Honest outcomes: `complete`, `degraded` (a task failed) or `incomplete` (no verdict).

### Terminal
- Full-screen app (`verdict`): watchlist and history sidebar, Verdict / Report / Evidence / Ask
  tabs, command bar, background research, mouse wheel, CJK-aware layout.
- Stream mode (`verdict NVDA`): live progress redrawn in place, then the verdict card and
  follow-up questions.
- `compare`, `watch` with alerts (price zones, new filings, stale verdicts), `track` record,
  `ask`, `history`, `show`, `export`, data commands, `doctor`, and an offline `demo`.
- Self-contained HTML report with a price chart, value range and price levels.

### Languages & markets
- Eleven interface and report languages — English, 简体中文, 繁體中文, 日本語, 한국어, Français,
  Deutsch, Español, Italiano, Português, Nederlands — detected from what you type or `--lang`;
  models write in any requested language.
- Markets beyond the US: China A-shares, Hong Kong, Taiwan, Japan, Korea, UK, the main European
  exchanges, Australia, New Zealand, Canada, India, Singapore, Brazil and Mexico.
- Local codes (`600519`, `0700`, `2330`, `7203`, `005930`), exchange prefixes (`SH600519`,
  `TYO:7203`, `LON:SHEL`) and company names in local languages (腾讯, トヨタ, 삼성전자, LVMH).
- Local-language news editions, market-specific filing sources and accounting standards in the
  research brief, and London pence quotes converted to pounds.

### Engines
- `api`: official Anthropic SDK — streaming, server-side web search and fetch, a strict submit
  tool, `pause_turn` resumption and refusal handling.
- `claude`: headless Claude Code (`claude -p`) with `--json-schema`, using your Claude Code login.

### Plugins
- Claude Code plugin: `/verdict` skill, `desk` and `advocate` subagents in parallel, and a
  dependency-free MCP server for the snapshot, task instructions, validation and reports.
- Codex plugin sharing the same skill and server.

[1.0.0]: https://github.com/Zhao73/verdict/releases/tag/v1.0.0
