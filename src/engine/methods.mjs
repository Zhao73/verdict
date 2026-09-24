// Verdict methods: deterministic analysis that code runs on the facts, so the numbers that frame
// a verdict never depend on a model's arithmetic.
//
//   Before the models write (in the snapshot, cited as method:<id>):
//     implied_growth  what growth the price already assumes (reverse DCF) vs what the business delivered
//     implied_range   the move the options market prices, and whether it prices more than history
//     regime          trend × volatility state of the tape, with what it means for timing
//   After the decision (audits of the model's conclusion, in run.analytics):
//     zone_odds       the chance the price trades into each price-level zone within three months
//     payoff          probability-weighted value, upside vs downside, reward-to-risk
//     evidence        every desk finding weighted by source quality → a net evidence balance
//     audit           contradictions between rating, value, payoff, evidence and confidence
//     score           the Verdict Score: one transparent 0-100 composite of the above
//
// Every method abstains with a reason when its inputs are missing; an abstention is a gap,
// never a vote.

import { parseRange } from "./ranges.mjs";

const round = (x, d = 1) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const abstain = (id, reason) => ({ id, available: false, reason });

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
export function normCdf(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

function closes(s) {
  return (s.series || []).map((p) => (Array.isArray(p) ? p[1] : p?.close)).filter((x) => Number.isFinite(x) && x > 0);
}

/** Annualized volatility (%) of daily log returns over the last n closes. */
export function annualVol(values, n = values.length) {
  const v = values.slice(-n - 1);
  if (v.length < 21) return null;
  const r = v.slice(1).map((x, i) => Math.log(x / v[i]));
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const variance = r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

// ---------------------------------------------------------------- before the models

/**
 * Reverse DCF: solve for the ten-year cash-flow growth rate that makes a two-stage discounted
 * cash-flow model equal today's enterprise value, then compare it with the growth the company
 * actually delivered. The question is not "what is it worth" but "what must go right".
 */
export function impliedGrowth(s, { discount = 0.09, terminal = 0.025, years = 10 } = {}) {
  const id = "implied_growth";
  const f = s.fundamentals;
  if (!f) return abstain(id, "no reported financials in the snapshot");
  const r = f.ratios || {};
  const m = f.metrics || {};
  if (!(r.market_cap > 0)) return abstain(id, "no market value");
  const ev = r.market_cap - (Number.isFinite(r.net_cash) ? r.net_cash : 0);
  if (!(ev > 0)) return abstain(id, "net cash exceeds market value");
  let base = m.free_cash_flow?.value;
  let basis = "fcf";
  if (!(base > 0)) {
    base = m.net_income?.value;
    basis = "earnings";
  }
  if (!(base > 0)) return abstain(id, "cash flow and earnings are negative: the price rests on a future turn to profit");
  const value = (g) => {
    let pv = 0;
    let cf = base;
    for (let t = 1; t <= years; t += 1) {
      cf *= 1 + g;
      pv += cf / (1 + discount) ** t;
    }
    return pv + (cf * (1 + terminal)) / (discount - terminal) / (1 + discount) ** years;
  };
  let lo = -0.5;
  let hi = 1.0;
  let bound = null;
  if (value(lo) > ev) bound = "below";
  else if (value(hi) < ev) bound = "above";
  else {
    for (let i = 0; i < 80; i += 1) {
      const mid = (lo + hi) / 2;
      if (value(mid) < ev) lo = mid;
      else hi = mid;
    }
  }
  const g = bound === "below" ? -0.5 : bound === "above" ? 1.0 : (lo + hi) / 2;
  const history = r.revenue_cagr_3y_pct ?? r.revenue_growth_pct ?? null;
  const gap = Number.isFinite(history) ? round(g * 100 - history) : null;
  const read = gap === null ? "no_history" : gap > 5 ? "demanding" : gap < -5 ? "undemanding" : "in_line";
  return {
    id, available: true, implied_growth_pct: round(g * 100), bound, basis, base_value: base, enterprise_value: ev,
    discount_pct: discount * 100, terminal_pct: terminal * 100, years, history_pct: history, gap_pp: gap, read,
  };
}

/** The move options price by the nearest expiry and about a month out, from at-the-money IV. */
export function impliedRange(s) {
  const id = "implied_range";
  const o = s.options;
  const price = s.quote?.price ?? o?.spot;
  const term = (o?.term_structure || []).filter((x) => x.days >= 3 && x.atm_iv_pct > 0);
  if (!term.length || !(price > 0)) return abstain(id, o ? "no usable implied volatility" : "no options data");
  const band = (x) => {
    const move = (x.atm_iv_pct / 100) * Math.sqrt(x.days / 365);
    return { days: x.days, iv_pct: x.atm_iv_pct, move_pct: round(move * 100), low: round(price * Math.exp(-move), 2), high: round(price * Math.exp(move), 2) };
  };
  const near = [...term].sort((a, b) => a.days - b.days)[0];
  const month = [...term].sort((a, b) => Math.abs(a.days - 30) - Math.abs(b.days - 30))[0];
  const realized = s.technicals?.realized_vol_30d_pct ?? annualVol(closes(s), 30);
  const ratio = realized ? round(month.atm_iv_pct / realized, 2) : null;
  const read = ratio === null ? "no_history" : ratio > 1.25 ? "event_priced" : ratio < 0.8 ? "complacent" : "fair";
  return { id, available: true, price, near: band(near), month: month === near ? null : band(month), realized_vol_pct: round(realized), iv_to_realized: ratio, read };
}

/** Trend (price and 50-day vs 200-day average) × volatility (30-day vs longer-run). */
export function regime(s) {
  const id = "regime";
  const t = s.technicals;
  if (!t) return abstain(id, "no price history");
  const above = t.pct_vs_sma200;
  const cross = t.sma50 && t.sma200 ? t.sma50 - t.sma200 : null;
  if (!Number.isFinite(above) || cross === null) return abstain(id, "not enough history for a 200-day average");
  const trend = above > 0 && cross > 0 ? "up" : above < 0 && cross < 0 ? "down" : "turning";
  const series = closes(s);
  const longVol = t.realized_vol_90d_pct ?? annualVol(series);
  const shortVol = t.realized_vol_30d_pct ?? annualVol(series, 30);
  const ratio = longVol && shortVol ? shortVol / longVol : null;
  const vol = ratio === null ? "normal" : ratio > 1.25 ? "stormy" : ratio < 0.8 ? "calm" : "normal";
  return { id, available: true, trend, volatility: vol, pct_vs_sma200: above, vol_30d_pct: round(shortVol), vol_long_pct: round(longVol), vol_ratio: round(ratio, 2) };
}

export const SNAPSHOT_METHODS = ["implied_growth", "implied_range", "regime"];

export function snapshotMethods(s) {
  return { implied_growth: impliedGrowth(s), implied_range: impliedRange(s), regime: regime(s) };
}

const REGIME_NOTE = {
  "up/calm": "orderly uptrend: pullbacks toward the 50-day average have been the entries",
  "up/normal": "uptrend: the tape confirms a positive thesis",
  "up/stormy": "uptrend under stress: volatility is rising, size smaller and expect shakeouts",
  "down/calm": "quiet downtrend: selling without panic, often slow to end",
  "down/normal": "downtrend: the tape fights a positive thesis; wait for the 200-day to be reclaimed",
  "down/stormy": "disorderly decline: capitulation risk and opportunity; stage entries",
  "turning/calm": "trend turning quietly: confirmation is a close above or below the 200-day",
  "turning/normal": "trend turning: moving averages disagree",
  "turning/stormy": "trend turning in high volatility: wide ranges, patience pays",
};

/** One line per method for prompts; each carries the ID a claim should cite. */
export function methodBrief(methods = {}) {
  const L = [];
  const g = methods.implied_growth;
  if (g?.available) {
    const basis = g.basis === "fcf" ? "free cash flow" : "earnings";
    const imp = g.bound === "above" ? "more than 100%/yr" : g.bound === "below" ? "a decline of more than 50%/yr" : `${g.implied_growth_pct}%/yr`;
    L.push(`[method:implied_growth] reverse DCF: today's enterprise value implies ${imp} ${basis} growth for ${g.years} years (discount ${g.discount_pct}%, terminal ${g.terminal_pct}%)${g.history_pct !== null ? `; the business grew revenue ${g.history_pct}%/yr → gap ${g.gap_pp > 0 ? "+" : ""}${g.gap_pp} pp: expectations are ${g.read.replace("_", " ")}` : ""}`);
  } else if (g) L.push(`[method:implied_growth] abstains: ${g.reason}`);
  const r = methods.implied_range;
  if (r?.available) {
    const b = (x) => `±${x.move_pct}% by ${x.days}d (${x.low}–${x.high}, IV ${x.iv_pct}%)`;
    L.push(`[method:implied_range] options price ${b(r.near)}${r.month ? `; ${b(r.month)}` : ""}${r.iv_to_realized !== null ? `; implied/realized volatility ${r.iv_to_realized} → ${r.read.replace("_", " ")}` : ""}`);
  } else if (r) L.push(`[method:implied_range] abstains: ${r.reason}`);
  const m = methods.regime;
  if (m?.available) L.push(`[method:regime] ${m.trend} trend · ${m.volatility} volatility (price ${m.pct_vs_sma200 > 0 ? "+" : ""}${m.pct_vs_sma200}% vs 200-day; 30d vol ${m.vol_30d_pct}% vs ${m.vol_long_pct}% longer-run) — ${REGIME_NOTE[`${m.trend}/${m.volatility}`]}`);
  else if (m) L.push(`[method:regime] abstains: ${m.reason}`);
  return L;
}

// ---------------------------------------------------------------- after the decision

/** Volatility for forward odds: options IV nearest 30-90 days, else realized. */
function forwardVol(s) {
  const term = (s.options?.term_structure || []).filter((x) => x.atm_iv_pct > 0);
  const iv = [...term].sort((a, b) => Math.abs(a.days - 60) - Math.abs(b.days - 60))[0];
  if (iv) return { sigma: iv.atm_iv_pct / 100, source: "options" };
  const rv = s.technicals?.realized_vol_90d_pct ?? s.technicals?.realized_vol_30d_pct ?? annualVol(closes(s));
  return rv ? { sigma: rv / 100, source: "history" } : null;
}

/**
 * Probability that the price trades into each zone within `years` (touch probability of a
 * driftless lognormal walk, reflection principle). A zone the price is in reads 100%.
 */
export function zoneOdds(decision, s, { years = 0.25 } = {}) {
  const id = "zone_odds";
  const price = s.quote?.price;
  const vol = forwardVol(s);
  if (!decision?.price_levels?.length || !(price > 0)) return abstain(id, "no price or price levels");
  if (!vol) return abstain(id, "no volatility estimate");
  const sd = vol.sigma * Math.sqrt(years);
  const zones = decision.price_levels.map((l) => {
    const r = parseRange(l.range);
    if (!r) return { range: l.range, action: l.action, probability: null };
    const [lo, hi] = r;
    let p;
    if ((lo === null || price >= lo) && (hi === null || price <= hi)) p = 1;
    else if (hi !== null && hi < price) p = 2 * normCdf(Math.log(hi / price) / sd);
    else p = 2 * (1 - normCdf(Math.log(lo / price) / sd));
    return { range: l.range, action: l.action, probability: round(clamp(p, 0, 1) * 100, 0), here: p === 1 };
  });
  return { id, available: true, horizon_months: Math.round(years * 12), vol_pct: round(vol.sigma * 100), vol_source: vol.source, zones };
}

/** Scenario-weighted value (bear 25% · base 50% · bull 25%), upside vs downside. */
export function payoff(decision, s, { weights = [0.25, 0.5, 0.25] } = {}) {
  const id = "payoff";
  const v = decision?.valuation;
  const price = s.quote?.price;
  if (!v || ![v.bear, v.base, v.bull].every(Number.isFinite) || !(price > 0)) return abstain(id, "no valuation or price");
  const expected = weights[0] * v.bear + weights[1] * v.base + weights[2] * v.bull;
  const up = (v.bull / price - 1) * 100;
  const down = (v.bear / price - 1) * 100;
  const ratio = down < 0 ? up / -down : null;
  const exp = (expected / price - 1) * 100;
  const read = exp < -5 || (ratio !== null && ratio < 0.8) ? "unfavourable" : exp > 5 && (ratio === null || ratio >= 2) ? "favourable" : "balanced";
  return { id, available: true, weights, expected_value: round(expected, 2), expected_return_pct: round(exp), upside_pct: round(up), downside_pct: round(down), reward_to_risk: ratio === null ? null : round(ratio, 2), read };
}

const PRIMARY = /sec\.gov|hkexnews|cninfo|edinet|disclosure\.edinet|tdnet|dart\.fss|mops\.twse|asx\.com\.au|londonstockexchange|companieshouse|sedarplus|nseindia|bseindia|sgx\.com|investors?\.|\/investors?\b|\/ir\b|\bir\./i;
const MAJOR = /reuters|bloomberg|ft\.com|wsj\.com|nikkei|cnbc|barrons|marketwatch|economist|caixin|yicai|scmp|handelsblatt|lesechos|afr\.com|yonhap|koreaherald/i;

/** Weight of one citation: filings and code-fetched data count most, unknown web pages least. */
export function sourceQuality(id, desks = {}) {
  if (/^data:/.test(id)) return 1;
  if (/^(method|lens):/.test(id)) return 0.9;
  if (/^news:/.test(id)) return 0.6;
  const [desk, local] = id.split(":");
  const url = desks[desk]?.sources?.find((x) => x.id === local)?.url || "";
  return PRIMARY.test(url) ? 1 : MAJOR.test(url) ? 0.8 : 0.6;
}

/** Net balance of the research record in [-1, 1]; neutral findings dilute it. */
export function evidenceBalance(run) {
  const id = "evidence";
  const desks = Object.fromEntries(Object.entries(run.desks || {}).filter(([, p]) => p));
  const dir = { bullish: 1, bearish: -1, neutral: 0, mixed: 0 };
  let num = 0;
  let den = 0;
  const counts = { bullish: 0, bearish: 0, neutral: 0 };
  const byDesk = {};
  for (const [desk, p] of Object.entries(desks)) {
    let dn = 0;
    let dd = 0;
    for (const f of p.findings || []) {
      const q = Math.max(...(f.sources || []).map((x) => sourceQuality(x, desks)), 0.5) * ((f.sources || []).length > 1 ? 1.15 : 1);
      const d = dir[f.impact] ?? 0;
      num += d * q;
      den += q;
      dn += d * q;
      dd += q;
      counts[d > 0 ? "bullish" : d < 0 ? "bearish" : "neutral"] += 1;
    }
    byDesk[desk] = dd ? round(dn / dd, 2) : null;
  }
  if (!den) return abstain(id, "no sourced findings");
  const score = num / den;
  const values = Object.values(byDesk).filter((x) => x !== null);
  const split = values.length > 1 && Math.max(...values) - Math.min(...values) >= 1;
  return { id, available: true, score: round(score, 2), lean: score > 0.15 ? "bullish" : score < -0.15 ? "bearish" : "balanced", counts, by_desk: byDesk, split };
}

const DIRECTION = { Buy: 1, Overweight: 1, Hold: 0, Underweight: -1, Sell: -1 };

/** Code-checked contradictions. The rating is never changed; tension is shown to the reader. */
export function audit(run, { pay, evidence }) {
  const d = run.decision;
  if (!d) return abstain("audit", "no decision");
  const dir = DIRECTION[d.rating] ?? 0;
  const price = run.snapshot?.quote?.price;
  const base = d.valuation?.base;
  const flags = [];
  if (evidence?.available && dir > 0 && evidence.score < -0.15) flags.push({ code: "rating_vs_evidence", severity: "high" });
  if (evidence?.available && dir < 0 && evidence.score > 0.15) flags.push({ code: "rating_vs_evidence", severity: "high" });
  if (price > 0 && Number.isFinite(base) && dir > 0 && price > base * 1.02) flags.push({ code: "rating_vs_value", severity: "medium" });
  if (price > 0 && Number.isFinite(base) && dir < 0 && price < base * 0.98) flags.push({ code: "rating_vs_value", severity: "medium" });
  if (pay?.available && dir > 0 && pay.expected_return_pct < 0) flags.push({ code: "rating_vs_payoff", severity: "medium" });
  if (pay?.available && dir < 0 && pay.expected_return_pct > 10) flags.push({ code: "rating_vs_payoff", severity: "medium" });
  const failed = Object.keys(run.failures || {}).length;
  if (d.confidence === "high" && ((d.gaps || []).length >= 3 || failed)) flags.push({ code: "confidence_vs_gaps", severity: "low" });
  if (evidence?.split) flags.push({ code: "desks_split", severity: "low" });
  return { id: "audit", available: true, status: flags.some((f) => f.severity !== "low") ? "tension" : "consistent", flags };
}

/**
 * The Verdict Score: value (payoff) 35% · evidence 30% · fundamentals (method lenses) 20% ·
 * tape (regime) 15%, re-weighted over what is available. A cross-check on the rating, never a
 * replacement for it.
 */
export function verdictScore({ pay, evidence, lenses = [], reg }) {
  const parts = [];
  if (pay?.available) parts.push({ key: "value", weight: 0.35, value: clamp(50 + (pay.expected_return_pct * 5) / 3, 0, 100) });
  if (evidence?.available) parts.push({ key: "evidence", weight: 0.3, value: 50 + 50 * evidence.score });
  const fundamental = lenses.filter((l) => l.score !== null && l.family !== "technical");
  if (fundamental.length) parts.push({ key: "fundamentals", weight: 0.2, value: (100 * fundamental.reduce((a, l) => a + l.score, 0)) / fundamental.length });
  if (reg?.available) parts.push({ key: "tape", weight: 0.15, value: clamp({ up: 75, turning: 50, down: 25 }[reg.trend] + { calm: 5, normal: 0, stormy: -10 }[reg.volatility], 0, 100) });
  if (parts.length < 2) return abstain("score", "fewer than two components available");
  const w = parts.reduce((a, p) => a + p.weight, 0);
  const total = Math.round(parts.reduce((a, p) => a + p.value * p.weight, 0) / w);
  const band = total >= 70 ? "strong" : total >= 55 ? "positive" : total >= 45 ? "neutral" : total >= 30 ? "weak" : "poor";
  return { id: "score", available: true, total, band, parts: parts.map((p) => ({ key: p.key, weight: round(p.weight / w, 2), value: Math.round(p.value) })) };
}

/** Everything computed after a run: stored on run.analytics and rendered with the verdict. */
export function analyzeRun(run) {
  const s = run.snapshot || {};
  const methods = s.methods || snapshotMethods(s);
  const evidence = evidenceBalance(run);
  if (!run.decision) return { evidence };
  const pay = payoff(run.decision, s);
  return {
    zone_odds: zoneOdds(run.decision, s),
    payoff: pay,
    evidence,
    audit: audit(run, { pay, evidence }),
    score: verdictScore({ pay, evidence, lenses: s.lenses || [], reg: methods.regime }),
  };
}

/** Stored analytics, or computed on the fly for runs saved before they existed. */
export function analyticsOf(run) {
  if (run.analytics && !run.analytics.error) return run.analytics;
  try {
    return analyzeRun(run);
  } catch {
    return {};
  }
}
