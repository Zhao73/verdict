#!/usr/bin/env node
// Verdict product motion video: one shape that never cuts. A dot becomes a button, the button an
// input, the input a data card, the card four analyst tiles, the tiles a bull-vs-bear bar, the bar
// the verdict, then a chart, the methods, a language pill, the terminal app and finally the Star
// button. Every move is a damped spring (it overshoots a little and settles), computed per frame
// so the capture is deterministic. The numbers come from the offline demo (a fictional company).
//
//   PLAYWRIGHT_CORE=… CHROMIUM_PATH=… FFMPEG=… VERDICT_FONTS=…/@fontsource \
//   node scripts/motion.mjs [--lang en|zh-CN] [--fps 60] [--out assets/verdict-motion.mp4] [--stills 3,12 --dir /tmp]

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.VERDICT_HOME = mkdtempSync(join(tmpdir(), "verdict-motion-"));
process.env.FORCE_COLOR = "1";
process.env.VERDICT_TRUECOLOR = "1";
process.env.VERDICT_OFFLINE = "1";

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const LANG = opt("lang", "en");
const FPS = Number(opt("fps", 60));
const root = fileURLToPath(new URL("..", import.meta.url));
const OUT = opt("out", join(root, "assets", LANG === "en" ? "verdict-motion.mp4" : `verdict-motion.${LANG}.mp4`));
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const { research } = await import("../src/engine/pipeline.mjs");
const { createDemoBackend } = await import("../src/demo.mjs");
const { App } = await import("../src/tui/app.mjs");
const { toSvg } = await import("./lib/term-svg.mjs");

// ---------------------------------------------------------------- data from the demo run

const backend = createDemoBackend({ speed: 0 });
const run = await research({ symbol: "ACME", backend, language: LANG });
const snap = run.snapshot;
const an = run.analytics;
const me = snap.methods;
const app = new App({ cols: 104, rows: 30, language: LANG, backendFactory: async () => backend, clock: () => new Date(new Date().setHours(14, 32, 0, 0)) });
app.stdin = {};
app.backend = backend;
app.history = app.history.filter((r) => r.run_id === run.run_id);
app.openRun(run.run_id);
app.focus = "main";
const termSvg = toSvg(Array.from({ length: 30 }, (_, y) => app.buildFrame().rowString(y)), { cols: 104, title: "verdict" });

const odds = Object.fromEntries(an.zone_odds.zones.map((z) => [z.range, z.probability]));
const DATA = {
  price: snap.quote.price,
  change: snap.quote.change_pct,
  pe: snap.fundamentals.ratios.pe_ttm,
  rev: snap.fundamentals.ratios.revenue_growth_pct,
  fcf: (snap.fundamentals.metrics.free_cash_flow.value / 1e9).toFixed(1),
  rsi: snap.technicals.rsi14,
  series: snap.series.map((p) => p[1]),
  val: run.decision.valuation,
  score: an.score.total,
  ig: me.implied_growth.implied_growth_pct,
  hist: me.implied_growth.history_pct,
  move: me.implied_range.near.move_pct,
  days: me.implied_range.near.days,
  pay: an.payoff.expected_return_pct,
  rr: an.payoff.reward_to_risk.toFixed(1),
  ev: an.evidence.score,
  odds: { avoid: odds["> 215"], start: odds["175-195"], add: odds["< 160"] },
};

// ---------------------------------------------------------------- words

const T = {
  en: {
    font: "Inter",
    h: [
      ["Meet Verdict", "A research desk for any stock"],
      ["Ask like you'd ask a colleague", "A ticker, a company name or a question, in any language"],
      ["Live data in seconds", "Prices, filings, fundamentals, options and dated news, fetched in parallel"],
      ["Four analysts. In parallel.", "Business · expectations · news · risk"],
      ["Bull vs bear", "The strongest case on each side, argued from the record"],
      ["One clear verdict", "Rating · confidence · Verdict Score"],
      ["Price levels, with odds", "How likely the stock is to reach each zone within 3 months"],
      ["Code does the math", "Seven deterministic methods audit every verdict"],
      ["11 languages. Any market.", ""],
      ["Terminal · Claude Code · Codex", "A full-screen app, or plugins with parallel subagents"],
      ["Open source. Try it in 10 seconds.", ""],
    ],
    query: "ACME  is it cheap right now?",
    company: "Acme Robotics",
    fictional: "fictional demo",
    stats: [`P/E ${DATA.pe}`, `Revenue +${DATA.rev}%`, `FCF $${DATA.fcf}B`, `RSI ${DATA.rsi}`],
    desks: ["Business & earnings", "Expectations & valuation", "News & catalysts", "Positioning & risk"],
    acts: [["search: Q2 segment revenue", "read: 10-Q", "search: call transcript"], ["search: consensus EPS 2027", "search: target changes", "read: estimates"], ["search: contract September", "search: competitor price cuts", "read: press release"], ["search: short interest", "search: insider sales", "read: Form 4"]],
    stance: ["bullish", "mixed", "bullish", "mixed"],
    bull: ["BULL", "Compounding 20%+ with rising margins; estimates still going up."],
    bear: ["BEAR", "The multiple already assumes years of high-teens growth."],
    rating: "OVERWEIGHT ▲",
    conf: "confidence medium",
    concl: "Build on weakness — don't chase.",
    band: "positive",
    scoreLabel: "Verdict Score",
    zones: [["add", "< 160"], ["start", "175–195"], ["avoid", "> 215"]],
    now: "price is here",
    oddsNote: "odds of reaching each zone within 3 months",
    methodsTitle: "Verdict methods",
    methods: [
      ["Priced-in growth", `${DATA.ig}%/yr implied · ${DATA.hist}% delivered`],
      ["Options-implied move", `±${DATA.move}% in ${DATA.days} days`],
      ["Tape", "uptrend · normal volatility"],
      ["Payoff", `${DATA.pay > 0 ? "+" : ""}${DATA.pay}% expected · ${DATA.rr}× reward/risk`],
      ["Evidence balance", `leans bullish · +${DATA.ev}`],
      ["Audit", "rating checked against evidence, value and payoff"],
    ],
    questions: ["Is it cheap right now?", "现在贵吗？", "今は割安ですか？", "지금 싸요?", "Ist sie jetzt günstig?", "Est-elle chère ?", "¿Está barata ahora?", "現在貴嗎？"],
    star: "★  Star on GitHub",
    fine: "Fictional demo company · AI-generated research, not investment advice",
  },
  "zh-CN": {
    font: "'Noto Sans SC'",
    h: [
      ["认识 Verdict", "随手可用的股票研究台"],
      ["像问同事一样提问", "股票代码、公司名或一个问题，用什么语言都行"],
      ["几秒拿到实时数据", "行情、公告、财务、期权和带日期的新闻，并行抓取"],
      ["四位分析师，并行研究", "业务 · 预期 · 新闻 · 风险"],
      ["多空辩论", "双方各自拿出最强的论证"],
      ["一个明确的结论", "评级 · 置信度 · Verdict 评分"],
      ["价格条件，附带概率", "3 个月内触及每个区间的可能性"],
      ["计算交给代码", "七种确定性方法检验每一个结论"],
      ["11 种语言，全球市场", ""],
      ["终端 · Claude Code · Codex", "全屏应用，或并行子代理的插件"],
      ["开源免费，10 秒试用", ""],
    ],
    query: "ACME 现在贵吗？",
    company: "Acme Robotics",
    fictional: "虚构演示公司",
    stats: [`市盈率 ${DATA.pe}`, `收入 +${DATA.rev}%`, `自由现金流 ${DATA.fcf}B`, `RSI ${DATA.rsi}`],
    desks: ["业务与财报", "预期与估值", "新闻与催化剂", "持仓与风险"],
    acts: [["搜索：二季度分部收入", "阅读：10-Q", "搜索：电话会纪要"], ["搜索：2027 一致预期", "搜索：目标价调整", "阅读：盈利预测"], ["搜索：九月合同", "搜索：竞争对手降价", "阅读：新闻稿"], ["搜索：做空比例", "搜索：内部人减持", "阅读：Form 4"]],
    stance: ["偏多", "多空交织", "偏多", "多空交织"],
    bull: ["多头", "20% 以上的复利增长，利润率上升，盈利预测仍在上调。"],
    bear: ["空头", "估值已经假设未来多年保持十几个百分点的高增长。"],
    rating: "增持 ▲",
    conf: "置信度 中",
    concl: "回调时建仓，不要追高。",
    band: "偏强",
    scoreLabel: "Verdict 评分",
    zones: [["加仓", "< 160"], ["建仓", "175–195"], ["回避", "> 215"]],
    now: "现价在此",
    oddsNote: "3 个月内触及各区间的概率",
    methodsTitle: "Verdict 独家方法",
    methods: [
      ["价格隐含的增长", `隐含每年 ${DATA.ig}% · 实际 ${DATA.hist}%`],
      ["期权隐含波动", `${DATA.days} 天内 ±${DATA.move}%`],
      ["走势状态", "上升趋势 · 波动正常"],
      ["收益风险", `期望 ${DATA.pay > 0 ? "+" : ""}${DATA.pay}% · 收益/风险 ${DATA.rr} 倍`],
      ["证据天平", `偏多 · +${DATA.ev}`],
      ["一致性检查", "评级与证据、估值、收益风险逐项核对"],
    ],
    questions: ["现在贵吗？", "Is it cheap right now?", "今は割安ですか？", "지금 싸요?", "Ist sie jetzt günstig?", "Est-elle chère ?", "¿Está barata ahora?", "現在貴嗎？"],
    star: "★  在 GitHub 上点 Star",
    fine: "演示使用虚构公司 · AI 生成的研究，不构成投资建议",
  },
};
const W = T[LANG] || T.en;
const TICKERS = ["🇨🇳 贵州茅台", "🇭🇰 腾讯 0700", "🇯🇵 トヨタ 7203", "🇰🇷 삼성전자", "🇺🇸 NVDA", "🇪🇺 SAP.DE", "🇦🇺 BHP.AX", "🇹🇼 台積電 2330", "🇬🇧 SHEL.L", "🇫🇷 MC.PA"];

// ---------------------------------------------------------------- the page

const fonts = process.env.VERDICT_FONTS && existsSync(process.env.VERDICT_FONTS) ? process.env.VERDICT_FONTS : null;
const fontCss = fonts
  ? ["inter/400.css", "inter/500.css", "inter/600.css", "inter/700.css", "inter/800.css", "jetbrains-mono/400.css", "jetbrains-mono/700.css", "noto-sans-sc/400.css", "noto-sans-sc/500.css", "noto-sans-sc/700.css", "noto-sans-sc/900.css", "noto-sans-jp/400.css", "noto-sans-kr/400.css"]
    .map((f) => `<link rel="stylesheet" href="${pathToFileURL(join(fonts, f)).href}">`).join("\n")
  : "";
const logo = readFileSync(join(root, "assets", "logo.svg"), "utf8");

const page = `<!doctype html><html><head><meta charset="utf-8">${fontCss}
<style>
@font-face{font-family:BoxDraw;src:local("DejaVu Sans Mono");unicode-range:U+2500-259F,U+25A0-25FF}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:#0a0c10}
body{font-family:${W.font},Inter,'Noto Sans SC','Noto Sans JP','Noto Sans KR',sans-serif;color:#ece8de;-webkit-font-smoothing:antialiased}
.abs{position:absolute}
#glow{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(245,165,36,.22),rgba(245,165,36,0));pointer-events:none}
#grain{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(circle at 50% 55%,#000 20%,transparent 75%)}
.shape{position:absolute;overflow:hidden;will-change:transform}
.layer{position:absolute;left:50%;top:50%}
.mono{font-family:'JetBrains Mono',monospace}
#head{position:absolute;left:0;right:0;text-align:center}
#head h1{font-weight:800;font-size:64px;letter-spacing:-.025em;color:#fff;white-space:nowrap}
#head p{margin-top:14px;font-size:27px;color:#a09c93;white-space:nowrap}
#head span{display:inline-block;will-change:transform}
.chip{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:10px 18px;font-size:22px;background:#161a23;border:1px solid #2a303c;white-space:nowrap}
.pill-g{background:rgba(63,185,80,.14);color:#3fb950;border-color:rgba(63,185,80,.35)}
.pill-a{background:rgba(245,165,36,.14);color:#f5a524;border-color:rgba(245,165,36,.35)}
.pill-r{background:rgba(248,81,73,.14);color:#f85149;border-color:rgba(248,81,73,.35)}
.tile-title{font-size:26px;font-weight:700;color:#fff}
.tile-act{font-size:19px;color:#8b8780;margin-top:10px;height:26px}
.spin{width:22px;height:22px;border-radius:50%;border:3px solid #2a303c;border-top-color:#f5a524}
.row{display:flex;align-items:center}
.mrow{display:flex;align-items:center;justify-content:space-between;height:64px;border-top:1px solid #232833;font-size:24px}
.mrow b{font-weight:600;color:#fff}
.mrow i{font-style:normal;color:#a09c93}
.dot{width:10px;height:10px;border-radius:50%;background:#f5a524;margin-right:16px;flex:none}
</style></head><body>
<div id="grain"></div>
<div id="glow"></div>
<div id="head"><h1></h1><p></p></div>

<div class="shape" id="hero">
  <div class="layer" id="L-logo" style="width:120px;height:120px">${logo.replace("<svg", '<svg style="width:120px;height:120px"')}</div>
  <div class="layer" id="L-pill" style="width:380px;height:112px;display:flex;align-items:center;justify-content:center;gap:16px;font:800 40px/1 Inter,sans-serif;letter-spacing:.2em;color:#1b1400">◆ VERDICT</div>
  <div class="layer" id="L-input" style="width:1040px;height:112px;display:flex;align-items:center;gap:22px;padding:0 40px;font-size:38px">
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f5a524" stroke-width="2.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
    <span id="typed" style="color:#fff;white-space:pre"></span><span id="caret" style="width:3px;height:44px;background:#f5a524;display:inline-block;margin-left:-14px"></span>
    <span id="enter" class="mono" style="margin-left:auto;font-size:22px;color:#6b675f;border:1px solid #2a303c;border-radius:8px;padding:6px 12px">↵ Enter</span>
  </div>
  <div class="layer" id="L-snap" style="width:1040px;height:560px;padding:44px 52px">
    <div class="row" style="justify-content:space-between"><div><div style="font-size:30px;font-weight:700;color:#fff">ACME <span style="font-weight:500;color:#a09c93">· ${W.company}</span></div><div style="font-size:19px;color:#6b675f;margin-top:6px">${W.fictional}</div></div>
      <div style="text-align:right"><div class="mono" id="price" style="font-size:56px;font-weight:700;color:#fff">0.00</div><div class="chip pill-g mono" id="chg" style="margin-top:8px;font-size:20px;padding:6px 14px">+${DATA.change}%</div></div></div>
    <svg id="spark" width="936" height="210" style="margin-top:22px;overflow:visible"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fb950" stop-opacity=".28"/><stop offset="1" stop-color="#3fb950" stop-opacity="0"/></linearGradient></defs><path id="sparkFill" fill="url(#sg)"/><path id="sparkLine" fill="none" stroke="#3fb950" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/></svg>
    <div class="row" id="stats" style="gap:14px;margin-top:26px">${W.stats.map((s) => `<div class="chip mono" style="font-size:21px">${s}</div>`).join("")}</div>
  </div>
  <div class="layer" id="L-bar" style="width:1040px;height:28px"><div id="barBull" class="abs" style="left:0;top:0;bottom:0;background:#3fb950"></div><div id="barBear" class="abs" style="right:0;top:0;bottom:0;background:#f85149"></div><div id="barKnob" class="abs" style="top:-6px;width:8px;height:40px;border-radius:4px;background:#fff;box-shadow:0 0 18px rgba(255,255,255,.6)"></div></div>
  <div class="layer" id="L-verdict" style="width:1040px;height:540px;padding:56px 60px">
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div>
        <div id="rating" style="display:inline-block;font-size:44px;font-weight:800;color:#0a0c10;background:#3fb950;border-radius:14px;padding:14px 26px;letter-spacing:.02em">${W.rating}</div>
        <div id="conf" style="font-size:26px;color:#a09c93;margin-top:26px">${W.conf} · ACME ${DATA.price} USD</div>
        <div id="concl" style="font-size:38px;font-weight:700;color:#fff;margin-top:40px;max-width:560px;line-height:1.25">${W.concl}</div>
      </div>
      <div id="dialWrap" style="text-align:center;margin-top:6px">
        <svg width="250" height="250" viewBox="0 0 250 250"><circle cx="125" cy="125" r="104" fill="none" stroke="#232833" stroke-width="18"/><circle id="dial" cx="125" cy="125" r="104" fill="none" stroke="#3fb950" stroke-width="18" stroke-linecap="round" transform="rotate(-90 125 125)" stroke-dasharray="653.5" stroke-dashoffset="653.5"/><text id="dialNum" x="125" y="140" text-anchor="middle" font-family="Inter" font-weight="800" font-size="72" fill="#fff">0</text></svg>
        <div style="font-size:22px;color:#a09c93;margin-top:8px">${W.scoreLabel}</div><div id="band" style="font-size:26px;font-weight:700;color:#3fb950;margin-top:4px">${W.band}</div>
      </div>
    </div>
  </div>
  <div class="layer" id="L-chart" style="width:1240px;height:480px">
    <div id="axis" class="abs" style="left:100px;right:100px;top:250px;height:4px;background:#2a303c;border-radius:2px"></div>
    <div id="zAdd" class="abs" style="top:236px;height:32px;border-radius:8px;background:rgba(63,185,80,.25);border:2px solid #3fb950"></div>
    <div id="zStart" class="abs" style="top:236px;height:32px;border-radius:8px;background:rgba(245,165,36,.22);border:2px solid #f5a524"></div>
    <div id="zAvoid" class="abs" style="top:236px;height:32px;border-radius:8px;background:rgba(248,81,73,.22);border:2px solid #f85149"></div>
    ${["bear", "base", "bull"].map((k) => `<div id="m-${k}" class="abs mono" style="top:162px;width:120px;margin-left:-60px;text-align:center;font-size:22px;color:#a09c93">${k}<div style="font-size:30px;color:#fff;font-weight:700">${DATA.val[k]}</div></div>`).join("")}
    <div id="pm" class="abs" style="top:280px;width:180px;margin-left:-90px;text-align:center"><div style="width:0;height:0;margin:0 auto;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:22px solid #f5a524"></div><div class="mono" style="font-size:28px;color:#f5a524;font-weight:700;margin-top:4px">${DATA.price}</div></div>
    ${W.zones.map((z, i) => `<div id="zl${i}" class="abs" style="top:372px;width:300px;margin-left:-150px;text-align:center"><div style="font-size:24px;font-weight:700;color:${["#3fb950", "#f5a524", "#f85149"][i]}">${z[0]} <span class="mono" style="color:#a09c93;font-weight:400">${z[1]}</span></div><div class="${i === 1 ? "" : "mono"}" id="zo${i}" style="font-size:${i === 1 ? 28 : 40}px;font-weight:700;color:${i === 1 ? "#f5a524" : "#fff"};margin-top:${i === 1 ? 10 : 4}px">0%</div></div>`).join("")}
    <div id="oddsNote" class="abs" style="left:0;right:0;top:40px;text-align:center;font-size:22px;color:#6b675f">${W.oddsNote}</div>
  </div>
  <div class="layer" id="L-methods" style="width:1040px;height:560px;padding:40px 56px">
    <div class="row" style="justify-content:space-between;margin-bottom:16px"><div style="font-size:30px;font-weight:800;color:#f5a524">${W.methodsTitle}</div><div class="chip pill-g" id="mscore" style="font-size:22px">${W.scoreLabel} <b class="mono">${DATA.score}</b></div></div>
    ${W.methods.map((m, i) => `<div class="mrow" id="mr${i}"><div class="row"><span class="dot"></span><b>${m[0]}</b></div><i>${m[1]}</i></div>`).join("")}
  </div>
  <div class="layer" id="L-lang" style="width:700px;height:120px;overflow:hidden">
    ${W.questions.map((q, i) => `<div id="q${i}" class="abs" style="left:0;right:0;top:0;height:120px;display:flex;align-items:center;justify-content:center;font-size:42px;font-weight:600;color:#fff">${q}</div>`).join("")}
  </div>
  <div class="layer" id="L-term" style="width:1100px">${termSvg.replace("<svg ", '<svg style="width:1100px;height:auto;display:block" ')}</div>
  <div class="layer" id="L-star" style="width:560px;height:116px;display:flex;align-items:center;justify-content:center;font:800 40px/1 ${W.font},Inter,sans-serif;color:#1b1400">${W.star}</div>
</div>

${[0, 1, 2, 3].map((i) => `<div class="shape" id="tile${i}" style="background:#12151c;border:1px solid #2a303c"><div class="layer" style="width:500px;height:250px;padding:34px 36px"><div class="tile-title">${W.desks[i]}</div><div class="tile-act" id="act${i}"></div><div class="row" style="margin-top:34px;gap:14px"><div class="spin" id="spin${i}"></div><div class="chip ${i % 2 ? "pill-a" : "pill-g"}" id="st${i}" style="font-size:20px;padding:6px 14px">✓ ${W.stance[i]}</div></div></div></div>`).join("")}
<div class="shape" id="bullCard" style="background:#10201a;border:2px solid #3fb950"><div class="layer" style="width:510px;height:400px;padding:44px 40px"><div style="font-size:34px;font-weight:800;color:#3fb950;letter-spacing:.08em">${W.bull[0]}</div><div style="font-size:30px;color:#fff;margin-top:22px;line-height:1.35">${W.bull[1]}</div></div></div>
<div class="shape" id="bearCard" style="background:#22131a;border:2px solid #f85149"><div class="layer" style="width:510px;height:400px;padding:44px 40px"><div style="font-size:34px;font-weight:800;color:#f85149;letter-spacing:.08em">${W.bear[0]}</div><div style="font-size:30px;color:#fff;margin-top:22px;line-height:1.35">${W.bear[1]}</div></div></div>
<div id="barLabels" class="abs" style="left:440px;width:1040px;top:560px;display:flex;justify-content:space-between;font-size:30px;font-weight:800;letter-spacing:.08em"><span style="color:#3fb950">${W.bull[0]}</span><span style="color:#f85149">${W.bear[0]}</span></div>
${TICKERS.map((t, i) => `<div class="chip abs" id="tk${i}" style="font-size:26px">${t}</div>`).join("")}
<div id="url" class="abs mono" style="left:0;right:0;text-align:center;font-size:34px;font-weight:700;color:#fff">github.com/Zhao73/verdict</div>
<div id="inst" class="abs" style="left:0;right:0;display:flex;justify-content:center"><div class="chip mono" style="font-size:26px;padding:16px 26px"><span style="color:#f5a524">$</span>&nbsp;npm install -g github:Zhao73/verdict &amp;&amp; verdict demo</div></div>
<div id="fine" class="abs" style="left:0;right:0;bottom:38px;text-align:center;font-size:19px;color:#6b675f">${W.fine}</div>
${Array.from({ length: 12 }, (_, i) => `<div class="abs" id="spk${i}" style="font-size:30px;color:#f5a524">★</div>`).join("")}
<svg id="cursor" class="abs" width="44" height="54" viewBox="0 0 44 54" style="filter:drop-shadow(0 4px 10px rgba(0,0,0,.6))"><path d="M4 3 L4 42 L14 32 L21 49 L28 46 L21 30 L36 30 Z" fill="#fff" stroke="#0a0c10" stroke-width="3" stroke-linejoin="round"/></svg>

<script>
const DATA = ${JSON.stringify(DATA)};
const HEAD = ${JSON.stringify(W.h)};
const QUERY = ${JSON.stringify(W.query)};
const ACTS = ${JSON.stringify(W.acts)};
const NQ = ${W.questions.length};
const NOW = ${JSON.stringify(W.now)};
const NT = ${TICKERS.length};
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// Damped spring step response: 0 → 1, overshooting a little before it settles.
function spring(t, z = 0.62, f = 1.35) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f;
  if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}
// Additive animation: every key adds a spring from the previous value to its own.
function track(t, keys) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [ti, vi, o] = keys[i];
    if (t < ti) break;
    const d = vi - keys[i - 1][1];
    v += o && o.jump ? d : d * spring(t - ti, o && o.z != null ? o.z : 0.62, o && o.f != null ? o.f : 1.35);
  }
  return v;
}
// Fade + rise in at tin, out at tout.
function win(t, tin, tout = 1e9, z = 0.6, f = 1.6) {
  const p = spring(t - tin, z, f);
  const out = t >= tout ? clamp(spring(t - tout, 1, 3)) : 0;
  return { o: clamp(Math.min(clamp(p * 1.4), 1 - out)), p, out };
}
function place(el, cx, cy, w, h, r) {
  el.style.left = (cx - w / 2) + "px";
  el.style.top = (cy - h / 2) + "px";
  el.style.width = Math.max(0, w) + "px";
  el.style.height = Math.max(0, h) + "px";
  el.style.borderRadius = Math.max(0, Math.min(r, w / 2, h / 2)) + "px";
}
const mix = (a, b, k) => a.map((x, i) => Math.round(x + (b[i] - x) * clamp(k)));
const rgb = (c, a = 1) => "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
const AMBER = [245, 165, 36], PANEL = [18, 21, 28], WIN = [15, 17, 21];
const SOFT = { z: 0.75, f: 1.1 }, POP = { z: 0.5, f: 1.8 }, FIRM = { z: 0.68, f: 1.45 };

// The hero shape's life: [time, value, spring].
const K = {
  cx: [[0, 960], [41.1, 960]],
  cy: [[0, 540], [1.2, 520, SOFT], [3.1, 600, FIRM], [7.0, 620, FIRM], [18.7, 640, { jump: true }], [20.2, 630, FIRM], [24.6, 640, FIRM], [29.0, 630, FIRM], [33.0, 650, FIRM], [37.0, 645, FIRM], [41.1, 560, FIRM]],
  w: [[0, 0], [0.25, 120, POP], [1.25, 380, FIRM], [3.1, 1040, FIRM], [24.6, 1240, FIRM], [29.0, 1040, FIRM], [33.0, 700, FIRM], [37.0, 1100, FIRM], [41.1, 560, FIRM]],
  h: [[0, 0], [0.25, 120, POP], [1.25, 112, FIRM], [7.0, 560, FIRM], [18.7, 28, { jump: true }], [20.2, 540, FIRM], [24.6, 480, FIRM], [29.0, 560, FIRM], [33.0, 120, FIRM], [37.0, 749, FIRM], [41.1, 116, FIRM]],
  r: [[0, 60], [1.25, 56], [3.1, 28, FIRM], [18.7, 14, { jump: true }], [20.2, 28, FIRM], [33.0, 60, FIRM], [37.0, 14, FIRM], [41.1, 58, FIRM]],
  paint: [[0, 0], [3.1, 1, FIRM], [37.0, 2, FIRM], [41.1, 0, FIRM]],
  vis: [[0, 1], [11.0, 0, { jump: true }], [18.7, 1, { jump: true }]],
  press: [[0, 1], [6.25, 0.965, { z: 0.9, f: 6 }], [6.4, 1, POP], [43.45, 0.93, { z: 0.9, f: 6 }], [43.6, 1, POP]],
};

// Four analyst tiles split out of the card, merge into two sides.
const GRID = [[695, 480], [1225, 480], [695, 760], [1225, 760]];
function tileGeom(t, i) {
  const s0 = 11.0 + i * 0.05, m = 16.1 + (i % 2) * 0.04;
  const side = i % 2 === 0 ? 695 : 1225;
  const cx = track(t, [[0, 960], [s0, GRID[i][0], FIRM], [m, side, FIRM]]);
  const cy = track(t, [[0, 620], [s0, GRID[i][1], FIRM], [m, 640, FIRM]]);
  const w = track(t, [[0, 1040], [s0, 500, FIRM], [m, 510, FIRM]]);
  const h = track(t, [[0, 560], [s0, 250, FIRM], [m, 400, FIRM]]);
  return [cx, cy, w, h, 24];
}
function sideGeom(t, bull) {
  const cx = track(t, [[0, bull ? 695 : 1225], [18.1, bull ? 700 : 1220, FIRM]]);
  const w = track(t, [[0, 510], [18.1, 520, FIRM]]);
  const h = track(t, [[0, 400], [18.1, 28, FIRM]]);
  const r = track(t, [[0, 24], [18.1, 14, FIRM]]);
  return [cx, 640, w, h, r];
}

const HEADS = [[0.9, 2.9, 760], [3.5, 6.9, 250], [7.4, 10.9, 150], [11.3, 15.9, 150], [16.4, 20.0, 190], [20.5, 24.4, 150], [24.9, 28.8, 190], [29.3, 32.8, 140], [33.3, 36.8, 150], [37.3, 40.9, 90], [41.6, 99, 330]];
let headIdx = -1;
function head(t) {
  const i = HEADS.findIndex(([a, b]) => t >= a - 0.05 && t < b + 0.35);
  const el = $("head");
  if (i < 0) { el.style.opacity = 0; return; }
  if (i !== headIdx) {
    headIdx = i;
    const split = (s) => (/[\\u3000-\\u9fff\\uac00-\\ud7af]/.test(s) ? [...s] : s.split(/(\\s+)/)).map((w) => w.trim() ? "<span>" + w + "</span>" : w).join("");
    el.querySelector("h1").innerHTML = split(HEAD[i][0]);
    el.querySelector("p").innerHTML = split(HEAD[i][1]);
  }
  const [a, b, y] = HEADS[i];
  el.style.top = y + "px";
  el.style.opacity = 1;
  const spans = el.querySelectorAll("span");
  spans.forEach((s, k) => {
    const d = a + k * (spans.length > 14 ? 0.018 : 0.045);
    const p = spring(t - d, 0.62, 1.7), out = t > b ? clamp(spring(t - b - k * 0.01, 1, 3.2)) : 0;
    s.style.opacity = clamp(Math.min(clamp(p * 1.5), 1 - out));
    s.style.transform = "translateY(" + ((1 - p) * 34 - out * 20) + "px)";
  });
}

function layer(id, t, tin, tout, dy = 18) {
  const v = win(t, tin, tout);
  const el = $(id);
  el.style.opacity = v.o;
  el.style.transform = "translate(-50%,-50%) translateY(" + ((1 - v.p) * dy) + "px)";
  el.style.visibility = v.o > 0.001 ? "visible" : "hidden";
  return v;
}

window.render = (t) => {
  // hero
  const hero = $("hero");
  const cx = track(t, K.cx), cy = track(t, K.cy), w = track(t, K.w), h = track(t, K.h), r = track(t, K.r);
  place(hero, cx, cy, w, h, r);
  const paint = track(t, K.paint);
  const bg = paint <= 1 ? mix(AMBER, PANEL, paint) : mix(PANEL, WIN, paint - 1);
  hero.style.background = rgb(bg);
  const border = t < 3.1 ? 0 : t < 7 ? 0.85 : 0.28;
  hero.style.border = t >= 37 && t < 41.1 ? "1px solid #262b36" : "1.5px solid " + rgb(AMBER, border);
  if (t >= 41.1) hero.style.border = "none";
  const vis = track(t, K.vis);
  hero.style.opacity = clamp(vis);
  hero.style.transform = "scale(" + track(t, K.press) + ")";
  hero.style.boxShadow = "0 30px 90px rgba(0,0,0,.55)" + (t > 41.1 || t < 3.1 ? ", 0 0 60px rgba(245,165,36,.35)" : "");
  const glow = $("glow");
  const gw = Math.max(w, 300) * 1.6, gh = Math.max(h, 300) * 1.6;
  glow.style.left = (cx - gw / 2) + "px"; glow.style.top = (cy - gh / 2) + "px"; glow.style.width = gw + "px"; glow.style.height = gh + "px";

  head(t);

  // 1. logo → pill
  layer("L-logo", t, 0.35, 1.15, 0);
  $("L-logo").style.transform += " scale(" + (0.6 + 0.4 * spring(t - 0.35, 0.5, 1.8)) + ")";
  layer("L-pill", t, 1.45, 3.05, 10);
  // 2. input
  layer("L-input", t, 3.35, 6.95, 0);
  const n = [...QUERY].length;
  const typed = Math.floor(clamp((t - 3.9) / 1.9) * n);
  $("typed").textContent = [...QUERY].slice(0, typed).join("");
  $("caret").style.opacity = t > 5.8 ? ((Math.floor(t * 2.2) % 2) ? 0 : 1) : 1;
  $("enter").style.opacity = clamp((t - 5.6) * 3);
  $("enter").style.color = t > 6.25 && t < 6.6 ? "#f5a524" : "#6b675f";
  // 3. snapshot card
  const vs = layer("L-snap", t, 7.25, 10.95);
  if (vs.o > 0) {
    const pv = DATA.price * clamp(spring(t - 7.5, 0.95, 1.1), 0, 1.02);
    $("price").textContent = pv.toFixed(2);
    const ser = DATA.series, lo = Math.min(...ser), hi = Math.max(...ser);
    const pts = ser.map((v, i) => [i / (ser.length - 1) * 936, 200 - (v - lo) / (hi - lo) * 185]);
    const upto = Math.max(2, Math.floor(clamp((t - 7.6) / 1.5) * pts.length));
    const d = pts.slice(0, upto).map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    $("sparkLine").setAttribute("d", d);
    $("sparkFill").setAttribute("d", d + " L" + pts[upto - 1][0].toFixed(1) + " 210 L0 210 Z");
    [...$("stats").children].forEach((c, i) => { const p = spring(t - 8.6 - i * 0.12, 0.5, 1.8); c.style.opacity = clamp(p * 1.5); c.style.transform = "scale(" + (0.7 + 0.3 * p) + ")"; });
    const pc = spring(t - 8.2, 0.5, 1.8); $("chg").style.transform = "scale(" + pc + ")";
  }
  // 4. tiles
  for (let i = 0; i < 4; i++) {
    const el = $("tile" + i);
    const on = t >= 11.0 && t < 16.9;
    el.style.display = on ? "" : "none";
    if (!on) continue;
    const [x, y, tw, th, tr] = tileGeom(t, i);
    place(el, x, y, tw, th, tr);
    const inner = el.firstElementChild;
    const v = win(t, 11.25 + i * 0.06, 16.0);
    inner.style.opacity = v.o;
    inner.style.transform = "translate(-50%,-50%) translateY(" + ((1 - v.p) * 14) + "px)";
    const done = 13.3 + [0.9, 1.9, 0, 1.5][i];
    const acts = ACTS[i];
    $("act" + i).textContent = t < done ? acts[Math.min(acts.length - 1, Math.floor((t - 11.4) / ((done - 11.4) / acts.length)))] || "" : "";
    $("spin" + i).style.display = t < done ? "" : "none";
    $("spin" + i).style.transform = "rotate(" + (t * 520) + "deg)";
    const ps = spring(t - done, 0.45, 2);
    $("st" + i).style.display = t >= done ? "" : "none";
    $("st" + i).style.transform = "scale(" + ps + ")";
    el.style.borderColor = t >= done ? (i % 2 ? "rgba(245,165,36,.5)" : "rgba(63,185,80,.5)") : "#2a303c";
  }
  // 5. bull vs bear
  for (const [id, bull] of [["bullCard", true], ["bearCard", false]]) {
    const el = $(id);
    const on = t >= 16.9 && t < 18.7;
    el.style.display = on ? "" : "none";
    if (!on) continue;
    const [x, y, cw, ch, cr] = sideGeom(t, bull);
    place(el, x, y, cw, ch, cr);
    const inner = el.firstElementChild;
    const v = win(t, 16.95, 17.95);
    inner.style.opacity = v.o;
    inner.style.transform = "translate(-50%,-50%) translateY(" + ((1 - v.p) * 14) + "px)";
  }
  const vb = layer("L-bar", t, 18.7, 20.25, 0);
  $("L-bar").style.opacity = t >= 18.7 && t < 20.4 ? 1 - clamp((t - 20.2) * 5) : 0;
  const split = track(t, [[0, 50], [18.75, 36, { z: 0.45, f: 1.6 }], [19.15, 66, { z: 0.45, f: 1.6 }], [19.6, 58, { z: 0.55, f: 1.4 }]]);
  $("barBull").style.width = split + "%"; $("barBear").style.width = (100 - split) + "%";
  $("barKnob").style.left = "calc(" + split + "% - 4px)";
  const bl = $("barLabels");
  bl.style.opacity = t >= 17.2 && t < 20.4 ? clamp(Math.min((t - 17.9) * 3, (20.3 - t) * 5)) : 0;
  bl.style.top = "585px";
  // 6. verdict card
  const vv = layer("L-verdict", t, 20.45, 24.55);
  if (vv.o > 0) {
    const pr = spring(t - 20.75, 0.45, 1.9); $("rating").style.transform = "scale(" + (0.4 + 0.6 * pr) + ")";
    $("conf").style.opacity = clamp((t - 21.1) * 3);
    const pc = spring(t - 21.5, 0.62, 1.5); $("concl").style.opacity = clamp(pc * 1.4); $("concl").style.transform = "translateY(" + ((1 - pc) * 20) + "px)";
    const ps = spring(t - 21.1, 0.55, 0.9);
    const score = DATA.score * ps;
    $("dial").setAttribute("stroke-dashoffset", (653.5 * (1 - score / 100)).toFixed(1));
    $("dialNum").textContent = Math.round(clamp(score, 0, 100));
    $("band").style.opacity = clamp((t - 22.3) * 3);
  }
  // 7. chart
  const vc = layer("L-chart", t, 24.8, 29.05);
  if (vc.o > 0) {
    const X = (v) => 100 + (v - 130) / (260 - 130) * 1040;
    const zone = (id, a, b, d) => { const p = clamp(spring(t - d, 0.7, 1.6), 0, 1.05); const el = $(id); el.style.left = X(a) + "px"; el.style.width = Math.max(0, (X(b) - X(a)) * p) + "px"; el.style.opacity = clamp(p * 2); };
    zone("zAdd", 130, 160, 25.3); zone("zStart", 175, 195, 25.45); zone("zAvoid", 215, 260, 25.6);
    [["bear", 25.9], ["base", 26.05], ["bull", 26.2]].forEach(([k, d]) => { const p = spring(t - d, 0.5, 1.9); const el = $("m-" + k); el.style.left = X(DATA.val[k]) + "px"; el.style.opacity = clamp(p * 1.5); el.style.transform = "translateY(" + ((1 - p) * 24) + "px)"; });
    const pp = spring(t - 26.4, 0.55, 1.2); $("pm").style.left = (X(130) + (X(DATA.price) - X(130)) * pp) + "px"; $("pm").style.opacity = clamp((t - 26.4) * 4);
    const zc = [145, 185, 237.5], zv = [DATA.odds.add, DATA.odds.start, DATA.odds.avoid];
    zc.forEach((c, i) => { const el = $("zl" + i); el.style.left = X(c) + "px"; const p = spring(t - 27.0 - i * 0.12, 0.6, 1.6); el.style.opacity = clamp(p * 1.4); el.style.transform = "translateY(" + ((1 - p) * 20) + "px)"; const k = clamp(spring(t - 27.1 - i * 0.12, 0.95, 0.9), 0, 1); $("zo" + i).textContent = i === 1 ? NOW : Math.round(zv[i] * k) + "%"; });
    $("oddsNote").style.opacity = clamp((t - 27.6) * 2);
  }
  // 8. methods
  const vm = layer("L-methods", t, 29.25, 33.05);
  if (vm.o > 0) {
    for (let i = 0; i < 6; i++) { const p = spring(t - 29.6 - i * 0.14, 0.6, 1.7); const el = $("mr" + i); el.style.opacity = clamp(p * 1.5); el.style.transform = "translateX(" + ((1 - p) * -40) + "px)"; }
    const p = spring(t - 30.6, 0.45, 1.9); $("mscore").style.transform = "scale(" + p + ")";
  }
  // 9. languages
  layer("L-lang", t, 33.25, 37.0, 0);
  const slot = (t - 33.4) / 0.46;
  for (let i = 0; i < NQ; i++) {
    const el = $("q" + i);
    const k = spring(t - (33.4 + i * 0.46), 0.6, 2.2), out = spring(t - (33.4 + (i + 1) * 0.46), 0.8, 2.6);
    const last = i === NQ - 1;
    const y = t < 33.4 + i * 0.46 ? 120 : (1 - k) * 120 - (last ? 0 : out * 120);
    el.style.transform = "translateY(" + y + "px)";
    el.style.opacity = t < 33.4 + i * 0.46 ? 0 : 1;
  }
  for (let i = 0; i < NT; i++) {
    const el = $("tk" + i);
    const ang = -Math.PI / 2 + (i / NT) * Math.PI * 2 + 0.2;
    const tx = 960 + Math.cos(ang) * 640, ty = 650 + Math.sin(ang) * 235;
    const d = 33.7 + i * 0.09;
    const p = spring(t - d, 0.55, 1.4), out = t > 36.9 ? clamp(spring(t - 36.9, 1, 3)) : 0;
    const x = 960 + (tx - 960) * p + Math.sin(t * 0.9 + i) * 6, y = 650 + (ty - 650) * p + Math.cos(t * 0.8 + i * 2) * 6;
    el.style.left = x + "px"; el.style.top = y + "px";
    el.style.transform = "translate(-50%,-50%) scale(" + (0.5 + 0.5 * clamp(p, 0, 1.1)) + ")";
    el.style.opacity = t < d ? 0 : clamp(Math.min(p * 1.6, 1 - out));
  }
  // 10. terminal
  layer("L-term", t, 37.3, 41.1, 0);
  // 11. star
  layer("L-star", t, 41.45, 99, 0);
  const vu = win(t, 42.0), vi = win(t, 42.25);
  $("url").style.top = "655px"; $("url").style.opacity = vu.o; $("url").style.transform = "translateY(" + ((1 - vu.p) * 20) + "px)";
  $("inst").style.top = "730px"; $("inst").style.opacity = vi.o; $("inst").style.transform = "translateY(" + ((1 - vi.p) * 20) + "px)";
  $("fine").style.opacity = clamp((t - 42.6) * 2);
  for (let i = 0; i < 12; i++) {
    const el = $("spk" + i);
    const a = (i / 12) * Math.PI * 2, p = spring(t - 43.5, 0.8, 1.2);
    const dist = 170 + (i % 3) * 60;
    el.style.left = (960 + Math.cos(a) * (60 + dist * p) - 15) + "px";
    el.style.top = (560 + Math.sin(a) * (30 + dist * 0.55 * p) - 18) + "px";
    el.style.opacity = t < 43.5 ? 0 : clamp(1 - (t - 43.5) / 1.1);
    el.style.transform = "scale(" + (0.6 + p * 0.6) + ") rotate(" + (p * 90) + "deg)";
  }
  // cursor: clicks Enter, then the Star button
  const cur = $("cursor");
  const inA = t >= 5.3 && t < 7.0, inB = t >= 42.5 && t < 45.4;
  cur.style.opacity = inA ? clamp(Math.min((t - 5.3) * 4, (7.0 - t) * 4)) : inB ? clamp(Math.min((t - 42.5) * 4, (45.4 - t) * 3)) : 0;
  if (inA) { const p = spring(t - 5.35, 0.7, 1.3); cur.style.left = (1500 + (1418 - 1500) * p) + "px"; cur.style.top = (820 + (598 - 820) * p) + "px"; }
  if (inB) { const p = spring(t - 42.55, 0.7, 1.2); cur.style.left = (1380 + (1080 - 1380) * p) + "px"; cur.style.top = (860 + (560 - 860) * p) + "px"; }
  const click = (t > 6.2 && t < 6.45) || (t > 43.4 && t < 43.65);
  cur.style.transform = "scale(" + (click ? 0.85 : 1) + ")";
};
</script></body></html>`;

// ---------------------------------------------------------------- capture

const TOTAL = 46.5;
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--disable-background-networking", "--font-render-hinting=none"] });
const tab = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const stagePath = join(process.env.VERDICT_HOME, "motion.html");
writeFileSync(stagePath, page);
await tab.goto(pathToFileURL(stagePath).href);
await tab.evaluate(() => document.fonts.ready);

const stills = opt("stills", null);
if (stills) {
  for (const t of stills.split(",").map(Number)) {
    await tab.evaluate((x) => window.render(x), t);
    await tab.screenshot({ path: join(opt("dir", tmpdir()), `motion-${LANG}-${t}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const ff = spawn(FFMPEG, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], { stdio: ["pipe", "inherit", "inherit"] });
const frames = Math.round(TOTAL * FPS);
for (let i = 0; i < frames; i += 1) {
  await tab.evaluate((x) => window.render(x), i / FPS);
  const jpg = await tab.screenshot({ type: "jpeg", quality: 94 });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % (FPS * 5) === 0) process.stdout.write(`\r${LANG}: ${Math.round((i / frames) * 100)}%`);
}
ff.stdin.end();
await new Promise((resolve, reject) => ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));
await browser.close();
console.log(`\r${OUT} · ${TOTAL}s · ${frames} frames @ ${FPS}fps`);
