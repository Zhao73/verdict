import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fakeBackend, fakeSnapshot, isolateHome } from "./helpers.mjs";

isolateHome();
process.env.VERDICT_OFFLINE = "1";
const M = await import("../src/engine/methods.mjs");
const { research } = await import("../src/engine/pipeline.mjs");
const { snapshotBrief } = await import("../src/engine/snapshot.mjs");
const { knownIds } = await import("../src/engine/normalize.mjs");
const { renderReport } = await import("../src/render/markdown.mjs");
const { renderHtml } = await import("../src/render/html.mjs");
const { methodView } = await import("../src/render/methods.mjs");
const { verdictLines } = await import("../src/tui/views.mjs");

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} ${a} ≉ ${b}`);
const plain = (lines) => lines.join("\n").replace(/\x1b\[[0-9;]*m/g, "");

test("normal CDF", () => {
  near(M.normCdf(0), 0.5, 1e-7);
  near(M.normCdf(1.959964), 0.975, 1e-6);
  near(M.normCdf(-1), 0.158655, 1e-6);
});

test("implied growth: reverse DCF solves for the growth the price assumes", () => {
  const snap = (cap, fcf, ni = 1e9) => ({ fundamentals: { metrics: { free_cash_flow: { value: fcf }, net_income: { value: ni } }, ratios: { market_cap: cap, net_cash: 0, revenue_cagr_3y_pct: 10 } } });
  // With zero growth the model is worth FCF × a fixed multiple; a price at that multiple implies ~0%.
  let pv = 0;
  for (let t = 1; t <= 10; t += 1) pv += 1e9 / 1.09 ** t;
  pv += (1e9 * 1.025) / 0.065 / 1.09 ** 10;
  const flat = M.impliedGrowth(snap(pv, 1e9));
  near(flat.implied_growth_pct, 0, 0.1, "flat");
  assert.equal(flat.read, "undemanding");
  const rich = M.impliedGrowth(snap(pv * 5, 1e9));
  near(M.impliedGrowth(snap(pv * 2, 1e9)).implied_growth_pct, 9.2, 0.2, "2x the no-growth value");
  assert.ok(rich.implied_growth_pct > 10 && rich.gap_pp > 0, "a richer price implies more growth");
  assert.equal(rich.read, "demanding");
  assert.equal(M.impliedGrowth(snap(pv, -1e9)).basis, "earnings");
  assert.equal(M.impliedGrowth(snap(pv, -1e9, -1e9)).available, false);
  assert.equal(M.impliedGrowth({}).available, false);
});

test("implied range, regime and zone odds from volatility", () => {
  const s = { quote: { price: 100 }, options: { term_structure: [{ days: 30, atm_iv_pct: 40 }, { days: 60, atm_iv_pct: 30 }] }, technicals: { pct_vs_sma200: 8, sma50: 105, sma200: 95, realized_vol_30d_pct: 18, realized_vol_90d_pct: 25 } };
  const r = M.impliedRange(s);
  near(r.near.move_pct, 11.5, 0.05, "30d move");
  assert.equal(r.read, "event_priced");
  const g = M.regime(s);
  assert.deepEqual([g.trend, g.volatility], ["up", "calm"]);
  assert.equal(M.regime({ technicals: { pct_vs_sma200: -5, sma50: 90, sma200: 100, realized_vol_30d_pct: 50, realized_vol_90d_pct: 30 } }).trend, "down");
  const z = M.zoneOdds({ price_levels: [{ range: "> 130", action: "avoid" }, { range: "95-110", action: "start" }, { range: "< 90", action: "add" }] }, s);
  assert.equal(z.vol_source, "options");
  assert.equal(z.zones[1].probability, 100);
  assert.ok(z.zones[1].here);
  // 2·Φ(ln(0.9) / (0.30·√0.25)) ≈ 48%
  near(z.zones[2].probability, 48, 1, "add zone");
  assert.ok(z.zones[0].probability < z.zones[2].probability, "a farther zone is less likely");
});

test("payoff, evidence balance, audit and the Verdict Score", () => {
  const s = { quote: { price: 100 } };
  const pay = M.payoff({ valuation: { bear: 80, base: 110, bull: 150 } }, s);
  assert.deepEqual([pay.expected_value, pay.expected_return_pct, pay.upside_pct, pay.downside_pct, pay.reward_to_risk, pay.read], [112.5, 12.5, 50, -20, 2.5, "favourable"]);
  const desks = {
    business: { findings: [{ impact: "bearish", sources: ["S1"] }, { impact: "bearish", sources: ["data:fundamentals", "S1"] }], sources: [{ id: "S1", url: "https://www.sec.gov/x" }] },
    news: { findings: [{ impact: "bullish", sources: ["S1"] }, { impact: "neutral", sources: ["news:N1"] }], sources: [{ id: "S1", url: "https://someblog.example/x" }] },
  };
  assert.equal(M.sourceQuality("business:S1", desks), 1);
  assert.equal(M.sourceQuality("news:S1", desks), 0.6);
  const ev = M.evidenceBalance({ desks });
  assert.equal(ev.lean, "bearish");
  assert.deepEqual(ev.counts, { bullish: 1, bearish: 2, neutral: 1 });
  const run = { decision: { rating: "Buy", confidence: "high", valuation: { base: 90 }, gaps: ["a", "b", "c"] }, snapshot: s, desks };
  const au = M.audit(run, { pay, evidence: ev });
  assert.equal(au.status, "tension");
  assert.deepEqual(au.flags.map((f) => f.code).sort(), ["confidence_vs_gaps", "desks_split", "rating_vs_evidence", "rating_vs_value"]);
  const score = M.verdictScore({ pay, evidence: ev, lenses: [{ score: 0.8, family: "quality" }, { score: 0.2, family: "technical" }], reg: { available: true, trend: "up", volatility: "normal" } });
  assert.equal(score.parts.length, 4);
  near(score.parts.reduce((a, p) => a + p.weight, 0), 1, 0.02);
  assert.equal(score.parts.find((p) => p.key === "fundamentals").value, 80, "technical lenses are left to the tape");
  assert.ok(score.total > 0 && score.total < 100);
  assert.equal(M.verdictScore({ pay }).available, false, "one component is not a score");
});

test("methods flow through the snapshot, the run, the card and both reports", async () => {
  const snap = await fakeSnapshot("TEST");
  snap.methods = M.snapshotMethods(snap);
  assert.ok(snap.methods.implied_growth.available);
  assert.match(snapshotBrief(snap), /\[method:implied_growth\] reverse DCF/);
  assert.match(snapshotBrief(snap), /\[method:regime\] up trend/);
  assert.ok(knownIds(snap).has("method:implied_growth"));
  assert.ok(!knownIds(snap).has("method:implied_range"), "an abstaining method cannot be cited");

  const run = await research({ symbol: "TEST", backend: fakeBackend(), snapshot: snap });
  assert.equal(run.state, "complete");
  assert.ok(run.analytics.score.available);
  assert.equal(run.score, run.analytics.score.total);
  assert.ok(run.analytics.zone_odds.available);
  const card = plain(verdictLines(run, 100));
  assert.match(card, /Verdict Score \d+\/100/);
  assert.match(card, /VERDICT METHODS/);
  assert.match(card, /Priced-in growth/);
  assert.match(card, /Odds of reaching each zone within 3 months/);
  assert.match(renderReport(run), /## Verdict methods/);
  assert.match(renderReport(run), /\| % \|/);
  assert.match(renderHtml(run), /class="dial"/);

  const zh = methodView({ ...run, language: "zh-CN" });
  assert.equal(zh.title, "Verdict 独家方法");
  assert.ok(zh.rows.some((r) => r.label === "价格隐含的增长"));
  // Runs saved before analytics existed are analysed on the fly.
  const { analytics, ...old } = run;
  assert.ok(methodView(old).score);
});
