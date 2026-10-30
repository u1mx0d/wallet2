/**
 * Yatırım hesap motoru. Saf TypeScript: UI, React Native ve Appwrite'tan bağımsızdır.
 * Hem uygulamada (ekranlar) hem sunucuda (işlem doğrulayan Function) kullanılır.
 *
 * KURALLAR
 * - Pozisyon SAKLANMAZ; her seferinde işlemlerden (trades) yeniden hesaplanır.
 * - Tüm tutarlar KURUŞ cinsinden tam sayıdır. Ara hesaplar BigInt ile yapılır.
 * - Maliyet yöntemi: ağırlıklı ortalama maliyet (alternatifi FIFO; bkz. ADIM 8 açıklaması).
 * - Kısmi satışta satılan maliyet "yarım ve üstü yukarı" yuvarlanır; artan kuruş kalan
 *   pozisyonda kalır. Pozisyon sıfırlanınca toplam maliyet kuruşu kuruşuna kapanır.
 * - Yüzdeler baz puandır: 10.000 = %100. Negatif ve %100'ün üstü olabilir.
 */
import { allocateBasisPoints, formatBasisPoints } from "./aggregations";
import { formatFullDate } from "./dates";
import { MAX_AMOUNT_MINOR, MINUS_SIGN } from "./money";

export const MAX_LOTS = 1_000_000_000;
/** BIST sembolleri: 2-12 karakter, ASCII büyük harf ve rakam (ör. THYAO, A1CAP). */
const SYMBOL_PATTERN = /^[A-Z0-9]{2,12}$/;

// BigInt sabitleri (BigInt literal sözdizimi yerine: derleme hedefinden bağımsız).
const ZERO = BigInt(0);
const TWO = BigInt(2);
const BASIS_POINTS = BigInt(10_000);
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

// ─── Tipler ────────────────────────────────────────────────────────────────

export type TradeSide = "buy" | "sell";

export type TradeInput = {
  id: string;
  symbol: string;
  side: TradeSide;
  lots: number;
  /** Lot başına fiyat (kuruş). */
  priceMinor: number;
  /** İşlem komisyonu (kuruş). Varsayılan 0. */
  feeMinor?: number;
  /** İşlem tarihi (ISO). */
  date: string;
  /** Kayıt zamanı (ISO). Aynı tarihli işlemleri sıralamak için; yeni işlemde boş olabilir. */
  createdAt?: string;
};

export type EngineOptions = {
  /** true: alım komisyonu maliyete eklenir, satış komisyonu gelirden düşülür. */
  includeFees: boolean;
};

export const DEFAULT_ENGINE_OPTIONS: EngineOptions = { includeFees: true };

export type InvalidTradeReason =
  | "invalid_symbol"
  | "invalid_side"
  | "invalid_lots"
  | "invalid_price"
  | "invalid_fee"
  | "invalid_date";

export type EngineError =
  | { kind: "invalid_trade"; tradeId: string; reason: InvalidTradeReason }
  | {
      kind: "oversell";
      tradeId: string;
      symbol: string;
      date: string;
      availableLots: number;
      requestedLots: number;
    };

export type Position = {
  symbol: string;
  /** Eldeki lot (0 ise pozisyon kapalı). */
  lots: number;
  /** Eldeki lotların toplam maliyeti (kuruş). */
  totalCostMinor: number;
  /** Lot başına ortalama maliyet (kuruş, gösterim için yuvarlanmış). Hesaplarda totalCostMinor kullanılır. */
  averageCostMinor: number;
  /** Bu sembolde tüm satışlardan gerçekleşmiş kâr/zarar (kuruş). */
  realizedPnlMinor: number;
  /** Ödenen toplam komisyon (kuruş); includeFees'ten bağımsız. */
  feesPaidMinor: number;
  tradeCount: number;
  firstTradeDate: string;
  lastTradeDate: string;
};

export type EngineResult =
  | { ok: true; positions: Position[] }
  | { ok: false; error: EngineError };

export type PriceQuote = {
  priceMinor: number;
  prevCloseMinor: number | null;
};

export type PositionValuation = Position & {
  /** Fiyat yoksa null. */
  priceMinor: number | null;
  marketValueMinor: number | null;
  unrealizedPnlMinor: number | null;
  /** Gerçekleşmemiş kâr/zarar oranı (baz puan). Maliyet 0 ise null. */
  unrealizedPnlBasisPoints: number | null;
  dailyChangeMinor: number | null;
  dailyChangeBasisPoints: number | null;
};

export type AllocationSlice = {
  symbol: string;
  marketValueMinor: number;
  basisPoints: number;
};

export type PortfolioSummary = {
  /** Fiyatı bilinen açık pozisyonların piyasa değeri toplamı. */
  marketValueMinor: number;
  /** Fiyatı bilinen açık pozisyonların maliyet toplamı. */
  costBasisMinor: number;
  unrealizedPnlMinor: number;
  unrealizedPnlBasisPoints: number | null;
  /** Kapalılar dahil tüm pozisyonların gerçekleşmiş kâr/zararı. */
  realizedPnlMinor: number;
  dailyChangeMinor: number;
  openPositionCount: number;
  /** Açık olup fiyatı bilinmeyen semboller (toplamlara dahil edilmez). */
  missingPriceSymbols: string[];
  /** Piyasa değerine göre dağılım, büyükten küçüğe; toplamı tam 10.000 baz puan. */
  allocation: AllocationSlice[];
};

// ─── Yardımcılar ───────────────────────────────────────────────────────────

/** Kullanıcının yazdığı sembolü BIST biçimine çevirir. Türkçe "i → İ" dönüşümü YAPILMAZ. */
export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidSymbol(symbol: string): boolean {
  return SYMBOL_PATTERN.test(symbol);
}

function isIntInRange(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

export function validateTrade(trade: TradeInput): InvalidTradeReason | null {
  if (!isValidSymbol(normalizeSymbol(trade.symbol))) return "invalid_symbol";
  if (trade.side !== "buy" && trade.side !== "sell") return "invalid_side";
  if (!isIntInRange(trade.lots, 1, MAX_LOTS)) return "invalid_lots";
  if (!isIntInRange(trade.priceMinor, 1, MAX_AMOUNT_MINOR))
    return "invalid_price";
  if (!isIntInRange(trade.feeMinor ?? 0, 0, MAX_AMOUNT_MINOR))
    return "invalid_fee";
  if (
    !/^\d{4}-\d{2}-\d{2}T/.test(trade.date) ||
    Number.isNaN(Date.parse(trade.date))
  )
    return "invalid_date";
  return null;
}

/** Tarih → kayıt zamanı (yoksa en sona) → ID. */
export function compareTrades(a: TradeInput, b: TradeInput): number {
  const byDate = Date.parse(a.date) - Date.parse(b.date);
  if (byDate !== 0) return byDate;
  const createdA = a.createdAt
    ? Date.parse(a.createdAt)
    : Number.POSITIVE_INFINITY;
  const createdB = b.createdAt
    ? Date.parse(b.createdAt)
    : Number.POSITIVE_INFINITY;
  if (createdA !== createdB) return createdA < createdB ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

function toSafeNumber(value: bigint): number {
  if (value > MAX_SAFE || value < -MAX_SAFE) {
    throw new RangeError("Hesap sonucu güvenli tam sayı sınırını aşıyor.");
  }
  return Number(value);
}

/** Tam sayı bölmesi, "yarım ve üstü sıfırdan uzağa" yuvarlama. */
function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator === ZERO) throw new RangeError("Sıfıra bölme.");
  const negative = numerator < ZERO !== denominator < ZERO;
  const n = numerator < ZERO ? -numerator : numerator;
  const d = denominator < ZERO ? -denominator : denominator;
  const quotient = (n * TWO + d) / (TWO * d);
  return negative ? -quotient : quotient;
}

/** 870 → "+%8,7", −435 → "−%4,4", 0 → "%0,0". */
export function formatSignedBasisPoints(basisPoints: number): string {
  if (basisPoints > 0) return `+${formatBasisPoints(basisPoints)}`;
  if (basisPoints < 0) return `${MINUS_SIGN}${formatBasisPoints(-basisPoints)}`;
  return formatBasisPoints(0);
}

const INVALID_TRADE_MESSAGES: Record<InvalidTradeReason, string> = {
  invalid_symbol: "Geçerli bir hisse sembolü gir (ör. THYAO).",
  invalid_side: "İşlem türü alım veya satım olmalı.",
  invalid_lots: `Lot sayısı 1 ile ${MAX_LOTS.toLocaleString("tr-TR")} arasında bir tam sayı olmalı.`,
  invalid_price: "Fiyat en az ₺0,01 olmalı.",
  invalid_fee: "Komisyon negatif olamaz.",
  invalid_date: "Geçerli bir tarih seç.",
};

export function describeEngineError(error: EngineError): string {
  if (error.kind === "invalid_trade")
    return INVALID_TRADE_MESSAGES[error.reason];
  return (
    `${error.symbol} için ${formatFullDate(new Date(error.date))} tarihli satışta elde ` +
    `${error.availableLots} lot var; ${error.requestedLots} lot satılamaz.`
  );
}

// ─── Pozisyon hesabı ───────────────────────────────────────────────────────

type MutablePosition = {
  lots: bigint;
  cost: bigint;
  realized: bigint;
  fees: bigint;
  tradeCount: number;
  firstTradeDate: string;
  lastTradeDate: string;
};

/**
 * İşlemleri tarih sırasıyla yeniden oynatarak her sembolün pozisyonunu hesaplar.
 * Geçersiz işlem veya eldeki lottan fazla satış varsa hata döner (ilk hatada durur).
 * Sonuç sembole göre alfabetik sıralıdır; kapalı (lot = 0) pozisyonlar da döner.
 */
export function computePositions(
  trades: readonly TradeInput[],
  options: EngineOptions = DEFAULT_ENGINE_OPTIONS,
): EngineResult {
  for (const trade of trades) {
    const reason = validateTrade(trade);
    if (reason)
      return {
        ok: false,
        error: { kind: "invalid_trade", tradeId: trade.id, reason },
      };
  }

  const ordered = trades
    .map((trade) => ({ ...trade, symbol: normalizeSymbol(trade.symbol) }))
    .sort(compareTrades);

  const states = new Map<string, MutablePosition>();

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
        lastTradeDate: trade.date,
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
            requestedLots: trade.lots,
          },
        };
      }
      // Son lotlar satılıyorsa kalan maliyetin TAMAMI satılmış sayılır: kuruş artığı kalmaz.
      const costOfSold =
        lots === state.lots
          ? state.cost
          : divRound(state.cost * lots, state.lots);
      state.realized += gross - fee - costOfSold;
      state.cost -= costOfSold;
      state.lots -= lots;
    }

    state.fees += rawFee;
    state.tradeCount += 1;
    state.lastTradeDate = trade.date;
  }

  const positions = [...states.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([symbol, state]) => ({
      symbol,
      lots: toSafeNumber(state.lots),
      totalCostMinor: toSafeNumber(state.cost),
      averageCostMinor:
        state.lots === ZERO
          ? 0
          : toSafeNumber(divRound(state.cost, state.lots)),
      realizedPnlMinor: toSafeNumber(state.realized),
      feesPaidMinor: toSafeNumber(state.fees),
      tradeCount: state.tradeCount,
      firstTradeDate: state.firstTradeDate,
      lastTradeDate: state.lastTradeDate,
    }));

  return { ok: true, positions };
}

// ─── Değerleme ─────────────────────────────────────────────────────────────

function assertQuote(quote: PriceQuote): void {
  if (!isIntInRange(quote.priceMinor, 1, MAX_AMOUNT_MINOR))
    throw new RangeError("Geçersiz fiyat.");
  if (
    quote.prevCloseMinor !== null &&
    !isIntInRange(quote.prevCloseMinor, 1, MAX_AMOUNT_MINOR)
  ) {
    throw new RangeError("Geçersiz önceki kapanış fiyatı.");
  }
}

/** Pozisyonu güncel fiyatla değerler. Fiyat yoksa değer alanları null olur. */
export function valuePosition(
  position: Position,
  quote: PriceQuote | undefined,
): PositionValuation {
  if (position.lots === 0) {
    return {
      ...position,
      priceMinor: quote?.priceMinor ?? null,
      marketValueMinor: 0,
      unrealizedPnlMinor: 0,
      unrealizedPnlBasisPoints: null,
      dailyChangeMinor: 0,
      dailyChangeBasisPoints: null,
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
      dailyChangeBasisPoints: null,
    };
  }

  assertQuote(quote);
  const lots = BigInt(position.lots);
  const price = BigInt(quote.priceMinor);
  const cost = BigInt(position.totalCostMinor);
  const marketValue = lots * price;
  const unrealized = marketValue - cost;

  let dailyChangeMinor: number | null = null;
  let dailyChangeBasisPoints: number | null = null;
  if (quote.prevCloseMinor !== null) {
    const prevClose = BigInt(quote.prevCloseMinor);
    dailyChangeMinor = toSafeNumber((price - prevClose) * lots);
    dailyChangeBasisPoints = toSafeNumber(
      divRound((price - prevClose) * BASIS_POINTS, prevClose),
    );
  }

  return {
    ...position,
    priceMinor: quote.priceMinor,
    marketValueMinor: toSafeNumber(marketValue),
    unrealizedPnlMinor: toSafeNumber(unrealized),
    unrealizedPnlBasisPoints:
      cost > ZERO
        ? toSafeNumber(divRound(unrealized * BASIS_POINTS, cost))
        : null,
    dailyChangeMinor,
    dailyChangeBasisPoints,
  };
}

export function summarizePortfolio(
  valuations: readonly PositionValuation[],
): PortfolioSummary {
  let marketValue = ZERO;
  let costBasis = ZERO;
  let realized = ZERO;
  let dailyChange = ZERO;
  let openPositionCount = 0;
  const missingPriceSymbols: string[] = [];
  const priced: { symbol: string; marketValueMinor: number }[] = [];

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
      marketValueMinor: valuation.marketValueMinor,
    });
  }

  priced.sort(
    (a, b) =>
      b.marketValueMinor - a.marketValueMinor || (a.symbol < b.symbol ? -1 : 1),
  );
  const basisPoints = allocateBasisPoints(
    priced.map((slice) => slice.marketValueMinor),
  );
  const unrealized = marketValue - costBasis;

  return {
    marketValueMinor: toSafeNumber(marketValue),
    costBasisMinor: toSafeNumber(costBasis),
    unrealizedPnlMinor: toSafeNumber(unrealized),
    unrealizedPnlBasisPoints:
      costBasis > ZERO
        ? toSafeNumber(divRound(unrealized * BASIS_POINTS, costBasis))
        : null,
    realizedPnlMinor: toSafeNumber(realized),
    dailyChangeMinor: toSafeNumber(dailyChange),
    openPositionCount,
    missingPriceSymbols,
    allocation: priced.map((slice, index) => ({
      ...slice,
      basisPoints: basisPoints[index] ?? 0,
    })),
  };
}
