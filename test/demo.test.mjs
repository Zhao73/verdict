import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isolateHome } from "./helpers.mjs";

isolateHome();
process.env.VERDICT_OFFLINE = "1";
const { research } = await import("../src/engine/pipeline.mjs");
const { createDemoBackend } = await import("../src/demo.mjs");
const { wrapText } = await import("../src/render/terminal.mjs");

test("the offline demo speaks Simplified Chinese over the same numbers", async () => {
  const backend = createDemoBackend({ speed: 0 });
  const zh = await research({ symbol: "ACME", backend, language: "zh-CN" });
  const en = await research({ symbol: "ACME", backend, language: "en" });
  assert.equal(zh.state, "complete");
  assert.match(zh.decision.conclusion, /^增持/);
  assert.match(zh.desks.business.findings[0].claim, /第二季度收入/);
  assert.match(zh.cases.bull.thesis, /复利增长/);
  assert.deepEqual(zh.decision.valuation, { ...en.decision.valuation, method: zh.decision.valuation.method });
  assert.deepEqual(zh.decision.price_levels.map((l) => l.range), en.decision.price_levels.map((l) => l.range));
  assert.equal(zh.analytics.score.total, en.analytics.score.total, "same numbers, same Verdict Score");
  assert.match(en.decision.conclusion, /^Overweight/);
});

test("CJK wrapping never starts a line with closing punctuation", () => {
  const text = "增持，但要等回调时建仓，不要追高。Acme 增长超过 20%，利润率在扩张，现金转化率超过 1 倍，盈利预测仍在上调——这是研究记录里最强的信号。";
  for (let w = 12; w <= 40; w += 1) {
    const lines = wrapText(text, w);
    assert.ok(lines.every((l) => !/^[，。、；：！？）」』]/.test(l)), `width ${w}: ${lines.join(" | ")}`);
    assert.equal(lines.join("").replace(/\s/g, ""), text.replace(/\s/g, ""), `width ${w} keeps every character`);
  }
});
