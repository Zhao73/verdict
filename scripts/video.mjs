#!/usr/bin/env node
// The Verdict demo video, rendered from the real app: every terminal frame is the full-screen
// app drawing the fictional ACME demo (no network, no model calls), set in a 1920×1080 stage
// with animated titles. Frames are captured one by one in Chromium and encoded with ffmpeg.
//
//   PLAYWRIGHT_CORE=…/playwright-core/index.mjs CHROMIUM_PATH=…/chrome FFMPEG=…/ffmpeg \
//   VERDICT_FONTS=…/node_modules/@fontsource \
//   node scripts/video.mjs [--lang en|zh-CN] [--out assets/verdict-demo.mp4] [--gif assets/demo.gif]

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.VERDICT_HOME = mkdtempSync(join(tmpdir(), "verdict-video-"));
process.env.FORCE_COLOR = "1";
process.env.VERDICT_TRUECOLOR = "1";
process.env.VERDICT_OFFLINE = "1";

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const LANG = opt("lang", "en");
const root = fileURLToPath(new URL("..", import.meta.url));
const OUT = opt("out", join(root, "assets", LANG === "en" ? "verdict-demo.mp4" : `verdict-demo.${LANG}.mp4`));
const GIF = opt("gif", null);
const FPS = Number(opt("fps", 30));
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const { research } = await import("../src/engine/pipeline.mjs");
const { createDemoBackend, DEMO_ACTIVITY } = await import("../src/demo.mjs");
const { App } = await import("../src/tui/app.mjs");
const { toSvg } = await import("./lib/term-svg.mjs");

// ---------------------------------------------------------------- words

const COPY = {
  en: {
    question: "is it cheap right now?",
    title: "A research desk for any stock",
    subtitle: "Terminal · Claude Code · Codex · open source",
    scenes: {
      ask: ["Ask like you'd ask a colleague", "A ticker, a company name or a question, in any language"],
      desks: ["Live data in seconds.<br>Four analysts in parallel.", "Business · expectations · news · risk, each with about five targeted searches"],
      debate: ["Bull vs bear,<br>then one clear verdict", "The portfolio manager writes while you watch"],
      verdict: ["A verdict you can act on", "Rating · value range · price levels · <b>Verdict Score</b>"],
      methods: ["Code does the math", "Priced-in growth · options-implied move · <b>odds of reaching each price</b> · payoff · evidence balance · audit"],
      evidence: ["Every claim has a receipt", "Open any finding to see its sources. Missing data is listed, never guessed."],
      languages: ["11 languages.<br>Any market.", "腾讯 · 贵州茅台 · トヨタ · 삼성전자 · SAP.DE · BHP.AX"],
    },
    plugin: ["Also a Claude Code &amp; Codex plugin", "Four subagents research in parallel, a bundled MCP server supplies live data"],
    try: "Try it offline in 10 seconds",
    star: "★ Star on GitHub",
    fine: "Fictional demo company · AI-generated research, not investment advice",
  },
  "zh-CN": {
    question: "现在贵吗？",
    title: "随手可用的股票研究台",
    socialTitle: "随手可用的<br>股票研究台",
    subtitle: "终端 · Claude Code · Codex · 开源",
    scenes: {
      ask: ["像问同事一样提问", "股票代码、公司名或一个问题，用什么语言都行"],
      desks: ["几秒拿到实时数据<br>四位分析师并行研究", "业务 · 预期 · 新闻 · 风险，每位约 5 次针对性搜索"],
      debate: ["多空辩论<br>然后给出一个明确结论", "投资经理边写边显示"],
      verdict: ["拿来就能用的结论", "评级 · 估值区间 · 价格条件 · <b>Verdict 评分</b>"],
      methods: ["计算交给代码", "价格隐含的增长 · 期权隐含波动 · <b>触及各价位的概率</b> · 收益风险 · 证据天平 · 一致性检查"],
      evidence: ["每条结论都有出处", "打开任意一条发现就能看到来源；缺的数据明确列出，绝不靠猜"],
      languages: ["11 种语言<br>全球市场", "腾讯 · 贵州茅台 · トヨタ · 삼성전자 · SAP.DE · BHP.AX"],
    },
    plugin: ["也是 Claude Code 与 Codex 插件", "4 个子代理并行研究，自带的 MCP 服务器提供实时数据"],
    try: "10 秒离线试用",
    star: "★ 在 GitHub 上点个 Star",
    fine: "演示使用虚构公司 · AI 生成的研究，不构成投资建议",
  },
};
const W = COPY[LANG] || COPY.en;

// ---------------------------------------------------------------- the runs

const backend = createDemoBackend({ speed: 0 });
const run = await research({ symbol: "ACME", backend, language: LANG, question: W.question });
const other = await research({ symbol: "ACME", backend, language: LANG === "zh-CN" ? "en" : "zh-CN" });
const CLOCK = () => new Date(new Date().setHours(14, 32, 0, 0));
const COLS = 104;
const ROWS = 30;

function makeApp(language) {
  const app = new App({ cols: COLS, rows: ROWS, language, backendFactory: async () => backend, clock: CLOCK });
  app.stdin = {};
  app.backend = backend;
  app.write = () => {};
  return app;
}
const app = makeApp(LANG);
const later = app.history.filter((r) => r.run_id === run.run_id);
app.history = [];

const frameOf = (a, title = "verdict") => toSvg(Array.from({ length: ROWS }, (_, y) => a.buildFrame().rowString(y)), { cols: COLS, title });

// Live progress on a simulated clock (seconds): when each task starts and ends.
const PLAN = {
  business: [2, 48, "bullish"], street: [2, 58, "mixed"], news: [2, 38, "bullish"], risk: [2, 55, "mixed"],
  bull: [58, 66], bear: [58, 68], decision: [68, 86, "Overweight"],
};
const job = { id: "ACME-demo", symbol: "ACME", question: W.question, mode: "deep", language: LANG, tasks: {}, stage: "desks" };
app.jobs.set(job.id, job);

function jobAt(T) {
  const now = Date.now();
  job.startedAt = now - T * 1000;
  job.snapshot = T >= 1.5 ? run.snapshot : null;
  const acts = DEMO_ACTIVITY[LANG] || DEMO_ACTIVITY.en;
  for (const [id, [start, end, note]] of Object.entries(PLAN)) {
    if (T < start) job.tasks[id] = { status: "waiting" };
    else if (T < end) {
      const list = acts[id] || [];
      const activity = list.length ? list[Math.min(list.length - 1, Math.floor(((T - start) / (end - start)) * list.length))] : "";
      job.tasks[id] = { status: "running", startedAt: now - (T - start) * 1000, activity };
    } else job.tasks[id] = { status: "done", startedAt: now - (T - start) * 1000, endedAt: now - (T - end) * 1000, note };
  }
  const [ds, de] = PLAN.decision;
  const text = run.decision.conclusion;
  job.draft = T > ds + 1 ? text.slice(0, Math.round(text.length * Math.min(1, (T - ds - 1) / (de - ds - 3)))) : null;
  job.draftRating = T > ds + 2 ? run.decision.rating : null;
}

// How far to scroll the verdict so the price levels sit near the top.
function scrollTo(a, pattern) {
  for (let s = 0; s < 60; s += 1) {
    a.scroll = s;
    const rows = Array.from({ length: 8 }, (_, y) => a.buildFrame().plain().split("\n")[y + 3] || "");
    if (rows.some((r) => pattern.test(r))) return s;
  }
  return 0;
}

// ---------------------------------------------------------------- the timeline

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => 1 - (1 - clamp(x)) ** 3;
const S = W.scenes;
const levelsLabel = LANG === "zh-CN" ? /价格条件/ : /PRICE LEVELS/;

const scenes = [
  { id: "intro", dur: 3.2, card: "intro" },
  {
    id: "ask", dur: 4.2, caption: S.ask,
    term(t) {
      const q = `ACME ${W.question}`;
      app.setView({ type: "welcome" });
      app.focus = "input";
      app.input.set(q.slice(0, Math.floor(clamp((t - 0.6) / 2.6) * [...q].length)));
      return frameOf(app);
    },
  },
  {
    id: "desks", dur: 8, caption: S.desks,
    term(t) {
      app.input.set("");
      app.focus = "main";
      app.setView({ type: "job", id: job.id }, "live");
      app.tick = Math.floor(t * 12);
      jobAt(clamp(t / 7.6) * 58);
      return frameOf(app);
    },
  },
  {
    id: "debate", dur: 5.5, caption: S.debate,
    term(t) {
      app.tick = Math.floor(t * 12);
      jobAt(58 + clamp(t / 5.2) * 29);
      return frameOf(app);
    },
  },
  {
    id: "verdict", dur: 5, caption: S.verdict, zoom: [1, 1.05, 0.1, 0.25],
    term() {
      app.jobs.delete(job.id);
      app.input.set("");
      app.history = later;
      app.openRun(run.run_id);
      app.focus = "main";
      app.scroll = 0;
      return frameOf(app);
    },
  },
  {
    id: "methods", dur: 6.5, caption: S.methods, zoom: [1.02, 1.07, 0.1, 0.62],
    term(t) {
      const target = this.target ??= scrollTo(app, levelsLabel);
      app.scroll = Math.round(ease(clamp((t - 0.3) / 1.4)) * target);
      return frameOf(app);
    },
  },
  {
    id: "evidence", dur: 4.8, caption: S.evidence,
    term(t) {
      app.scroll = 0;
      if (app.tab !== "evidence") app.switchTab(2);
      const sel = Math.min(2, Math.floor(t / 0.7));
      app.evidence = { selected: sel, open: t > 2.4 ? sel : -1 };
      return frameOf(app);
    },
  },
  {
    id: "languages", dur: 5.6, caption: S.languages,
    term(t) {
      const steps = [["run", LANG === "zh-CN" ? "en" : "zh-CN"], ["welcome", "ja"], ["welcome", "ko"], ["welcome", "de"], ["welcome", "fr"], ["welcome", "zh-TW"]];
      const [kind, lang] = steps[Math.min(steps.length - 1, Math.floor(t / 0.95))];
      const key = `${kind}:${lang}`;
      this.apps ||= {};
      if (!this.apps[key]) {
        const a = makeApp(lang);
        a.history = a.history.filter((r) => r.run_id === (kind === "run" ? other.run_id : run.run_id));
        if (kind === "run") a.openRun(other.run_id);
        a.focus = "main";
        this.apps[key] = a;
      }
      return frameOf(this.apps[key]);
    },
  },
  { id: "plugin", dur: 4, card: "plugin" },
  { id: "end", dur: 5, card: "end" },
];

let at = 0;
for (const s of scenes) {
  s.start = at;
  at += s.dur;
}
const TOTAL = at;

// ---------------------------------------------------------------- the stage

const fonts = process.env.VERDICT_FONTS && existsSync(process.env.VERDICT_FONTS) ? process.env.VERDICT_FONTS : null;
const fontCss = fonts
  ? ["inter/400.css", "inter/600.css", "inter/800.css", "jetbrains-mono/400.css", "jetbrains-mono/700.css", "noto-sans-sc/400.css", "noto-sans-sc/700.css", "noto-sans-jp/400.css", "noto-sans-kr/400.css"]
    .map((f) => `<link rel="stylesheet" href="${pathToFileURL(join(fonts, f)).href}">`).join("\n")
  : "";
const logo = readFileSync(join(root, "assets", "logo.svg"), "utf8");
const cjk = "'Noto Sans SC','Noto Sans JP','Noto Sans KR','WenQuanYi Zen Hei'";
const page = `<!doctype html><html><head><meta charset="utf-8">${fontCss}
<style>
@font-face{font-family:BoxDraw;src:local("DejaVu Sans Mono");unicode-range:U+2500-259F,U+25A0-25FF}
@font-face{font-family:BoxDraw;font-weight:700;src:local("DejaVu Sans Mono Bold");unicode-range:U+2500-259F,U+25A0-25FF}
*{box-sizing:border-box;margin:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:#0a0c10}
body{font-family:Inter,${cjk},sans-serif;color:#e8e4da}
#bg{position:absolute;inset:0;background:radial-gradient(1200px 700px at 78% 45%,rgba(245,165,36,.10),transparent 60%),radial-gradient(900px 600px at 10% 90%,rgba(88,166,255,.07),transparent 60%),#0a0c10}
#grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(circle at 60% 50%,#000 30%,transparent 80%)}
#brand{position:absolute;left:96px;top:64px;display:flex;align-items:center;gap:14px;font:800 22px/1 Inter,sans-serif;letter-spacing:.28em;color:#f5a524}
#brand svg{width:34px;height:34px}
#cap{position:absolute;left:96px;top:0;width:560px;height:1080px;display:flex;flex-direction:column;justify-content:center;gap:26px}
#cap h1{font-weight:800;font-size:58px;line-height:1.08;letter-spacing:-.02em;color:#fff}
#cap p{font-size:25px;line-height:1.45;color:#a9a59b}
#cap p b{color:#f5a524;font-weight:600}
#cap .bar{width:64px;height:5px;border-radius:3px;background:#f5a524}
#term{position:absolute;left:690px;top:0;width:1150px;height:1080px;display:flex;align-items:center}
#term .win{width:1150px;filter:drop-shadow(0 40px 80px rgba(0,0,0,.55)) drop-shadow(0 0 1px rgba(245,165,36,.4));transform-origin:50% 50%}
#term .win svg{width:100%;height:auto;display:block}
#term text{font-family:BoxDraw,'JetBrains Mono',${cjk},monospace}
.card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;text-align:center}
.card .mark svg{width:148px;height:148px}
.card .word{font:800 132px/1 Inter,sans-serif;letter-spacing:.2em;color:#f5a524;padding-left:.2em}
.card .tag{font-size:40px;font-weight:600;color:#fff}
.card .sub{font-size:26px;color:#a9a59b;letter-spacing:.04em}
.code{font:500 30px/1.5 'JetBrains Mono',monospace;background:#12151c;border:1px solid #2a2f3a;border-radius:14px;padding:22px 34px;color:#e8e4da;text-align:left}
.code .p{color:#f5a524}.code .c{color:#6b675f}
.row{display:flex;gap:28px;align-items:stretch}
.pill{display:inline-block;font:700 18px/1 Inter,sans-serif;letter-spacing:.14em;color:#1b1400;background:#f5a524;border-radius:999px;padding:9px 16px;margin-bottom:14px}
.star{font:700 34px/1 Inter,sans-serif;color:#1b1400;background:#f5a524;border-radius:16px;padding:20px 36px}
.url{font:600 32px/1 'JetBrains Mono',monospace;color:#fff}
.fine{position:absolute;bottom:42px;left:0;right:0;text-align:center;font-size:18px;color:#6b675f}
#prog{position:absolute;left:96px;bottom:64px;display:flex;gap:10px}
#prog i{width:26px;height:4px;border-radius:2px;background:#2a2f3a}
#prog i.on{background:#f5a524}
</style></head><body>
<div id="bg"></div><div id="grid"></div>
<div id="brand">${logo}<span>VERDICT</span></div>
<div id="cap"><div class="bar"></div><h1></h1><p></p></div>
<div id="term"><div class="win"></div></div>
<div class="card" id="intro"><div class="mark">${logo}</div><div class="word">VERDICT</div><div class="tag">${W.title}</div><div class="sub">${W.subtitle}</div></div>
<div class="card" id="plugin"><div class="tag" style="font-size:52px">${W.plugin[0]}</div><div class="sub">${W.plugin[1]}</div>
  <div class="row"><div class="code"><div class="pill">CLAUDE CODE</div><div><span class="p">›</span> /plugin marketplace add Zhao73/verdict</div><div><span class="p">›</span> /plugin install verdict@verdict</div><div><span class="p">›</span> /verdict NVDA</div></div>
  <div class="code"><div class="pill">CODEX</div><div><span class="p">$</span> codex plugin marketplace add Zhao73/verdict</div><div><span class="p">$</span> codex plugin add verdict@verdict</div><div><span class="p">›</span> @verdict research NVDA</div></div></div></div>
<div class="card" id="end"><div class="mark">${logo}</div><div class="word" style="font-size:96px">VERDICT</div>
  <div class="code"><div><span class="p">$</span> npm install -g github:Zhao73/verdict</div><div><span class="p">$</span> verdict demo <span class="c">  # ${W.try}</span></div></div>
  <div class="url">github.com/Zhao73/verdict</div><div class="star">${W.star}</div><div class="fine">${W.fine}</div></div>
<div id="prog">${scenes.filter((s) => s.caption).map(() => "<i></i>").join("")}</div>
<script>
const $ = (s) => document.querySelector(s);
let termKey = null;
window.frame = (f) => {
  $("#cap").style.opacity = f.cap.a;
  $("#cap").style.transform = "translateY(" + f.cap.y + "px)";
  if (f.cap.h !== null) { $("#cap h1").innerHTML = f.cap.h; $("#cap p").innerHTML = f.cap.p; }
  $("#cap .bar").style.width = (64 * f.cap.bar) + "px";
  if (f.term !== null && f.termKey !== termKey) { $("#term .win").innerHTML = f.term; termKey = f.termKey; }
  $("#term").style.opacity = f.termA;
  $("#term .win").style.transform = "translateX(" + f.termX + "px) scale(" + f.zoom.s + ")";
  $("#term .win").style.transformOrigin = (f.zoom.ox * 100) + "% " + (f.zoom.oy * 100) + "%";
  for (const id of ["intro", "plugin", "end"]) {
    const c = f.cards[id] || { a: 0, s: 1 };
    const el = document.getElementById(id);
    el.style.opacity = c.a;
    el.style.transform = "scale(" + c.s + ")";
  }
  $("#brand").style.opacity = f.brandA;
  $("#prog").style.opacity = f.brandA;
  document.querySelectorAll("#prog i").forEach((el, i) => el.classList.toggle("on", i <= f.step));
};
</script></body></html>`;

// ---------------------------------------------------------------- render

function state(t) {
  const s = scenes.find((x) => t >= x.start && t < x.start + x.dur) || scenes.at(-1);
  const lt = t - s.start;
  const inA = ease(lt / 0.5);
  const outA = 1 - ease((lt - (s.dur - 0.4)) / 0.4);
  const f = { cap: { a: 0, y: 0, h: null, p: "", bar: 0 }, term: null, termKey: null, termA: 0, termX: 0, zoom: { s: 1, ox: 0.5, oy: 0.5 }, cards: {}, brandA: 0, step: -1 };
  if (s.card) {
    const last = s === scenes.at(-1);
    f.cards[s.card] = { a: Math.min(inA, last ? 1 : outA), s: 0.96 + 0.04 * ease(lt / 0.8) };
    return f;
  }
  f.brandA = 1;
  f.step = scenes.filter((x) => x.caption).indexOf(s);
  f.cap = { a: Math.min(inA, outA), y: 18 * (1 - inA), h: s.caption[0], p: s.caption[1], bar: ease(lt / 0.8) };
  const first = scenes.findIndex((x) => x.term);
  const lastTerm = scenes.findLastIndex((x) => x.term);
  const idx = scenes.indexOf(s);
  f.termA = idx === first ? ease(lt / 0.6) : idx === lastTerm ? outA : 1;
  f.termX = idx === first ? 40 * (1 - ease(lt / 0.8)) : 0;
  if (s.zoom) {
    const [z0, z1, ox, oy] = s.zoom;
    const k = ease((lt - 0.3) / Math.max(0.5, s.dur - 1.2));
    f.zoom = { s: z0 + (z1 - z0) * k, ox, oy };
  }
  f.term = s.term.call(s, lt);
  return f;
}

const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--disable-background-networking", "--font-render-hinting=none"] });
const tab = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const stagePath = join(process.env.VERDICT_HOME, "stage.html");
writeFileSync(stagePath, page);
await tab.goto(pathToFileURL(stagePath).href);
await tab.evaluate(() => document.fonts.ready);

// --social out.png: the 1280×640 link preview (GitHub social card, X, WeChat) — the verdict scene
// with the tagline as its caption.
const social = opt("social", null);
if (social) {
  const verdictScene = scenes.find((x) => x.id === "verdict");
  const f = state(verdictScene.start + 2);
  f.cap = { a: 1, y: 0, h: W.socialTitle || W.title, p: LANG === "zh-CN" ? "11 种语言 · 全球市场 · 终端、Claude Code 与 Codex · 开源" : "11 languages · any market · terminal, Claude Code &amp; Codex · open source", bar: 1 };
  f.step = -1;
  f.termKey = 1;
  await tab.evaluate((x) => { window.frame(x); document.querySelector("#prog").style.display = "none"; }, f);
  const raw = join(process.env.VERDICT_HOME, "social-raw.png");
  await tab.screenshot({ path: raw, clip: { x: 0, y: 40, width: 1920, height: 960 } });
  await browser.close();
  await new Promise((resolve, reject) => {
    const g = spawn(FFMPEG, ["-y", "-loglevel", "error", "-i", raw, "-vf", "scale=1280:640:flags=lanczos", social], { stdio: "inherit" });
    g.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
  console.log(social);
  process.exit(0);
}

// --stills 1,9,20: write PNGs of those moments instead of a video (for reviewing a cut).
const stills = opt("stills", null);
let lastSvg = null;
let termId = 0;
const frameAt = async (t) => {
  const f = state(t);
  if (f.term === lastSvg) f.term = null;
  else {
    lastSvg = f.term;
    termId += 1;
  }
  f.termKey = termId;
  await tab.evaluate((x) => window.frame(x), f);
};
if (stills) {
  for (const t of stills.split(",").map(Number)) {
    await frameAt(t);
    await tab.screenshot({ path: join(opt("dir", tmpdir()), `still-${LANG}-${t}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const ff = spawn(FFMPEG, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], { stdio: ["pipe", "inherit", "inherit"] });
const frames = Math.round(TOTAL * FPS);
for (let i = 0; i < frames; i += 1) {
  await frameAt(i / FPS);
  const png = await tab.screenshot({ type: "png" });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % (FPS * 5) === 0) process.stdout.write(`\r${LANG}: ${Math.round((i / frames) * 100)}%`);
}
ff.stdin.end();
await new Promise((resolve, reject) => ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));
await browser.close();
console.log(`\r${OUT} · ${TOTAL.toFixed(1)}s · ${frames} frames`);

// A README-sized GIF of the product part (no title cards).
if (GIF) {
  const from = scenes.find((s) => s.id === "ask").start;
  const to = scenes.find((s) => s.id === "languages").start + scenes.find((s) => s.id === "languages").dur;
  await new Promise((resolve, reject) => {
    const g = spawn(FFMPEG, ["-y", "-loglevel", "error", "-ss", String(from), "-t", String(to - from), "-i", OUT, "-vf", "fps=8,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle", GIF], { stdio: "inherit" });
    g.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg gif exited ${code}`))));
  });
  console.log(GIF);
}
