// Company names people actually type, in their own language → listed symbol. Checked before the
// online symbol search, which does not understand most CJK names. Longest match wins.

const TABLE = [
  // ------------------------------------------------ United States (names in several languages)
  ["AAPL", "apple", "苹果", "蘋果", "アップル", "애플"],
  ["MSFT", "microsoft", "微软", "微軟", "マイクロソフト", "마이크로소프트"],
  ["NVDA", "nvidia", "英伟达", "輝達", "エヌビディア", "엔비디아"],
  ["GOOGL", "alphabet", "google", "谷歌", "グーグル", "구글"],
  ["AMZN", "amazon", "亚马逊", "亞馬遜", "アマゾン", "아마존"],
  ["META", "meta platforms", "facebook", "脸书", "臉書", "メタ", "메타"],
  ["TSLA", "tesla", "特斯拉", "テスラ", "테슬라"],
  ["AMD", "advanced micro devices", "超威", "超微"],
  ["AVGO", "broadcom", "博通"],
  ["NFLX", "netflix", "奈飞", "網飛"],
  ["BRK-B", "berkshire", "伯克希尔", "波克夏", "バークシャー"],
  ["JPM", "jpmorgan", "摩根大通"],
  ["KO", "coca-cola", "可口可乐", "可口可樂", "コカ・コーラ"],
  ["DIS", "disney", "迪士尼", "ディズニー"],
  ["PLTR", "palantir"],
  ["INTC", "intel", "英特尔", "英特爾", "インテル"],
  // ------------------------------------------------ China A-shares
  ["600519.SS", "贵州茅台", "貴州茅台", "茅台", "kweichow moutai", "moutai"],
  ["300750.SZ", "宁德时代", "寧德時代", "catl"],
  ["601318.SS", "中国平安", "中國平安", "ping an"],
  ["600036.SS", "招商银行", "招商銀行", "china merchants bank"],
  ["000858.SZ", "五粮液", "五糧液", "wuliangye"],
  ["000333.SZ", "美的集团", "美的集團", "midea"],
  ["002594.SZ", "比亚迪", "比亞迪", "byd"],
  ["601398.SS", "工商银行", "工商銀行", "icbc"],
  ["600900.SS", "长江电力", "長江電力"],
  ["601899.SS", "紫金矿业", "紫金礦業", "zijin"],
  ["688981.SS", "中芯国际", "中芯國際", "smic"],
  ["601127.SS", "赛力斯", "賽力斯", "seres"],
  // ------------------------------------------------ Hong Kong
  ["0700.HK", "腾讯", "騰訊", "tencent", "テンセント", "텐센트"],
  ["9988.HK", "阿里巴巴", "阿里", "alibaba", "アリババ", "알리바바"],
  ["3690.HK", "美团", "美團", "meituan"],
  ["1810.HK", "小米", "xiaomi", "シャオミ", "샤오미"],
  ["9618.HK", "京东", "京東", "jd.com"],
  ["9888.HK", "百度", "baidu"],
  ["9999.HK", "网易", "網易", "netease"],
  ["1211.HK", "比亚迪股份", "比亞迪股份"],
  ["0005.HK", "汇丰", "滙豐", "匯豐", "hsbc holdings"],
  ["1299.HK", "友邦", "aia group"],
  ["0388.HK", "港交所", "香港交易所", "hkex"],
  ["2318.HK", "中国平安h", "中國平安h"],
  ["0941.HK", "中国移动", "中國移動", "china mobile"],
  ["9961.HK", "携程", "攜程", "trip.com"],
  ["2015.HK", "理想汽车", "理想汽車", "li auto"],
  ["9868.HK", "小鹏", "小鵬", "xpeng"],
  ["9866.HK", "蔚来", "蔚來", "nio"],
  ["6690.HK", "海尔智家", "海爾智家", "haier"],
  // ------------------------------------------------ Taiwan
  ["2330.TW", "台积电", "台積電", "tsmc", "taiwan semiconductor", "tsmc taiwan"],
  ["2317.TW", "鸿海", "鴻海", "foxconn", "hon hai"],
  ["2454.TW", "联发科", "聯發科", "mediatek"],
  ["2308.TW", "台达电", "台達電", "delta electronics"],
  ["2382.TW", "广达", "廣達", "quanta"],
  ["2881.TW", "富邦金", "fubon"],
  // ------------------------------------------------ Japan
  ["7203.T", "トヨタ", "丰田", "豐田", "toyota", "도요타"],
  ["6758.T", "ソニー", "索尼", "sony", "소니"],
  ["7974.T", "任天堂", "nintendo", "닌텐도"],
  ["9984.T", "ソフトバンクグループ", "ソフトバンク", "软银", "軟銀", "softbank"],
  ["6861.T", "キーエンス", "基恩士", "keyence"],
  ["8306.T", "三菱ufj", "三菱UFJ", "mitsubishi ufj", "mufg"],
  ["6501.T", "日立", "hitachi"],
  ["8035.T", "東京エレクトロン", "东京电子", "tokyo electron"],
  ["9983.T", "ファーストリテイリング", "ユニクロ", "优衣库", "uniqlo", "fast retailing"],
  ["7267.T", "ホンダ", "本田", "honda"],
  ["6098.T", "リクルート", "recruit holdings"],
  ["4063.T", "信越化学", "shin-etsu"],
  ["8058.T", "三菱商事", "mitsubishi corporation"],
  ["6857.T", "アドバンテスト", "advantest"],
  // ------------------------------------------------ South Korea
  ["005930.KS", "삼성전자", "삼성", "三星电子", "三星電子", "三星", "samsung electronics", "samsung", "サムスン"],
  ["000660.KS", "sk하이닉스", "SK하이닉스", "하이닉스", "海力士", "sk hynix", "hynix"],
  ["005380.KS", "현대차", "현대자동차", "现代汽车", "現代汽車", "hyundai motor"],
  ["035420.KS", "네이버", "naver"],
  ["035720.KS", "카카오", "kakao"],
  ["373220.KS", "lg에너지솔루션", "LG에너지솔루션", "lg energy solution"],
  ["207940.KS", "삼성바이오로직스", "samsung biologics"],
  ["005490.KS", "포스코홀딩스", "포스코", "posco"],
  ["000270.KS", "기아", "起亚", "kia"],
  ["068270.KS", "셀트리온", "celltrion"],
  // ------------------------------------------------ Europe
  ["ASML.AS", "asml", "阿斯麦", "艾司摩爾"],
  ["MC.PA", "lvmh", "路威酩轩", "moët hennessy", "louis vuitton"],
  ["OR.PA", "l'oréal", "l'oreal", "loreal", "欧莱雅"],
  ["RMS.PA", "hermès", "hermes", "爱马仕", "愛馬仕"],
  ["TTE.PA", "totalenergies"],
  ["AIR.PA", "airbus", "空客", "空中巴士"],
  ["SAN.PA", "sanofi", "赛诺菲"],
  ["SAP.DE", "sap"],
  ["SIE.DE", "siemens", "西门子", "西門子"],
  ["ALV.DE", "allianz", "安联", "安聯"],
  ["VOW3.DE", "volkswagen", "大众汽车", "福斯"],
  ["BMW.DE", "bmw", "宝马", "寶馬"],
  ["MBG.DE", "mercedes-benz", "mercedes", "奔驰", "賓士"],
  ["RHM.DE", "rheinmetall"],
  ["NESN.SW", "nestlé", "nestle", "雀巢"],
  ["ROG.SW", "roche", "罗氏", "羅氏"],
  ["NOVN.SW", "novartis", "诺华", "諾華"],
  ["UBSG.SW", "ubs"],
  ["NOVO-B.CO", "novo nordisk", "诺和诺德", "諾和諾德"],
  ["SHEL.L", "shell", "壳牌", "殼牌"],
  ["AZN.L", "astrazeneca", "阿斯利康"],
  ["HSBA.L", "hsbc", "汇丰银行", "滙豐銀行"],
  ["ULVR.L", "unilever", "联合利华", "聯合利華"],
  ["BP.L", "bp plc", "英国石油", "英國石油"],
  ["RR.L", "rolls-royce", "劳斯莱斯", "勞斯萊斯"],
  ["GSK.L", "gsk", "glaxosmithkline", "葛兰素史克"],
  ["SAN.MC", "banco santander", "santander", "桑坦德"],
  ["ITX.MC", "inditex", "zara"],
  ["IBE.MC", "iberdrola"],
  ["ENI.MI", "eni"],
  ["ENEL.MI", "enel"],
  ["RACE.MI", "ferrari", "法拉利"],
  ["ISP.MI", "intesa sanpaolo", "intesa"],
  ["UCG.MI", "unicredit"],
  ["STLAM.MI", "stellantis"],
  ["ADYEN.AS", "adyen"],
  ["INGA.AS", "ing groep", "ing bank"],
  ["PRX.AS", "prosus"],
  ["HEIA.AS", "heineken", "喜力"],
  ["VOLV-B.ST", "volvo", "沃尔沃", "富豪汽車"],
  ["ERIC-B.ST", "ericsson", "爱立信", "愛立信"],
  ["EQNR.OL", "equinor"],
  ["NOKIA.HE", "nokia", "诺基亚", "諾基亞"],
  // ------------------------------------------------ Australia & New Zealand
  ["BHP.AX", "bhp", "必和必拓"],
  ["CBA.AX", "commonwealth bank", "commbank", "澳洲联邦银行"],
  ["CSL.AX", "csl limited", "csl"],
  ["RIO.AX", "rio tinto", "力拓"],
  ["FMG.AX", "fortescue", "福蒂斯丘"],
  ["WBC.AX", "westpac", "西太平洋银行"],
  ["NAB.AX", "national australia bank"],
  ["ANZ.AX", "anz bank", "澳新银行"],
  ["WES.AX", "wesfarmers"],
  ["WOW.AX", "woolworths", "伍尔沃斯"],
  ["MQG.AX", "macquarie", "麦格理"],
  ["XRO.AX", "xero"],
  ["TLS.AX", "telstra"],
  ["FPH.NZ", "fisher & paykel healthcare", "fisher and paykel"],
  // ------------------------------------------------ Canada, Singapore, India, Brazil
  ["SHOP.TO", "shopify"],
  ["RY.TO", "royal bank of canada"],
  ["D05.SI", "dbs bank", "dbs", "星展银行", "星展銀行"],
  ["RELIANCE.NS", "reliance industries", "reliance"],
  ["TCS.NS", "tata consultancy", "tcs"],
  ["INFY.NS", "infosys"],
  ["PETR4.SA", "petrobras"],
  ["VALE3.SA", "vale s.a.", "vale sa"],
];

const ENTRIES = TABLE.flatMap(([symbol, ...names]) => names.map((n) => ({ name: n.toLowerCase(), symbol })))
  .sort((a, b) => b.name.length - a.name.length);

const LATIN = /^[a-z0-9 .&'\-éèêàçüöäñãõô]+$/;

/** Find a known company name in free text. Latin names must match whole words. */
export function findCompany(text) {
  const s = String(text || "").toLowerCase();
  for (const e of ENTRIES) {
    if (LATIN.test(e.name)) {
      if (e.name.length < 3) continue;
      const re = new RegExp(`(^|[^a-z0-9])${e.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`);
      if (re.test(s)) return { symbol: e.symbol, name: e.name };
    } else if (s.includes(e.name)) {
      return { symbol: e.symbol, name: e.name };
    }
  }
  return null;
}

export const KNOWN_COMPANIES = TABLE.length;

/** Names a symbol goes by (first ones first), for local-language news searches. */
export function namesFor(symbol) {
  const row = TABLE.find(([s]) => s === symbol);
  return row ? row.slice(1) : [];
}
