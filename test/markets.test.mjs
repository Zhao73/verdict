import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isolateHome } from "./helpers.mjs";

isolateHome();
const { localCode, marketOf, canonicalSymbol, newsEdition } = await import("../src/engine/markets.mjs");
const { findCompany } = await import("../src/engine/names.mjs");
const { resolveTarget } = await import("../src/engine/target.mjs");
const { setFetch } = await import("../src/engine/http.mjs");
const data = await import("../src/engine/data.mjs");
const { buildSnapshot, snapshotBrief } = await import("../src/engine/snapshot.mjs");

test("local codes and exchange prefixes", () => {
  const cases = [["600519", "en", "600519.SS"], ["000001", "en", "000001.SZ"], ["005930", "ko", "005930.KS"], ["0700", "zh-CN", "0700.HK"], ["00700", "en", "0700.HK"], ["2330", "zh-TW", "2330.TW"], ["7203", "ja", "7203.T"], ["SH600519", "en", "600519.SS"], ["HK700", "en", "0700.HK"], ["TYO:7203", "en", "7203.T"], ["LON:SHEL", "en", "SHEL.L"], ["EPA:MC", "en", "MC.PA"], ["ETR:SAP", "en", "SAP.DE"], ["ASX:BHP", "en", "BHP.AX"], ["KRX:005930", "en", "005930.KS"], ["NVDA", "en", null]];
  for (const [t, language, want] of cases) assert.equal(localCode(t, { language }), want, t);
  assert.equal(canonicalSymbol("700.hk"), "0700.HK");
  assert.equal(canonicalSymbol("600519.SH"), "600519.SS");
});

test("markets know currency, filings and news edition", () => {
  assert.equal(marketOf("0700.HK").currency, "HKD");
  assert.match(marketOf("7203.T").filings, /EDINET/);
  assert.match(marketOf("005930.KS").filings, /DART/);
  assert.equal(marketOf("BHP.AX").code, "AU");
  assert.equal(marketOf("MC.PA").code, "FR");
  assert.equal(marketOf("^N225").code, "JP");
  assert.equal(marketOf("AAPL").code, "US");
  assert.deepEqual(newsEdition("2330.TW"), { hl: "zh-TW", gl: "TW", ceid: "TW:zh-Hant" });
});

test("company names in many languages", () => {
  const cases = { 腾讯: "0700.HK", 騰訊控股: "0700.HK", 台積電: "2330.TW", トヨタ自動車: "7203.T", 삼성전자: "005930.KS", "Commonwealth Bank": "CBA.AX", nestlé: "NESN.SW", 贵州茅台: "600519.SS", 英伟达: "NVDA" };
  for (const [name, sym] of Object.entries(cases)) assert.equal(findCompany(name)?.symbol, sym, name);
  assert.equal(findCompany("vale a pena comprar agora"), null);
  assert.equal(findCompany("the total return"), null);
});

test("free text resolves to the right listing", async () => {
  const none = async () => null;
  const env = { LANG: "en_US.UTF-8" };
  const cases = [
    ["腾讯现在值得买吗？", "0700.HK"], ["台積電現在貴嗎", "2330.TW"], ["2330 能買嗎", "2330.TW"], ["トヨタは割安ですか", "7203.T"],
    ["삼성전자 지금 사도 돼?", "005930.KS"], ["005930 실적", "005930.KS"], ["600519 估值", "600519.SS"], ["0700 贵吗", "0700.HK"],
    ["LVMH est-elle chère ?", "MC.PA"], ["Ist SAP teuer?", "SAP.DE"], ["¿Vale la pena comprar Santander?", "SAN.MC"],
    ["Vale a pena comprar Petrobras agora?", "PETR4.SA"], ["BHP worth buying?", "BHP"], ["LON:SHEL cheap?", "SHEL.L"], ["is AAPL a buy?", "AAPL"],
  ];
  for (const [q, sym] of cases) assert.equal((await resolveTarget(q, { search: none, env })).symbol, sym, q);
  assert.equal((await resolveTarget("BHP worth buying?", { search: none, env: { LANG: "en_AU.UTF-8" } })).symbol, "BHP.AX");
});

test("London pence quotes are converted to pounds", async () => {
  const now = Math.floor(Date.now() / 1000);
  const restore = setFetch(async () => new Response(JSON.stringify({ chart: { result: [{ meta: { currency: "GBp", regularMarketPrice: 2650, chartPreviousClose: 2600, fiftyTwoWeekHigh: 2900, fiftyTwoWeekLow: 2300, regularMarketTime: now }, timestamp: [now - 86400, now], indicators: { quote: [{ close: [2600, 2650], volume: [1, 1] }] } }] } })));
  try {
    const q = await data.getQuote("SHEL.L");
    assert.equal(q.currency, "GBP");
    assert.equal(q.price, 26.5);
    assert.equal(q.high_52w, 29);
  } finally {
    restore();
  }
});

test("non-US snapshot: market line, local-edition news merged, filings gap names the regulator", async () => {
  const seen = [];
  const now = Math.floor(Date.now() / 1000);
  const d = new Date(Date.now() - 86400e3).toUTCString();
  const restore = setFetch(async (url) => {
    const u = String(url);
    seen.push(u);
    const json = (o) => new Response(JSON.stringify(o));
    if (u.includes("/v1/finance/search")) return json({ quotes: [{ symbol: "0700.HK", quoteType: "EQUITY", longname: "Tencent Holdings Limited", exchDisp: "HKSE" }] });
    if (u.includes("/v8/finance/chart")) return json({ chart: { result: [{ meta: { currency: "HKD", regularMarketPrice: 520, regularMarketTime: now }, timestamp: [now - 86400, now], indicators: { quote: [{ close: [510, 520], volume: [1, 1] }] } }] } });
    if (u.includes("news.google.com") && u.includes("gl=HK")) return new Response(`<rss><item><title>騰訊業績勝預期</title><link>https://x.test/hk</link><pubDate>${d}</pubDate></item></rss>`);
    if (u.includes("news.google.com")) return new Response(`<rss><item><title>Tencent beats estimates</title><link>https://x.test/en</link><pubDate>${d}</pubDate></item></rss>`);
    return new Response("no", { status: 404 });
  });
  data.resetSecTickerCache();
  try {
    const s = await buildSnapshot("0700.HK");
    assert.equal(s.market.code, "HK");
    assert.equal(s.market.currency, "HKD");
    assert.deepEqual(s.news.map((n) => n.title).sort(), ["Tencent beats estimates", "騰訊業績勝預期"]);
    assert.ok(seen.some((u) => /hl=zh-HK&gl=HK/.test(u) && u.includes(encodeURIComponent('"騰訊"'))));
    assert.ok(s.gaps.some((g) => /HKEXnews/.test(g)));
    assert.match(snapshotBrief(s), /Market: Hong Kong · HKEX · quoted in HKD/);
  } finally {
    restore();
  }
});
