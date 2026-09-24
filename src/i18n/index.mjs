// Languages. Every label a person sees comes from one locale file; models write prose in the
// same language. Unknown language codes still work: models write in them, labels fall back to
// English.

import de from "./de.mjs";
import en from "./en.mjs";
import es from "./es.mjs";
import fr from "./fr.mjs";
import it from "./it.mjs";
import ja from "./ja.mjs";
import ko from "./ko.mjs";
import nl from "./nl.mjs";
import pt from "./pt.mjs";
import zhCN from "./zh-CN.mjs";
import zhTW from "./zh-TW.mjs";

export const LOCALES = { en, "zh-CN": zhCN, "zh-TW": zhTW, ja, ko, fr, de, es, it, pt, nl };
export const LANGUAGE_CODES = Object.keys(LOCALES);

const ALIASES = [
  [/^(en|en[-_](us|gb|uk|au|nz|ca|ie|in|sg)|english)$/i, "en"],
  [/^(zh|zh[-_](cn|sg|hans)|cn|chinese|中文|简体|简体中文|汉语)$/i, "zh-CN"],
  [/^(zh[-_](tw|hk|mo|hant)|tw|hk|traditional|繁體|繁體中文|繁体中文|正體中文)$/i, "zh-TW"],
  [/^(ja|jp|ja[-_]jp|japanese|日本語)$/i, "ja"],
  [/^(ko|kr|ko[-_]kr|korean|한국어|韩语|韓語)$/i, "ko"],
  [/^(fr|fr[-_](fr|ca|be|ch)|french|français|francais)$/i, "fr"],
  [/^(de|de[-_](de|at|ch)|german|deutsch)$/i, "de"],
  [/^(es|es[-_]\w{2,3}|spanish|español|espanol)$/i, "es"],
  [/^(it|it[-_](it|ch)|italian|italiano)$/i, "it"],
  [/^(pt|pt[-_](br|pt)|portuguese|português|portugues)$/i, "pt"],
  [/^(nl|nl[-_](nl|be)|dutch|nederlands|flemish)$/i, "nl"],
];

export function normalizeLanguage(raw) {
  const s = String(raw || "").trim();
  if (!s) return "en";
  for (const [re, code] of ALIASES) if (re.test(s)) return code;
  return s;
}

export function locale(language) {
  const code = normalizeLanguage(language);
  return LOCALES[code] || LOCALES[code.split("-")[0]] || en;
}

/** Name for prompts: "Traditional Chinese (zh-TW)"; unknown codes pass through. */
export function languageName(language) {
  const code = normalizeLanguage(language);
  return LOCALES[code] ? `${LOCALES[code].name} (${code})` : code;
}

export const t = (language) => locale(language).report;
export const strings = (language) => locale(language).ui;
export const deskTitle = (desk, language) => locale(language).desks[desk] || en.desks[desk] || desk;
export const ratingLabel = (rating, language) => locale(language).ratings[rating] || rating;
export const stanceLabel = (stance, language) => locale(language).stances[stance] || stance;

// ------------------------------------------------------------------ detection

// Characters that exist only in Traditional Chinese (their Simplified forms differ).
const TRADITIONAL = /[們這個會對說時發國來學嗎麼為買賣貴價現錢應該還體與開關問題據漲跌點線業務財報際條產廠營億萬幣當後從認識騰訊電積臺灣護銀豐貨車東華龍門鐵經濟聯網環資證險權頭議選導參無書長馬鳥魚麥黨醫藥療創輪幾樣實灣場鏈動險盤壓觀雙隻隊陽陰億歲戰藝應]/;

const WORDS = {
  en: /\b(is|the|a|an|buy|sell|stock|should|now|cheap|expensive|worth|what|how|it|i|this|good)\b/gi,
  de: /\b(ist|der|die|das|und|nicht|kaufen|aktie|lohnt|sich|jetzt|wie|teuer|günstig|sollte|ich|noch|einen|eine)\b|[äöüß]/gi,
  fr: /\b(est|le|la|les|une|des|acheter|action|cher|chère|vaut|faut|il|pour|que|maintenant|est-ce|c'est|bon)\b|[èêàç]/gi,
  es: /\b(es|el|la|los|las|una|comprar|acción|caro|cara|vale|pena|ahora|debo|para|qué|está|buena)\b|[ñ¿¡]/gi,
  it: /\b(è|il|lo|gli|una|comprare|azione|caro|cara|conviene|adesso|ora|devo|per|che|sono|questo)\b/gi,
  pt: /\b(é|o|os|as|uma|comprar|ação|caro|cara|vale|pena|agora|devo|para|que|está|boa)\b|[ãõ]/gi,
  nl: /\b(is|het|de|een|kopen|aandeel|duur|nu|moet|ik|waard|goedkoop|van|wel|nog)\b/gi,
};

function fromLocale(env) {
  const loc = `${env.LC_ALL || ""} ${env.LC_MESSAGES || ""} ${env.LANG || ""}`.trim();
  const m = loc.match(/\b([a-z]{2})(?:[_-]([A-Z]{2}))?/);
  if (!m) return "en";
  if (m[1] === "zh") return /TW|HK|MO/.test(m[2] || "") ? "zh-TW" : "zh-CN";
  return LOCALES[m[1]] ? m[1] : "en";
}

/** Guess the language from the user's own words, then from the system locale. */
export function detectLanguage(text = "", env = process.env) {
  const s = String(text || "");
  if (/[가-힣ᄀ-ᇿ㄰-㆏]/.test(s)) return "ko";
  if (/[぀-ヿ]/.test(s)) return "ja";
  if (/[一-鿿]/.test(s)) return TRADITIONAL.test(s) ? "zh-TW" : "zh-CN";
  // Latin script: score function words; tickers and numbers do not count.
  const words = s.replace(/\b[A-Z0-9.^-]{1,10}\b/g, " ");
  let best = null;
  let bestScore = 0;
  for (const [code, re] of Object.entries(WORDS)) {
    const score = (words.match(re) || []).length;
    if (score > bestScore) {
      best = code;
      bestScore = score;
    }
  }
  if (best && best !== "en" && bestScore >= 2) return best;
  if (best === "en" && bestScore >= 2) return "en";
  return fromLocale(env);
}
