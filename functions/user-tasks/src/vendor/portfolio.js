// ⚠️ OTOMATİK ÜRETİLDİ — ELLE DÜZENLEME.
// Kaynak: src/domain/portfolio.ts (ve import ettiği domain dosyaları).
// Yeniden üretmek için: npm run functions:build


// src/domain/dates.ts
var TR_MONTHS = [
  "Ocak",
  "\u015Eubat",
  "Mart",
  "Nisan",
  "May\u0131s",
  "Haziran",
  "Temmuz",
  "A\u011Fustos",
  "Eyl\xFCl",
  "Ekim",
  "Kas\u0131m",
  "Aral\u0131k"
];
function formatFullDate(date) {
  return `${date.getDate()} ${TR_MONTHS[date.getMonth()] ?? ""} ${date.getFullYear()}`;
}

// src/domain/money.ts
var MAX_AMOUNT_MINOR = 999999999999;
var MINUS_SIGN = "\u2212";
function assertMinor(value, label = "Tutar") {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `${label} g\xFCvenli bir tam say\u0131 (kuru\u015F) olmal\u0131: ${String(value)}`
    );
  }
}
function sumMinor(values) {
  let total = 0;
  for (const value of values) {
    assertMinor(value);
    total += value;
    if (!Number.isSafeInteger(total)) {
      throw new RangeError("Toplam, g\xFCvenli tam say\u0131 s\u0131n\u0131r\u0131n\u0131 a\u015Ft\u0131.");
    }
  }
  return total;
}

// src/domain/aggregations.ts
var BASIS_POINTS_TOTAL = 1e4;
function allocateBasisPoints(values) {
  for (const value of values) {
    assertMinor(value, "De\u011Fer");
    if (value < 0)
      throw new RangeError("Y\xFCzde da\u011F\u0131l\u0131m\u0131nda negatif de\u011Fer olamaz.");
  }
  const total = sumMinor(values);
  if (total === 0) return values.map(() => 0);
  const bigTotal = BigInt(total);
  const scale = BigInt(BASIS_POINTS_TOTAL);
  const parts = values.map((value, index) => {
    const scaled = BigInt(value) * scale;
    return {
      index,
      floor: Number(scaled / bigTotal),
      remainder: scaled % bigTotal
    };
  });
  let leftover = BASIS_POINTS_TOTAL - parts.reduce((sum, part) => sum + part.floor, 0);
  const byRemainder = [...parts].sort((a, b) => {
    if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
    return a.index - b.index;
  });
  const result = parts.map((part) => part.floor);
  for (const part of byRemainder) {
    if (leftover === 0) break;
    result[part.index] = (result[part.index] ?? 0) + 1;
    leftover -= 1;
  }
  return result;
}
function formatBasisPoints(basisPoints) {
  const tenths = Math.round(basisPoints / 10);
  return `%${Math.floor(tenths / 10)},${tenths % 10}`;
}

// src/domain/portfolio.ts
var MAX_LOTS = 1e9;
var SYMBOL_PATTERN = /^[A-Z0-9]{2,12}$/;
var ZERO = BigInt(0);
var TWO = BigInt(2);
var BASIS_POINTS = BigInt(1e4);
var MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
var DEFAULT_ENGINE_OPTIONS = { includeFees: true };
function normalizeSymbol(raw) {
  return raw.trim().toUpperCase();
}
function isValidSymbol(symbol) {
  return SYMBOL_PATTERN.test(symbol);
}
function isIntInRange(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}
function validateTrade(trade) {
  if (!isValidSymbol(normalizeSymbol(trade.symbol))) return "invalid_symbol";
  if (trade.side !== "buy" && trade.side !== "sell") return "invalid_side";
  if (!isIntInRange(trade.lots, 1, MAX_LOTS)) return "invalid_lots";
  if (!isIntInRange(trade.priceMinor, 1, MAX_AMOUNT_MINOR))
    return "invalid_price";
  if (!isIntInRange(trade.feeMinor ?? 0, 0, MAX_AMOUNT_MINOR))
    return "invalid_fee";
  if (!/^\d{4}-\d{2}-\d{2}T/.test(trade.date) || Number.isNaN(Date.parse(trade.date)))
    return "invalid_date";
  return null;
}
function compareTrades(a, b) {
  const byDate = Date.parse(a.date) - Date.parse(b.date);
  if (byDate !== 0) return byDate;
  const createdA = a.createdAt ? Date.parse(a.createdAt) : Number.POSITIVE_INFINITY;
  const createdB = b.createdAt ? Date.parse(b.createdAt) : Number.POSITIVE_INFINITY;
  if (createdA !== createdB) return createdA < createdB ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}
function toSafeNumber(value) {
  if (value > MAX_SAFE || value < -MAX_SAFE) {
    throw new RangeError("Hesap sonucu g\xFCvenli tam say\u0131 s\u0131n\u0131r\u0131n\u0131 a\u015F\u0131yor.");
  }
  return Number(value);
}
function divRound(numerator, denominator) {
  if (denominator === ZERO) throw new RangeError("S\u0131f\u0131ra b\xF6lme.");
  const negative = numerator < ZERO !== denominator < ZERO;
  const n = numerator < ZERO ? -numerator : numerator;
  const d = denominator < ZERO ? -denominator : denominator;
  const quotient = (n * TWO + d) / (TWO * d);
  return negative ? -quotient : quotient;
}
function formatSignedBasisPoints(basisPoints) {
  if (basisPoints > 0) return `+${formatBasisPoints(basisPoints)}`;
  if (basisPoints < 0) return `${MINUS_SIGN}${formatBasisPoints(-basisPoints)}`;
  return formatBasisPoints(0);
}
var INVALID_TRADE_MESSAGES = {
  invalid_symbol: "Ge\xE7erli bir hisse sembol\xFC gir (\xF6r. THYAO).",
  invalid_side: "\u0130\u015Flem t\xFCr\xFC al\u0131m veya sat\u0131m olmal\u0131.",
  invalid_lots: `Lot say\u0131s\u0131 1 ile ${MAX_LOTS.toLocaleString("tr-TR")} aras\u0131nda bir tam say\u0131 olmal\u0131.`,
  invalid_price: "Fiyat en az \u20BA0,01 olmal\u0131.",
  invalid_fee: "Komisyon negatif olamaz.",
  invalid_date: "Ge\xE7erli bir tarih se\xE7."
};
function describeEngineError(error) {
  if (error.kind === "invalid_trade")
    return INVALID_TRADE_MESSAGES[error.reason];
  return `${error.symbol} i\xE7in ${formatFullDate(new Date(error.date))} tarihli sat\u0131\u015Fta elde ${error.availableLots} lot var; ${error.requestedLots} lot sat\u0131lamaz.`;
}
function computePositions(trades, options = DEFAULT_ENGINE_OPTIONS) {
  for (const trade of trades) {
    const reason = validateTrade(trade);
    if (reason)
      return {
        ok: false,
        error: { kind: "invalid_trade", tradeId: trade.id, reason }
      };
  }
  const ordered = trades.map((trade) => ({ ...trade, symbol: normalizeSymbol(trade.symbol) })).sort(compareTrades);
  const states = /* @__PURE__ */ new Map();
  for (const trade of ordered) {
    let state = states.get(trade.symbol);
    if (!state) {
      state = {
        lots: ZERO,
        cost: ZERO,
        realized: ZERO,
        fees: ZERO,
        tradeCount: 0,
        firstTradeDate: trade.date,
        lastTradeDate: trade.date
      };
      states.set(trade.symbol, state);
    }
    const lots = BigInt(trade.lots);
    const gross = lots * BigInt(trade.priceMinor);
    const rawFee = BigInt(trade.feeMinor ?? 0);
    const fee = options.includeFees ? rawFee : ZERO;
    if (trade.side === "buy") {
      state.lots += lots;
      state.cost += gross + fee;
    } else {
      if (lots > state.lots) {
        return {
          ok: false,
          error: {
            kind: "oversell",
            tradeId: trade.id,
            symbol: trade.symbol,
            date: trade.date,
            availableLots: toSafeNumber(state.lots),
            requestedLots: trade.lots
          }
        };
      }
      const costOfSold = lots === state.lots ? state.cost : divRound(state.cost * lots, state.lots);
      state.realized += gross - fee - costOfSold;
      state.cost -= costOfSold;
      state.lots -= lots;
    }
    state.fees += rawFee;
    state.tradeCount += 1;
    state.lastTradeDate = trade.date;
  }
  const positions = [...states.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([symbol, state]) => ({
    symbol,
    lots: toSafeNumber(state.lots),
    totalCostMinor: toSafeNumber(state.cost),
    averageCostMinor: state.lots === ZERO ? 0 : toSafeNumber(divRound(state.cost, state.lots)),
    realizedPnlMinor: toSafeNumber(state.realized),
    feesPaidMinor: toSafeNumber(state.fees),
    tradeCount: state.tradeCount,
    firstTradeDate: state.firstTradeDate,
    lastTradeDate: state.lastTradeDate
  }));
  return { ok: true, positions };
}
function assertQuote(quote) {
  if (!isIntInRange(quote.priceMinor, 1, MAX_AMOUNT_MINOR))
    throw new RangeError("Ge\xE7ersiz fiyat.");
  if (quote.prevCloseMinor !== null && !isIntInRange(quote.prevCloseMinor, 1, MAX_AMOUNT_MINOR)) {
    throw new RangeError("Ge\xE7ersiz \xF6nceki kapan\u0131\u015F fiyat\u0131.");
  }
}
function valuePosition(position, quote) {
  if (position.lots === 0) {
    return {
      ...position,
      priceMinor: quote?.priceMinor ?? null,
      marketValueMinor: 0,
      unrealizedPnlMinor: 0,
      unrealizedPnlBasisPoints: null,
      dailyChangeMinor: 0,
      dailyChangeBasisPoints: null
    };
  }
  if (!quote) {
    return {
      ...position,
      priceMinor: null,
      marketValueMinor: null,
      unrealizedPnlMinor: null,
      unrealizedPnlBasisPoints: null,
      dailyChangeMinor: null,
      dailyChangeBasisPoints: null
    };
  }
  assertQuote(quote);
  const lots = BigInt(position.lots);
  const price = BigInt(quote.priceMinor);
  const cost = BigInt(position.totalCostMinor);
  const marketValue = lots * price;
  const unrealized = marketValue - cost;
  let dailyChangeMinor = null;
  let dailyChangeBasisPoints = null;
  if (quote.prevCloseMinor !== null) {
    const prevClose = BigInt(quote.prevCloseMinor);
    dailyChangeMinor = toSafeNumber((price - prevClose) * lots);
    dailyChangeBasisPoints = toSafeNumber(
      divRound((price - prevClose) * BASIS_POINTS, prevClose)
    );
  }
  return {
    ...position,
    priceMinor: quote.priceMinor,
    marketValueMinor: toSafeNumber(marketValue),
    unrealizedPnlMinor: toSafeNumber(unrealized),
    unrealizedPnlBasisPoints: cost > ZERO ? toSafeNumber(divRound(unrealized * BASIS_POINTS, cost)) : null,
    dailyChangeMinor,
    dailyChangeBasisPoints
  };
}
function summarizePortfolio(valuations) {
  let marketValue = ZERO;
  let costBasis = ZERO;
  let realized = ZERO;
  let dailyChange = ZERO;
  let openPositionCount = 0;
  const missingPriceSymbols = [];
  const priced = [];
  for (const valuation of valuations) {
    realized += BigInt(valuation.realizedPnlMinor);
    if (valuation.lots === 0) continue;
    openPositionCount += 1;
    if (valuation.marketValueMinor === null) {
      missingPriceSymbols.push(valuation.symbol);
      continue;
    }
    marketValue += BigInt(valuation.marketValueMinor);
    costBasis += BigInt(valuation.totalCostMinor);
    if (valuation.dailyChangeMinor !== null)
      dailyChange += BigInt(valuation.dailyChangeMinor);
    priced.push({
      symbol: valuation.symbol,
      marketValueMinor: valuation.marketValueMinor
    });
  }
  priced.sort(
    (a, b) => b.marketValueMinor - a.marketValueMinor || (a.symbol < b.symbol ? -1 : 1)
  );
  const basisPoints = allocateBasisPoints(
    priced.map((slice) => slice.marketValueMinor)
  );
  const unrealized = marketValue - costBasis;
  return {
    marketValueMinor: toSafeNumber(marketValue),
    costBasisMinor: toSafeNumber(costBasis),
    unrealizedPnlMinor: toSafeNumber(unrealized),
    unrealizedPnlBasisPoints: costBasis > ZERO ? toSafeNumber(divRound(unrealized * BASIS_POINTS, costBasis)) : null,
    realizedPnlMinor: toSafeNumber(realized),
    dailyChangeMinor: toSafeNumber(dailyChange),
    openPositionCount,
    missingPriceSymbols,
    allocation: priced.map((slice, index) => ({
      ...slice,
      basisPoints: basisPoints[index] ?? 0
    }))
  };
}
export {
  DEFAULT_ENGINE_OPTIONS,
  MAX_LOTS,
  compareTrades,
  computePositions,
  describeEngineError,
  formatSignedBasisPoints,
  isValidSymbol,
  normalizeSymbol,
  summarizePortfolio,
  validateTrade,
  valuePosition
};
