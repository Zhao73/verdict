// Free text → { symbol, question }. Understands tickers from any market (NVDA, 0700.HK, 7203.T,
// BHP.AX, MC.PA), local codes (600519, 0700, 2330, 005930), exchange prefixes (SH600519,
// TYO:7203, LON:SHEL), company names in many languages (腾讯, トヨタ, 삼성전자, LVMH) and,
// as a last resort, an online symbol search.

import * as data from "./data.mjs";
import { detectLanguage } from "./i18n.mjs";
import { canonicalSymbol, localCode, marketOf, suffixOf } from "./markets.mjs";
import { findCompany } from "./names.mjs";

const TICKER = /^\^?[A-Za-z0-9]{1,6}(?:[.-][A-Za-z0-9]{1,4})?$/;
const STOP = new Set(["IS", "IT", "A", "AN", "THE", "BUY", "SELL", "HOLD", "NOW", "OR", "AND", "TO", "OF", "IN", "ON", "FOR", "ME", "MY", "I", "DO", "WHAT", "HOW", "WHY", "CAN", "SHOULD", "EPS", "PE", "AI", "CEO", "ETF", "IPO", "USD", "EUR", "JPY", "HKD", "CNY", "Q1", "Q2", "Q3", "Q4", "VS", "OK", "US", "UK", "EU"]);
const SPLIT = /[\s,，。？?！!、:：;；()（）「」『』"“”]+/;

function strip(text, token) {
  return text.replace(token, "").replace(/\s{2,}/g, " ").replace(/^[\s,，:：]+/, "").trim();
}

function prefersHome(symbol, lang, env) {
  const market = marketOf(symbol);
  if (market.code === "US") return true;
  const langOf = String(market.news?.[0] || "").split("-")[0];
  if (lang !== "en" && langOf === lang.split("-")[0]) return true;
  const country = `${env.LC_ALL || ""} ${env.LANG || ""}`.match(/_([A-Z]{2})/)?.[1];
  return Boolean(country && country === market.code);
}

export async function resolveTarget(text, { search = data.searchSymbol, language, env = process.env } = {}) {
  const raw = Array.isArray(text) ? text.join(" ") : String(text || "");
  const clean = raw.trim();
  if (!clean) return null;
  const lang = language || detectLanguage(clean);
  const tokens = clean.split(SPLIT).filter(Boolean);
  const pairs = clean.split(/[\s,，。？?！!、;；()（）]+/).filter(Boolean);

  // 1. Exchange-prefixed codes (TYO:7203) and explicit market suffixes (0700.HK, BHP.AX).
  for (const tk of pairs) {
    const local = /:/.test(tk) || /^(SH|SZ|BJ|HK|TW|KS|KQ)\d{3,6}$/i.test(tk) ? localCode(tk, { language: lang }) : null;
    if (local) return { symbol: local, question: strip(clean, tk) };
  }
  for (const tk of tokens) {
    if (TICKER.test(tk) && /\.[A-Za-z]{1,3}$/.test(tk) && (suffixOf(tk) || /\.SH$/i.test(tk))) return { symbol: data.normalizeSymbol(canonicalSymbol(tk)), question: strip(clean, tk) };
    if (/^\^[A-Za-z0-9]{2,9}$/.test(tk)) return { symbol: tk.toUpperCase(), question: strip(clean, tk) };
  }
  // 2. Bare local numeric codes (600519, 0700, 2330, 7203, 005930).
  for (const tk of tokens) {
    if (/^\d{4,6}$/.test(tk)) {
      const sym = localCode(tk, { language: lang });
      if (sym) return { symbol: sym, question: strip(clean, tk) };
    }
  }
  // 3. Upper-case tickers (NVDA, BRK-B) — the usual way people write US symbols.
  const candidates = tokens.filter((tk) => TICKER.test(tk) && /[A-Za-z]/.test(tk));
  const upper = candidates.find((tk) => tk === tk.toUpperCase() && /[A-Z]/.test(tk) && !STOP.has(tk));
  if (upper) {
    // "SAP", "LVMH", "BHP": prefer the home listing when the person's language or locale is
    // from that market; otherwise the US listing (often an ADR) is what the symbol means.
    const home = findCompany(upper);
    if (home && home.symbol !== upper && prefersHome(home.symbol, lang, env)) return { symbol: home.symbol, question: strip(clean, upper) };
    return { symbol: data.normalizeSymbol(upper), question: strip(clean, upper) };
  }
  // 4. Company names in any language (腾讯, トヨタ, 삼성전자, LVMH, Commonwealth Bank).
  const company = findCompany(clean);
  if (company) return { symbol: company.symbol, question: clean };
  // 5. A single lower-case ticker in a short request ("tsla 值得买吗").
  if (candidates.length === 1 && tokens.length <= 6 && !STOP.has(candidates[0].toUpperCase())) return { symbol: data.normalizeSymbol(candidates[0]), question: strip(clean, candidates[0]) };
  // 6. Online symbol search.
  const found = (await search(clean).catch(() => null)) || (tokens[0] ? await search(tokens[0]).catch(() => null) : null);
  return found ? { symbol: data.normalizeSymbol(canonicalSymbol(found.symbol)), question: clean } : null;
}
