// Markets: which exchange a symbol trades on, its currency, where its filings live and which
// Google News edition covers it. Also turns local ways of writing a code (600519, 0700, 2330,
// 7203, 005930, SH600519, TYO:7203, LON:SHEL) into the Yahoo-style symbol the data layer uses.

const M = (code, country, exchange, currency, news, filings, standard) => ({ code, country, exchange, currency, news, filings, standard });

export const MARKETS = {
  "": M("US", "United States", "NYSE / Nasdaq", "USD", ["en-US", "US", "US:en"], "SEC EDGAR (10-K, 10-Q, 8-K)", "US GAAP"),
  ".SS": M("CN", "China", "Shanghai", "CNY", ["zh-CN", "CN", "CN:zh-Hans"], "CNINFO 巨潮资讯 / SSE announcements", "CAS"),
  ".SZ": M("CN", "China", "Shenzhen", "CNY", ["zh-CN", "CN", "CN:zh-Hans"], "CNINFO 巨潮资讯 / SZSE announcements", "CAS"),
  ".BJ": M("CN", "China", "Beijing", "CNY", ["zh-CN", "CN", "CN:zh-Hans"], "CNINFO 巨潮资讯 / BSE announcements", "CAS"),
  ".HK": M("HK", "Hong Kong", "HKEX", "HKD", ["zh-HK", "HK", "HK:zh-Hant"], "HKEXnews 披露易", "HKFRS / IFRS"),
  ".TW": M("TW", "Taiwan", "TWSE", "TWD", ["zh-TW", "TW", "TW:zh-Hant"], "MOPS 公開資訊觀測站", "TIFRS"),
  ".TWO": M("TW", "Taiwan", "TPEx", "TWD", ["zh-TW", "TW", "TW:zh-Hant"], "MOPS 公開資訊觀測站", "TIFRS"),
  ".T": M("JP", "Japan", "Tokyo", "JPY", ["ja", "JP", "JP:ja"], "EDINET / TDnet (決算短信, 有価証券報告書)", "J-GAAP / IFRS"),
  ".KS": M("KR", "South Korea", "KOSPI", "KRW", ["ko", "KR", "KR:ko"], "DART 전자공시", "K-IFRS"),
  ".KQ": M("KR", "South Korea", "KOSDAQ", "KRW", ["ko", "KR", "KR:ko"], "DART 전자공시", "K-IFRS"),
  ".SI": M("SG", "Singapore", "SGX", "SGD", ["en-SG", "SG", "SG:en"], "SGXNet announcements", "SFRS(I)"),
  ".NS": M("IN", "India", "NSE", "INR", ["en-IN", "IN", "IN:en"], "NSE / BSE filings", "Ind AS"),
  ".BO": M("IN", "India", "BSE", "INR", ["en-IN", "IN", "IN:en"], "BSE filings", "Ind AS"),
  ".AX": M("AU", "Australia", "ASX", "AUD", ["en-AU", "AU", "AU:en"], "ASX announcements", "AASB (IFRS)"),
  ".NZ": M("NZ", "New Zealand", "NZX", "NZD", ["en-NZ", "NZ", "NZ:en"], "NZX announcements", "NZ IFRS"),
  ".L": M("GB", "United Kingdom", "London", "GBP", ["en-GB", "GB", "GB:en"], "RNS / Companies House", "IFRS"),
  ".IL": M("GB", "United Kingdom", "London (IOB)", "USD", ["en-GB", "GB", "GB:en"], "RNS", "IFRS"),
  ".IR": M("IE", "Ireland", "Euronext Dublin", "EUR", ["en-IE", "IE", "IE:en"], "Euronext Dublin / company IR", "IFRS"),
  ".PA": M("FR", "France", "Euronext Paris", "EUR", ["fr", "FR", "FR:fr"], "AMF / Euronext / company IR (document d'enregistrement universel)", "IFRS"),
  ".DE": M("DE", "Germany", "XETRA", "EUR", ["de", "DE", "DE:de"], "Unternehmensregister / company IR (Geschäftsbericht)", "IFRS"),
  ".F": M("DE", "Germany", "Frankfurt", "EUR", ["de", "DE", "DE:de"], "Unternehmensregister / company IR", "IFRS"),
  ".AS": M("NL", "Netherlands", "Euronext Amsterdam", "EUR", ["nl", "NL", "NL:nl"], "AFM / company IR (jaarverslag)", "IFRS"),
  ".BR": M("BE", "Belgium", "Euronext Brussels", "EUR", ["fr", "BE", "BE:fr"], "FSMA / company IR", "IFRS"),
  ".MC": M("ES", "Spain", "Madrid", "EUR", ["es", "ES", "ES:es"], "CNMV / company IR", "IFRS"),
  ".MI": M("IT", "Italy", "Borsa Italiana", "EUR", ["it", "IT", "IT:it"], "CONSOB / company IR", "IFRS"),
  ".LS": M("PT", "Portugal", "Euronext Lisbon", "EUR", ["pt-PT", "PT", "PT:pt-150"], "CMVM / company IR", "IFRS"),
  ".VI": M("AT", "Austria", "Vienna", "EUR", ["de", "AT", "AT:de"], "FMA / company IR", "IFRS"),
  ".SW": M("CH", "Switzerland", "SIX", "CHF", ["de", "CH", "CH:de"], "SIX / company IR", "IFRS / Swiss GAAP FER"),
  ".ST": M("SE", "Sweden", "Nasdaq Stockholm", "SEK", ["sv", "SE", "SE:sv"], "Finansinspektionen / company IR", "IFRS"),
  ".CO": M("DK", "Denmark", "Nasdaq Copenhagen", "DKK", ["da", "DK", "DK:da"], "Finanstilsynet / company IR", "IFRS"),
  ".OL": M("NO", "Norway", "Oslo Børs", "NOK", ["no", "NO", "NO:no"], "Newsweb / company IR", "IFRS"),
  ".HE": M("FI", "Finland", "Nasdaq Helsinki", "EUR", ["fi", "FI", "FI:fi"], "company IR", "IFRS"),
  ".TO": M("CA", "Canada", "TSX", "CAD", ["en-CA", "CA", "CA:en"], "SEDAR+", "IFRS"),
  ".V": M("CA", "Canada", "TSX Venture", "CAD", ["en-CA", "CA", "CA:en"], "SEDAR+", "IFRS"),
  ".SA": M("BR", "Brazil", "B3", "BRL", ["pt-BR", "BR", "BR:pt-419"], "CVM / RI da empresa", "IFRS"),
  ".MX": M("MX", "Mexico", "BMV", "MXN", ["es-419", "MX", "MX:es-419"], "BMV / company IR", "IFRS"),
};

const INDEX_MARKET = {
  "^N225": ".T", "^TOPX": ".T", "^HSI": ".HK", "^HSCE": ".HK", "^TWII": ".TW", "^KS11": ".KS", "^KQ11": ".KQ",
  "^FTSE": ".L", "^GDAXI": ".DE", "^FCHI": ".PA", "^STOXX50E": ".DE", "^AEX": ".AS", "^IBEX": ".MC", "^FTSEMIB.MI": ".MI",
  "^SSMI": ".SW", "^AXJO": ".AX", "^AORD": ".AX", "^NZ50": ".NZ", "^GSPTSE": ".TO", "^BVSP": ".SA", "^MXX": ".MX",
  "^NSEI": ".NS", "^BSESN": ".BO", "^STI": ".SI", "000001.SS": ".SS", "000300.SS": ".SS", "399001.SZ": ".SZ",
};

const PREFIX = {
  SH: ".SS", SS: ".SS", SSE: ".SS", SHA: ".SS", SZ: ".SZ", SZSE: ".SZ", SHE: ".SZ", BJ: ".BJ",
  HK: ".HK", HKG: ".HK", HKEX: ".HK", TPE: ".TW", TW: ".TW", TWSE: ".TW", TPEX: ".TWO",
  TYO: ".T", TSE: ".T", JP: ".T", JPX: ".T", KRX: ".KS", KS: ".KS", KOSPI: ".KS", KOSDAQ: ".KQ", KQ: ".KQ",
  SGX: ".SI", NSE: ".NS", BOM: ".BO", BSE: ".BO", ASX: ".AX", NZX: ".NZ",
  LON: ".L", LSE: ".L", EPA: ".PA", PAR: ".PA", ETR: ".DE", XETRA: ".DE", FRA: ".F", AMS: ".AS", EBR: ".BR",
  BME: ".MC", MCE: ".MC", BIT: ".MI", MIL: ".MI", ELI: ".LS", VIE: ".VI", SWX: ".SW", SIX: ".SW",
  STO: ".ST", CPH: ".CO", OSL: ".OL", HEL: ".HE", TSX: ".TO", TSXV: ".V", CVE: ".V", BVMF: ".SA", B3: ".SA", BMV: ".MX",
};

export function suffixOf(symbol) {
  const s = String(symbol).toUpperCase();
  if (INDEX_MARKET[s]) return INDEX_MARKET[s];
  const m = s.match(/(\.[A-Z]{1,3})$/);
  return m && MARKETS[m[1]] ? m[1] : "";
}

export function marketOf(symbol) {
  const suffix = suffixOf(symbol);
  return { suffix, ...MARKETS[suffix] };
}

/** Pad Hong Kong codes to Yahoo's four digits; map .SH to .SS. */
export function canonicalSymbol(symbol) {
  let s = String(symbol).trim().toUpperCase();
  s = s.replace(/\.SH$/, ".SS");
  const hk = s.match(/^0*(\d{1,5})\.HK$/);
  if (hk) s = `${hk[1].padStart(4, "0")}.HK`;
  return s;
}

/**
 * A ticker written the local way → Yahoo symbol, or null.
 * `language` breaks ties for bare numeric codes (2330 is Taiwan to a zh-TW speaker, 0700 is
 * Hong Kong to a Chinese speaker, 005930 is Korea to a Korean speaker).
 */
export function localCode(token, { language = "en" } = {}) {
  const t = String(token).trim().toUpperCase();
  // EXCHANGE:CODE (TYO:7203, LON:SHEL, EPA:MC) or a glued numeric prefix (SH600519, HK0700)
  let m = t.match(/^([A-Z]{2,6}):\s*([A-Z0-9][A-Z0-9.]{0,9})$/);
  if (m && PREFIX[m[1]]) return canonicalSymbol(`${m[2]}${PREFIX[m[1]]}`);
  m = t.match(/^(SH|SZ|BJ|HK|TW|KS|KQ)(\d{3,6})$/);
  if (m) return canonicalSymbol(`${m[2]}${PREFIX[m[1]]}`);
  if (!/^\d{4,6}$/.test(t)) return null;
  if (t.length === 6) {
    if (language === "ko") return `${t}.KS`;
    if (/^[69]/.test(t)) return `${t}.SS`;
    if (/^[03]/.test(t)) return `${t}.SZ`;
    if (/^[48]/.test(t)) return `${t}.BJ`;
    return null;
  }
  if (t.length === 5) return /^0/.test(t) ? canonicalSymbol(`${t}.HK`) : null;
  // four digits
  if (language === "zh-TW") return `${t}.TW`;
  if (language === "zh-CN" || /^0/.test(t)) return canonicalSymbol(`${t}.HK`);
  return `${t}.T`;
}

/** Google News edition for a market: { hl, gl, ceid }. */
export function newsEdition(symbol) {
  const [hl, gl, ceid] = marketOf(symbol).news;
  return { hl, gl, ceid };
}

/** Quotes in minor units (pence, cents, agorot) and the factor to reach the major unit. */
export const MINOR_UNITS = { GBp: ["GBP", 100], GBX: ["GBP", 100], ZAc: ["ZAR", 100], ILA: ["ILS", 100] };
