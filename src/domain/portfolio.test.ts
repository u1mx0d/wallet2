import { describe, expect, it } from "vitest";

import { MAX_AMOUNT_MINOR, MINUS_SIGN } from "./money";
import {
    computePositions,
    describeEngineError,
    formatSignedBasisPoints,
    MAX_LOTS,
    normalizeSymbol,
    summarizePortfolio,
    valuePosition,
    type EngineOptions,
    type Position,
    type TradeInput,
    type TradeSide,
} from "./portfolio";

let sequence = 0;

/** Ekim 2026'nın verilen gününde, öğlen; kayıt zamanı her çağrıda 1 ms ileri. */
function trade(
  side: TradeSide,
  symbol: string,
  lots: number,
  priceMinor: number,
  day: number,
  extra: Partial<TradeInput> = {},
): TradeInput {
  sequence += 1;
  return {
    id: `t${sequence}`,
    symbol,
    side,
    lots,
    priceMinor,
    feeMinor: 0,
    date: new Date(2026, 9, day, 12).toISOString(),
    createdAt: new Date(2026, 9, day, 12, 0, 0, sequence).toISOString(),
    ...extra,
  };
}

function positionsOf(
  trades: TradeInput[],
  options?: EngineOptions,
): Position[] {
  const result = computePositions(trades, options);
  if (!result.ok)
    throw new Error(`Beklenmeyen hata: ${JSON.stringify(result.error)}`);
  return result.positions;
}

function single(trades: TradeInput[], options?: EngineOptions): Position {
  const positions = positionsOf(trades, options);
  expect(positions).toHaveLength(1);
  const [position] = positions;
  if (!position) throw new Error("Pozisyon yok");
  return position;
}

const INCLUDE_FEES: EngineOptions = { includeFees: true };
const EXCLUDE_FEES: EngineOptions = { includeFees: false };

describe("alımlar", () => {
  it("tek alım: komisyon dahil maliyet ve ortalama", () => {
    const position = single(
      [trade("buy", "THYAO", 10, 10_000, 1, { feeMinor: 500 })],
      INCLUDE_FEES,
    );
    expect(position).toMatchObject({
      symbol: "THYAO",
      lots: 10,
      totalCostMinor: 100_500,
      averageCostMinor: 10_050,
      realizedPnlMinor: 0,
      feesPaidMinor: 500,
      tradeCount: 1,
    });
  });

  it("tek alım: komisyon hariç modda maliyete eklenmez ama ödenen komisyon raporlanır", () => {
    const position = single(
      [trade("buy", "THYAO", 10, 10_000, 1, { feeMinor: 500 })],
      EXCLUDE_FEES,
    );
    expect(position.totalCostMinor).toBe(100_000);
    expect(position.averageCostMinor).toBe(10_000);
    expect(position.feesPaidMinor).toBe(500);
  });

  it("farklı fiyatlardan çoklu alım ağırlıklı ortalama verir", () => {
    const position = single([
      trade("buy", "THYAO", 10, 10_000, 1),
      trade("buy", "THYAO", 30, 12_000, 2),
    ]);
    expect(position).toMatchObject({
      lots: 40,
      totalCostMinor: 460_000,
      averageCostMinor: 11_500,
    });
  });
});

describe("satışlar", () => {
  const buys = () => [
    trade("buy", "THYAO", 10, 10_000, 1),
    trade("buy", "THYAO", 30, 12_000, 2),
  ];

  it("kısmi satış: gerçekleşmiş kâr, kalan lot ve maliyet; ortalama değişmez", () => {
    const position = single([...buys(), trade("sell", "THYAO", 10, 13_000, 3)]);
    expect(position).toMatchObject({
      lots: 30,
      totalCostMinor: 345_000,
      averageCostMinor: 11_500,
      realizedPnlMinor: 15_000,
    });
  });

  it("satış komisyonu dahil modda gerçekleşmiş kârdan düşülür, hariç modda düşülmez", () => {
    const trades = [
      ...buys(),
      trade("sell", "THYAO", 10, 13_000, 3, { feeMinor: 300 }),
    ];
    expect(single(trades, INCLUDE_FEES).realizedPnlMinor).toBe(14_700);
    expect(single(trades, EXCLUDE_FEES).realizedPnlMinor).toBe(15_000);
  });

  it("zararına satış negatif gerçekleşmiş kâr/zarar verir", () => {
    const position = single([...buys(), trade("sell", "THYAO", 20, 10_000, 3)]);
    // Satılan maliyet: 460.000 × 20 / 40 = 230.000; gelir 200.000.
    expect(position.realizedPnlMinor).toBe(-30_000);
  });

  it("bölünemeyen maliyette kuruş kaybolmaz", () => {
    // 3 lot × 333 + 1 komisyon = 1.000 kuruş maliyet.
    const position = single([
      trade("buy", "XYZ", 3, 333, 1, { feeMinor: 1 }),
      trade("sell", "XYZ", 1, 500, 2), // satılan maliyet 333 (333,33 → 333)
      trade("sell", "XYZ", 1, 500, 3), // satılan maliyet 334 (667/2 = 333,5 → 334)
      trade("sell", "XYZ", 1, 500, 4), // son lot: kalan 333
    ]);
    expect(position.lots).toBe(0);
    expect(position.totalCostMinor).toBe(0);
    // Toplam gelir 1.500 − toplam maliyet 1.000 = 500: kuruşu kuruşuna.
    expect(position.realizedPnlMinor).toBe(500);
  });

  it("tüm pozisyonu kapatma ve sonra yeniden alım", () => {
    const closed = single([
      trade("buy", "THYAO", 10, 10_000, 1),
      trade("sell", "THYAO", 10, 12_000, 2),
    ]);
    expect(closed).toMatchObject({
      lots: 0,
      totalCostMinor: 0,
      averageCostMinor: 0,
      realizedPnlMinor: 20_000,
    });

    const reopened = single([
      trade("buy", "THYAO", 10, 10_000, 1),
      trade("sell", "THYAO", 10, 12_000, 2),
      trade("buy", "THYAO", 5, 15_000, 3),
    ]);
    expect(reopened).toMatchObject({
      lots: 5,
      totalCostMinor: 75_000,
      averageCostMinor: 15_000,
      realizedPnlMinor: 20_000,
    });
  });
});

describe("eldeki lottan fazla satış", () => {
  it("fazla satışı reddeder ve ayrıntı verir", () => {
    const sell = trade("sell", "THYAO", 11, 12_000, 2);
    const result = computePositions([
      trade("buy", "THYAO", 10, 10_000, 1),
      sell,
    ]);
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "oversell",
        tradeId: sell.id,
        symbol: "THYAO",
        date: sell.date,
        availableLots: 10,
        requestedLots: 11,
      },
    });
  });

  it("alımdan ÖNCEKİ tarihli satışı reddeder", () => {
    const result = computePositions([
      trade("buy", "THYAO", 10, 10_000, 5),
      trade("sell", "THYAO", 5, 12_000, 3),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "oversell")
      expect(result.error.availableLots).toBe(0);
  });

  it("sonraki bir satışın dayandığı alımın silinmesini yakalar", () => {
    const buyA = trade("buy", "THYAO", 10, 10_000, 1);
    const buyB = trade("buy", "THYAO", 10, 10_000, 2);
    const sell = trade("sell", "THYAO", 15, 12_000, 3);
    expect(computePositions([buyA, buyB, sell]).ok).toBe(true);

    const withoutB = computePositions([buyA, sell]);
    expect(withoutB.ok).toBe(false);
    if (!withoutB.ok && withoutB.error.kind === "oversell") {
      expect(withoutB.error).toMatchObject({
        availableLots: 10,
        requestedLots: 15,
      });
    }
  });

  it("semboller birbirinden bağımsızdır", () => {
    const result = computePositions([
      trade("buy", "THYAO", 100, 10_000, 1),
      trade("buy", "ASELS", 5, 5_000, 1),
      trade("sell", "ASELS", 6, 5_000, 2),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "oversell")
      expect(result.error.symbol).toBe("ASELS");
  });

  it("hata mesajı Türkçe ve anlaşılır", () => {
    const result = computePositions([
      trade("buy", "THYAO", 10, 10_000, 1),
      trade("sell", "THYAO", 11, 12_000, 2),
    ]);
    if (result.ok) throw new Error("Hata bekleniyordu");
    expect(describeEngineError(result.error)).toBe(
      "THYAO için 2 Ekim 2026 tarihli satışta elde 10 lot var; 11 lot satılamaz.",
    );
  });
});

describe("sıralama", () => {
  it("giriş sırasından bağımsızdır", () => {
    const trades = [
      trade("buy", "THYAO", 10, 10_000, 1),
      trade("buy", "THYAO", 30, 12_000, 2),
      trade("sell", "THYAO", 10, 13_000, 3),
    ];
    expect(positionsOf([...trades].reverse())).toEqual(positionsOf(trades));
  });

  it("aynı tarihte kayıt zamanı sırası uygulanır", () => {
    const buy = trade("buy", "THYAO", 10, 10_000, 1, {
      createdAt: new Date(2026, 9, 1, 9).toISOString(),
    });
    const sellAfter = trade("sell", "THYAO", 10, 11_000, 1, {
      createdAt: new Date(2026, 9, 1, 10).toISOString(),
    });
    const sellBefore = trade("sell", "THYAO", 10, 11_000, 1, {
      createdAt: new Date(2026, 9, 1, 8).toISOString(),
    });
    expect(computePositions([buy, sellAfter]).ok).toBe(true);
    expect(computePositions([buy, sellBefore]).ok).toBe(false);
  });

  it("kayıt zamanı olmayan yeni işlem aynı tarihli işlemlerin sonuna konur", () => {
    const buy = trade("buy", "THYAO", 10, 10_000, 1);
    const newSell = trade("sell", "THYAO", 10, 11_000, 1, {
      createdAt: undefined,
    });
    expect(computePositions([newSell, buy]).ok).toBe(true);
  });

  it("pozisyonlar sembole göre alfabetik döner", () => {
    const positions = positionsOf([
      trade("buy", "THYAO", 1, 100, 1),
      trade("buy", "ASELS", 1, 100, 1),
    ]);
    expect(positions.map((position) => position.symbol)).toEqual([
      "ASELS",
      "THYAO",
    ]);
  });
});

describe("doğrulama", () => {
  it.each<[Partial<TradeInput>, string]>([
    [{ lots: 0 }, "invalid_lots"],
    [{ lots: 1.5 }, "invalid_lots"],
    [{ lots: MAX_LOTS + 1 }, "invalid_lots"],
    [{ priceMinor: 0 }, "invalid_price"],
    [{ priceMinor: 12.5 }, "invalid_price"],
    [{ feeMinor: -1 }, "invalid_fee"],
    [{ symbol: "T" }, "invalid_symbol"],
    [{ symbol: "THY AO" }, "invalid_symbol"],
    [{ date: "dün" }, "invalid_date"],
    [{ side: "transfer" as TradeSide }, "invalid_side"],
  ])("%j → %s", (override, reason) => {
    const invalid = trade("buy", "THYAO", 10, 10_000, 1, override);
    expect(computePositions([invalid])).toEqual({
      ok: false,
      error: { kind: "invalid_trade", tradeId: invalid.id, reason },
    });
  });

  it("sembolü ASCII büyük harfe çevirir (Türkçe İ'ye değil)", () => {
    expect(normalizeSymbol(" thyao ")).toBe("THYAO");
    expect(normalizeSymbol("isctr")).toBe("ISCTR");
    expect(single([trade("buy", " isctr ", 1, 100, 1)]).symbol).toBe("ISCTR");
  });
});

describe("valuePosition", () => {
  // 30 lot, maliyet 345.000 (ortalama 115,00 TL)
  const position = single([
    trade("buy", "THYAO", 10, 10_000, 1),
    trade("buy", "THYAO", 30, 12_000, 2),
    trade("sell", "THYAO", 10, 13_000, 3),
  ]);

  it("kârdaki pozisyon", () => {
    expect(
      valuePosition(position, { priceMinor: 12_500, prevCloseMinor: 12_000 }),
    ).toMatchObject({
      priceMinor: 12_500,
      marketValueMinor: 375_000,
      unrealizedPnlMinor: 30_000,
      unrealizedPnlBasisPoints: 870, // 30.000 / 345.000 = %8,696 → %8,70
      dailyChangeMinor: 15_000, // (125 − 120) × 30
      dailyChangeBasisPoints: 417, // 5 / 120 = %4,167 → %4,17
    });
  });

  it("zarardaki pozisyon: oran sıfırdan uzağa yuvarlanır", () => {
    expect(
      valuePosition(position, { priceMinor: 11_000, prevCloseMinor: 11_500 }),
    ).toMatchObject({
      marketValueMinor: 330_000,
      unrealizedPnlMinor: -15_000,
      unrealizedPnlBasisPoints: -435, // −%4,348 → −%4,35
      dailyChangeMinor: -15_000,
      dailyChangeBasisPoints: -435, // −5 / 115 = −%4,348
    });
  });

  it("fiyat yoksa değer alanları null", () => {
    expect(valuePosition(position, undefined)).toMatchObject({
      priceMinor: null,
      marketValueMinor: null,
      unrealizedPnlMinor: null,
      dailyChangeMinor: null,
    });
  });

  it("önceki kapanış yoksa yalnızca günlük değişim null", () => {
    const valuation = valuePosition(position, {
      priceMinor: 12_500,
      prevCloseMinor: null,
    });
    expect(valuation.marketValueMinor).toBe(375_000);
    expect(valuation.dailyChangeMinor).toBeNull();
    expect(valuation.dailyChangeBasisPoints).toBeNull();
  });

  it("kapalı pozisyonun değeri ve gerçekleşmemiş kârı sıfırdır", () => {
    const closed = single([
      trade("buy", "GARAN", 10, 10_000, 1),
      trade("sell", "GARAN", 10, 12_000, 2),
    ]);
    expect(
      valuePosition(closed, { priceMinor: 15_000, prevCloseMinor: 14_000 }),
    ).toMatchObject({
      marketValueMinor: 0,
      unrealizedPnlMinor: 0,
      unrealizedPnlBasisPoints: null,
      realizedPnlMinor: 20_000,
    });
  });

  it("güvenli tam sayı sınırını aşan sonucu sessizce döndürmez, hata fırlatır", () => {
    const huge = single([trade("buy", "BIG", MAX_LOTS, 1, 1)]);
    expect(() =>
      valuePosition(huge, {
        priceMinor: MAX_AMOUNT_MINOR,
        prevCloseMinor: null,
      }),
    ).toThrow(RangeError);
    expect(() =>
      computePositions([trade("buy", "BIG", MAX_LOTS, MAX_AMOUNT_MINOR, 1)]),
    ).toThrow(RangeError);
  });

  it("geçersiz fiyatı reddeder", () => {
    expect(() =>
      valuePosition(position, { priceMinor: 0, prevCloseMinor: null }),
    ).toThrow(RangeError);
  });
});

describe("summarizePortfolio", () => {
  const thyao = single([
    trade("buy", "THYAO", 10, 10_000, 1),
    trade("buy", "THYAO", 30, 12_000, 2),
    trade("sell", "THYAO", 10, 13_000, 3),
  ]); // 30 lot, maliyet 345.000, gerçekleşmiş 15.000
  const asels = single([trade("buy", "ASELS", 10, 5_000, 1)]); // 10 lot, maliyet 50.000
  const garan = single([
    trade("buy", "GARAN", 10, 10_000, 1),
    trade("sell", "GARAN", 10, 12_000, 2),
  ]); // kapalı, +20.000

  it("fiyatı bilinmeyen pozisyonu toplamlara katmaz ve listeler", () => {
    const summary = summarizePortfolio([
      valuePosition(thyao, { priceMinor: 12_500, prevCloseMinor: 12_000 }),
      valuePosition(asels, undefined),
      valuePosition(garan, undefined),
    ]);
    expect(summary).toEqual({
      marketValueMinor: 375_000,
      costBasisMinor: 345_000,
      unrealizedPnlMinor: 30_000,
      unrealizedPnlBasisPoints: 870,
      realizedPnlMinor: 35_000,
      dailyChangeMinor: 15_000,
      openPositionCount: 2,
      missingPriceSymbols: ["ASELS"],
      allocation: [
        { symbol: "THYAO", marketValueMinor: 375_000, basisPoints: 10_000 },
      ],
    });
  });

  it("dağılım büyükten küçüğe ve toplamı tam %100", () => {
    const summary = summarizePortfolio([
      valuePosition(thyao, { priceMinor: 12_500, prevCloseMinor: null }), // 375.000
      valuePosition(asels, { priceMinor: 5_000, prevCloseMinor: null }), // 50.000
    ]);
    expect(summary.allocation.map((slice) => slice.symbol)).toEqual([
      "THYAO",
      "ASELS",
    ]);
    expect(
      summary.allocation.reduce((sum, slice) => sum + slice.basisPoints, 0),
    ).toBe(10_000);
    expect(summary.unrealizedPnlMinor).toBe(30_000);
  });

  it("boş portföy", () => {
    expect(summarizePortfolio([])).toEqual({
      marketValueMinor: 0,
      costBasisMinor: 0,
      unrealizedPnlMinor: 0,
      unrealizedPnlBasisPoints: null,
      realizedPnlMinor: 0,
      dailyChangeMinor: 0,
      openPositionCount: 0,
      missingPriceSymbols: [],
      allocation: [],
    });
  });
});

describe("formatSignedBasisPoints", () => {
  it.each<[number, string]>([
    [870, "+%8,7"],
    [-435, `${MINUS_SIGN}%4,4`],
    [0, "%0,0"],
    [25_000, "+%250,0"],
  ])("%d → %s", (basisPoints, expected) => {
    expect(formatSignedBasisPoints(basisPoints)).toBe(expected);
  });
});

describe("değişmez özellik: kapanan pozisyonda toplam kâr = toplam gelir − toplam maliyet", () => {
  it("rastgele işlem dizilerinde kuruş kaybı olmaz", () => {
    let seed = 11;
    const next = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed;
    };

    for (let run = 0; run < 200; run += 1) {
      const trades: TradeInput[] = [];
      let held = 0;
      let totalIn = 0; // alımlarda ödenen (komisyon dahil)
      let totalOut = 0; // satışlardan alınan (komisyon düşülmüş)

      for (let day = 1; day <= 20; day += 1) {
        const price = 100 + (next() % 10_000);
        const fee = next() % 50;
        if (held === 0 || next() % 2 === 0) {
          const lots = 1 + (next() % 50);
          trades.push(trade("buy", "RND", lots, price, day, { feeMinor: fee }));
          held += lots;
          totalIn += lots * price + fee;
        } else {
          const lots = 1 + (next() % held);
          trades.push(
            trade("sell", "RND", lots, price, day, { feeMinor: fee }),
          );
          held -= lots;
          totalOut += lots * price - fee;
        }
      }
      // Pozisyonu kapat.
      if (held > 0) {
        trades.push(trade("sell", "RND", held, 5_000, 25));
        totalOut += held * 5_000;
      }

      const position = single(trades);
      expect(position.lots).toBe(0);
      expect(position.totalCostMinor).toBe(0);
      expect(position.realizedPnlMinor).toBe(totalOut - totalIn);
    }
  });
});
