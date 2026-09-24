// The Verdict methods as display rows, shared by the terminal card, the app, Markdown and HTML.

import { fill, methodsText } from "../i18n/index.mjs";
import { analyticsOf } from "../engine/methods.mjs";

const pct = (x, sign = false) => (x === null || x === undefined || !Number.isFinite(x) ? null : `${sign && x > 0 ? "+" : ""}${Math.round(x * 10) / 10}%`);

/**
 * @returns {{title, note, score, rows: {key, label, text, tone}[], odds: Map<string, number>, oddsLabel}}
 * tone is bull | bear | hold | dim.
 */
export function methodView(run) {
  const M = methodsText(run.language);
  const a = analyticsOf(run);
  const m = run.snapshot?.methods || {};
  const rows = [];
  const score = a.score?.available ? {
    total: a.score.total,
    band: M.bands[a.score.band] || a.score.band,
    tone: a.score.total >= 55 ? "bull" : a.score.total < 45 ? "bear" : "hold",
    parts: a.score.parts.map((p) => ({ label: M.parts[p.key] || p.key, value: p.value, weight: p.weight })),
  } : null;

  const g = m.implied_growth;
  if (g?.available) {
    const implied = g.bound === "above" ? ">100%" : g.bound === "below" ? "<-50%" : pct(g.implied_growth_pct);
    rows.push({ key: "implied_growth", label: M.implied, text: `${fill(M.implied_line, { g: implied, n: g.years, h: pct(g.history_pct) })}${M.reads[g.read] ? ` · ${M.reads[g.read]}` : ""}`, tone: g.read === "demanding" ? "bear" : g.read === "undemanding" ? "bull" : "hold" });
  }
  const r = m.implied_range;
  if (r?.available) {
    const band = (x) => fill(M.range_line, { m: pct(x.move_pct), d: x.days, lo: x.low, hi: x.high });
    rows.push({ key: "implied_range", label: M.range, text: `${band(r.near)}${r.month ? ` · ${band(r.month)}` : ""}${M.range_reads[r.read] ? ` · ${M.range_reads[r.read]}` : ""}`, tone: "dim" });
  }
  const reg = m.regime;
  if (reg?.available) rows.push({ key: "regime", label: M.regime, text: `${M.trends[reg.trend]} · ${M.vols[reg.volatility]}`, tone: reg.trend === "up" ? "bull" : reg.trend === "down" ? "bear" : "hold" });
  const pay = a.payoff;
  if (pay?.available) rows.push({ key: "payoff", label: M.payoff, text: `${fill(M.payoff_line, { e: pct(pay.expected_return_pct, true), u: pct(pay.upside_pct, true), d: pct(pay.downside_pct, true), r: pay.reward_to_risk === null ? "∞" : pay.reward_to_risk.toFixed(1) })} · ${M.payoff_reads[pay.read]}`, tone: pay.read === "favourable" ? "bull" : pay.read === "unfavourable" ? "bear" : "hold" });
  const ev = a.evidence;
  if (ev?.available) rows.push({ key: "evidence", label: M.evidence, text: `${M.leans[ev.lean]} (${ev.score > 0 ? "+" : ""}${ev.score}) · ${fill(M.evidence_line, { b: ev.counts.bullish, r: ev.counts.bearish, x: ev.counts.neutral })}`, tone: ev.lean === "bullish" ? "bull" : ev.lean === "bearish" ? "bear" : "hold" });
  const au = a.audit;
  if (au?.available) {
    const serious = au.flags.filter((f) => f.severity !== "low");
    rows.push({ key: "audit", label: M.audit, text: au.flags.length ? au.flags.map((f) => M.flags[f.code] || f.code).join(" · ") : M.consistent, tone: serious.length ? "bear" : au.flags.length ? "hold" : "bull", flagged: serious.length > 0 });
  }

  const odds = new Map();
  const zo = a.zone_odds;
  if (zo?.available) for (const z of zo.zones) if (z.probability !== null) odds.set(z.range, z.probability);
  return { title: M.title, note: M.note, scoreLabel: M.score, score, rows, odds, oddsLabel: zo?.available ? fill(M.odds, { n: zo.horizon_months }) : null };
}

/** ▰▰▰▰▱▱ gauge for a 0-100 value. */
export function gauge(value, cells = 10) {
  const n = Math.max(0, Math.min(cells, Math.round((value / 100) * cells)));
  return `${"▰".repeat(n)}${"▱".repeat(cells - n)}`;
}
