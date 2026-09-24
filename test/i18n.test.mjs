import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isolateHome } from "./helpers.mjs";

isolateHome();
const { LOCALES, LANGUAGE_CODES, detectLanguage, normalizeLanguage, languageName, ratingLabel, strings, t, deskTitle } = await import("../src/i18n/index.mjs");
const { classifyQuestion } = await import("../src/engine/intent.mjs");

function keysOf(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

test("every locale has every key the English locale has", () => {
  const ref = keysOf(LOCALES.en).filter((k) => !["code", "name", "native"].includes(k)).sort();
  assert.equal(LANGUAGE_CODES.length, 11);
  for (const code of LANGUAGE_CODES) {
    const keys = keysOf(LOCALES[code]).filter((k) => !["code", "name", "native"].includes(k)).sort();
    assert.deepEqual(keys, ref, code);
    assert.equal(LOCALES[code].ui.tips.length, 5, code);
    assert.equal(LOCALES[code].code, code);
  }
});

test("language codes and names normalize", () => {
  const cases = { "zh-hans": "zh-CN", 中文: "zh-CN", "zh-HK": "zh-TW", 繁體中文: "zh-TW", jp: "ja", kr: "ko", 한국어: "ko", "fr-CA": "fr", Deutsch: "de", "es-MX": "es", Italiano: "it", "pt-BR": "pt", Nederlands: "nl", "en-AU": "en", "en-GB": "en", sv: "sv" };
  for (const [input, code] of Object.entries(cases)) assert.equal(normalizeLanguage(input), code, input);
  assert.equal(languageName("zh-TW"), "Traditional Chinese (zh-TW)");
  assert.equal(languageName("sv"), "sv");
  assert.equal(t("sv").conclusion, "The verdict");
});

test("language is detected from what people type, then the system locale", () => {
  const env = { LANG: "en_US.UTF-8" };
  const cases = {
    "NVDA 现在值得买吗？": "zh-CN",
    "台積電現在貴嗎？": "zh-TW",
    "トヨタは割安ですか": "ja",
    "삼성전자 지금 사도 돼?": "ko",
    "Est-ce que LVMH est chère maintenant ?": "fr",
    "Ist die SAP Aktie jetzt zu teuer?": "de",
    "¿Vale la pena comprar Santander ahora?": "es",
    "Conviene comprare ENI adesso? È cara?": "it",
    "Vale a pena comprar Petrobras agora? Está cara?": "pt",
    "Is het aandeel ASML nu duur?": "nl",
    "Is NVDA a buy now?": "en",
  };
  for (const [text, code] of Object.entries(cases)) assert.equal(detectLanguage(text, env), code, text);
  assert.equal(detectLanguage("NVDA", { LANG: "de_DE.UTF-8" }), "de");
  assert.equal(detectLanguage("NVDA", { LANG: "zh_TW.UTF-8" }), "zh-TW");
  assert.equal(detectLanguage("NVDA", {}), "en");
});

test("labels, ratings and desks localize", () => {
  assert.equal(ratingLabel("Overweight", "zh-CN"), "增持");
  assert.equal(ratingLabel("Buy", "ko"), "매수");
  assert.equal(ratingLabel("Sell", "de"), "Verkaufen");
  assert.equal(deskTitle("street", "fr"), "Attentes et valorisation");
  assert.equal(strings("es").tabs.evidence, "Pruebas");
  assert.equal(strings("xx").tabs.evidence, "Evidence");
});

test("question intent works across languages", () => {
  const cases = { "삼성전자 실적 발표 전에 들고 있어도 돼?": "earnings", "LVMH est-elle surévaluée ?": "valuation", "SAP kurzfristig kaufen?": "trade", "¿Santander a largo plazo?": "long_term", "Devo vendere ENI?": "risk", "台積電財報前要抱著嗎": "earnings" };
  for (const [q, kind] of Object.entries(cases)) assert.equal(classifyQuestion(q).kind, kind, q);
});
